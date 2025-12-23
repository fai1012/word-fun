#!/bin/bash

# Configuration
BUCKET_NAME="word-fun"
BACKEND_BUCKET_NAME="word-fun-backend-bucket"
URL_MAP_NAME="word-fun-cdn-map"
IP_NAME="word-fun-cdn-ip"
PROXY_NAME="word-fun-cdn-proxy"
FORWARDING_RULE_NAME="word-fun-cdn-forwarding-rule"
REGION="asia-southeast1" # Or your preferred region

# Ensure we have a project ID
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID environment variable is not set."
    echo "Please export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

PROJECT_ID=$GCP_PROJECT_ID

echo "Setting up Cloud CDN for project: $PROJECT_ID"

# 1. Enable required APIs
echo "Enabling Service Usage API..."
gcloud services enable serviceusage.googleapis.com --project=$PROJECT_ID

echo "Enabling Compute Engine and Service Usage APIs..."
gcloud services enable compute.googleapis.com serviceusage.googleapis.com --project=$PROJECT_ID

# 2. Reserve Global Static IP
echo "Reserving Global Static IP..."
if gcloud compute addresses describe $IP_NAME --global --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "IP $IP_NAME already exists, skipping creation."
else
    gcloud compute addresses create $IP_NAME --global --project=$PROJECT_ID
fi

IP_ADDRESS=$(gcloud compute addresses describe $IP_NAME --global --project=$PROJECT_ID --format='get(address)')
echo "Reserved CDN IP: $IP_ADDRESS"

# 3. Create Backend Bucket
echo "Creating Backend Bucket with CDN enabled..."
if gcloud compute backend-buckets describe $BACKEND_BUCKET_NAME --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "Backend Bucket $BACKEND_BUCKET_NAME already exists."
    # Force toggle CDN to ensure Service Account is created
    echo "Toggling CDN off/on to force Service Account creation..."
    gcloud compute backend-buckets update $BACKEND_BUCKET_NAME --no-enable-cdn --project=$PROJECT_ID
    sleep 5
    gcloud compute backend-buckets update $BACKEND_BUCKET_NAME --enable-cdn --project=$PROJECT_ID
else
    gcloud compute backend-buckets create $BACKEND_BUCKET_NAME \
        --gcs-bucket-name=$BUCKET_NAME \
        --enable-cdn \
        --no-negative-caching \
        --project=$PROJECT_ID
    echo "Backend bucket created."
fi

# 4. Create URL Map
echo "Creating URL Map..."
if gcloud compute url-maps describe $URL_MAP_NAME --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "URL Map $URL_MAP_NAME already exists."
else
    gcloud compute url-maps create $URL_MAP_NAME --default-backend-bucket=$BACKEND_BUCKET_NAME --project=$PROJECT_ID
fi

# Configuration
DOMAIN_NAME="cdn.word-fun.popular-c.io" # Replace with your domain if different
CERT_NAME="word-fun-cert"
HTTPS_PROXY_NAME="word-fun-https-proxy"
HTTPS_FORWARDING_RULE_NAME="word-fun-https-forwarding-rule"

# ... (Previous steps 1-4 remain the same) ...

# 5. Create Managed SSL Certificate
echo "Creating Managed SSL Certificate for $DOMAIN_NAME..."
if gcloud compute ssl-certificates describe $CERT_NAME --global --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "Certificate $CERT_NAME already exists."
else
    gcloud compute ssl-certificates create $CERT_NAME \
        --description="Certificate for Word Fun CDN" \
        --domains=$DOMAIN_NAME \
        --global \
        --project=$PROJECT_ID
fi

# 6. Create Target HTTPS Proxy
echo "Creating Target HTTPS Proxy..."
if gcloud compute target-https-proxies describe $HTTPS_PROXY_NAME --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "Proxy $HTTPS_PROXY_NAME already exists."
else
    gcloud compute target-https-proxies create $HTTPS_PROXY_NAME \
        --url-map=$URL_MAP_NAME \
        --ssl-certificates=$CERT_NAME \
        --project=$PROJECT_ID
fi

# 7. Create Global Forwarding Rule (HTTPS)
echo "Creating HTTPS Forwarding Rule..."
if gcloud compute forwarding-rules describe $HTTPS_FORWARDING_RULE_NAME --global --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "Forwarding Rule $HTTPS_FORWARDING_RULE_NAME already exists."
else
    gcloud compute forwarding-rules create $HTTPS_FORWARDING_RULE_NAME \
        --global \
        --target-https-proxy=$HTTPS_PROXY_NAME \
        --ports=443 \
        --address=$IP_NAME \
        --project=$PROJECT_ID
fi

echo "Cleaning up HTTP resources (if any)..."
gcloud compute forwarding-rules delete word-fun-cdn-forwarding-rule --global --quiet --project=$PROJECT_ID 2>/dev/null || true
gcloud compute target-http-proxies delete word-fun-cdn-proxy --quiet --project=$PROJECT_ID 2>/dev/null || true

# 7. Grant Permissions to Cloud CDN Service Account
echo "Configuring IAM for Cloud CDN..."

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='get(projectNumber)')
CDN_SA="service-$PROJECT_NUMBER@cloud-cdn-fill.iam.gserviceaccount.com"

echo "Target SA: $CDN_SA"

# Strategy: Add a dummy Signed URL key to force Service Account creation
echo "Triggering Service Account creation by adding a dummy Signed URL Key..."
dd if=/dev/urandom count=16 bs=1 > dummy_key.key 2>/dev/null
if gcloud compute backend-buckets add-signed-url-key $BACKEND_BUCKET_NAME --key-name=temp-setup-key --key-file=dummy_key.key --project=$PROJECT_ID > /dev/null 2>&1; then
    echo "Temporary key added."
    # Wait a moment for propagation
    sleep 5
    # Remove it immediately
    gcloud compute backend-buckets delete-signed-url-key $BACKEND_BUCKET_NAME --key-name=temp-setup-key --project=$PROJECT_ID --quiet > /dev/null 2>&1
    echo "Temporary key removed."
    rm dummy_key.key
else
    echo "Warning: Failed to add signed URL key (maybe it already exists or another error). Proceeding..."
    rm dummy_key.key
fi

echo "Waiting for Cloud CDN Service Account to be provisioned..."

# Retry loop for IAM binding
MAX_RETRIES=10
COUNT=0
SUCCESS=0

while [ $COUNT -lt $MAX_RETRIES ]; do
    echo "Attempting to grant permission (Try $((COUNT+1))/$MAX_RETRIES)..."
    
    if gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
        --member="serviceAccount:$CDN_SA" \
        --role="roles/storage.objectViewer" > /dev/null 2>&1; then
        echo "Successfully granted permission."
        SUCCESS=1
        break
    else
        echo "Service account not ready yet. Waiting 10 seconds..."
        sleep 10
        COUNT=$((COUNT+1))
    fi
done

if [ $SUCCESS -eq 0 ]; then
    echo "WARNING: Failed to grant permissions automatically."
    echo "This is likely because the Cloud CDN Service Account ($CDN_SA) has not been provisioned yet."
    echo "It usually appears automatically 5-10 minutes after creating the first CDN-enabled Backend Bucket."
    echo ""
    echo "Please run this command manually in a few minutes:"
    echo "gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME --member=\"serviceAccount:$CDN_SA\" --role=\"roles/storage.objectViewer\""
fi

# 8. Configure Public Access for CDN
# Note: Cloud CDN with GCS backend requires public access (allUsers) because
# Cloud CDN accesses GCS unauthenticated. The CDN SA IAM binding is only used
# for Signed URLs, not for direct public access through CDN.

echo "Disabling public access prevention..."
gcloud storage buckets update gs://$BUCKET_NAME --no-public-access-prevention --project=$PROJECT_ID

echo "Granting public read access (allUsers) to bucket for CDN..."
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member="allUsers" \
    --role="roles/storage.objectViewer" \
    --project=$PROJECT_ID || echo "allUsers binding already exists."

echo "----------------------------------------------------------------"
# 8. Configure Signed URL Key
# (Reverted: Signed URLs disabled in favor of IAM)
# echo "Configuring Signed URL Key for Cloud CDN..."
# ... (Code removed)

echo "Setup Complete!"
echo "CDN is now configured to serve content from gs://$BUCKET_NAME"
echo "Access requires using the Load Balancer IP."
echo ""
echo "Public IP: $IP_ADDRESS"
echo "CDN URL Base: http://$IP_ADDRESS"
echo ""
echo "IMPORTANT: It may take 10-20 minutes for the Load Balancer to become active."
echo "Please update your backend .env file with:"
echo "CDN_HOST=http://$IP_ADDRESS"
echo "----------------------------------------------------------------"
