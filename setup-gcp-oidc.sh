#!/bin/bash

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REPO="fai1012/word-fun"  # GitHub repository "username/repo"
APP_NAME="word-fun"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"
SA_NAME="github-actions-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Using Project ID: $PROJECT_ID"
echo "Setting up Workload Identity for Repo: $REPO"

# 1. Enable APIs
echo "Enabling necessary APIs..."
gcloud services enable iam.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iamcredentials.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com

# 2. Create Service Account
echo "Creating Service Account..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GitHub Actions Service Account" \
        --project="$PROJECT_ID"
else
    echo "Service Account $SA_NAME already exists."
fi

# 3. Grant Permissions to Service Account
echo "Granting permissions..."
# Cloud Run Admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"
# Service Account User (to act as itself/others for valid deployments)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"
# Service Account Token Creator (needed for impersonation token generation)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator"
# Secret Manager Accessor
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

# Artifact Registry Admin (for storing built containers)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.admin"
# Cloud Build Editor (for building containers)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudbuild.builds.editor"

# Storage Admin (for uploading source code to Cloud Storage)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"

# Service Usage Consumer (to usage Cloud Build and other APIs)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/serviceusage.serviceUsageConsumer"

# 4. Create Workload Identity Pool
echo "Creating Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe "$POOL_NAME" --location="global" --project="$PROJECT_ID" &>/dev/null; then
    gcloud iam workload-identity-pools create "$POOL_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --display-name="GitHub Actions Pool"
else
    echo "Pool $POOL_NAME already exists."
fi

# 5. Create or Update Workload Identity Provider
echo "Configuring Workload Identity Provider..."
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
    --workload-identity-pool="$POOL_NAME" --location="global" --project="$PROJECT_ID" &>/dev/null; then
    echo "Creating new provider..."
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_NAME" \
        --display-name="GitHub Actions Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='$REPO'" \
        --issuer-uri="https://token.actions.githubusercontent.com"
else
    echo "Provider $PROVIDER_NAME already exists. Updating attribute condition to allow $REPO..."
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_NAME" \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$POOL_NAME" \
        --attribute-condition="assertion.repository=='$REPO'"
fi

# 6. Bind Repo to Service Account
echo "Binding Service Account to Repository..."
WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "$POOL_NAME" \
  --project="$PROJECT_ID" --location="global" --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}"

# 7. Output Results
PROVIDER_ID=$(gcloud iam workload-identity-pools providers describe "$PROVIDER_NAME" \
  --workload-identity-pool="$POOL_NAME" --location="global" --project="$PROJECT_ID" \
  --format="value(name)")

echo ""
echo "===================================================="
echo "SETUP COMPLETE!"
echo "===================================================="
echo "Configure the following Secrets in your GitHub Repository:"
echo ""
echo "GCP_PROJECT_ID: $PROJECT_ID"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER: $PROVIDER_ID"
echo "GCP_SERVICE_ACCOUNT: $SA_EMAIL"
echo "GCP_ENV_SECRET_NAME: <Your Secret Name for env.yaml>"
echo "===================================================="
