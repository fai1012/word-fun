#!/bin/bash
set -e

# Configuration
REGION="asia-east1" 
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# 1. Check for Gemini API Key
if [ -z "$GEMINI_API_KEY" ]; then
  echo "WARNING: GEMINI_API_KEY is not set in your shell."
  echo "The Generator function will be deployed but will fail at runtime until the key is set."
fi

# Enable necessary APIs
echo "Enabling APIs..."
gcloud services enable cloudscheduler.googleapis.com cloudfunctions.googleapis.com

echo "Building..."
npm run build

# 2. Deploy Generator Function (HTTP)
SERVICE_GEN="examples-gen-batch"
ENTRY_GEN="processQueueBatch"

echo "Deploying Generator $SERVICE_GEN..."
gcloud functions deploy $SERVICE_GEN \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=$ENTRY_GEN \
  --trigger-http \
  --max-instances=1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,FIRESTORE_DB_NAME=word-fun \
  ${SERVICE_ACCOUNT:+--service-account=$SERVICE_ACCOUNT} \
  --no-allow-unauthenticated

# Get Generator URL
GENERATOR_URL=$(gcloud functions describe $SERVICE_GEN --region=$REGION --format='value(serviceConfig.uri)' --gen2)

# 3. Setup Scheduler
echo "Setting up Cloud Scheduler..."

# Grant Invoker permission to the default App Engine service account (used by Scheduler by default if none specified)
# Or better, use specific service account if provided
SCHEDULER_SA="${SERVICE_ACCOUNT:-$PROJECT_ID@appspot.gserviceaccount.com}"

# Grant Invoker permission to Scheduler SA
echo "Granting invoker permission to $SCHEDULER_SA for $SERVICE_GEN..."
gcloud functions add-invoker-policy-binding $SERVICE_GEN \
  --region=$REGION \
  --member="serviceAccount:$SCHEDULER_SA" \
  --quiet > /dev/null

# Grant Invoker permission to Backend SA
BACKEND_SA="system-word-fun-service@gen-lang-client-0834078301.iam.gserviceaccount.com"
echo "Granting invoker permission to $BACKEND_SA for $SERVICE_GEN..."
gcloud functions add-invoker-policy-binding $SERVICE_GEN \
  --region=$REGION \
  --member="serviceAccount:$BACKEND_SA" \
  --quiet > /dev/null

JOB_NAME="examples-gen-cron"
SCHEDULE="*/3 * * * *" # Every 3 minutes

# Delete existing job if any to ensure clean update
gcloud scheduler jobs delete $JOB_NAME --location=$REGION --quiet || true

echo "Creating Scheduler Job: $JOB_NAME ($SCHEDULE)..."
gcloud scheduler jobs create http $JOB_NAME \
  --location=$REGION \
  --schedule="$SCHEDULE" \
  --uri="$GENERATOR_URL" \
  --oidc-service-account-email="$SCHEDULER_SA" \
  --http-method=GET

echo "------------------------------------------------"
echo "Deployment complete!"
echo "Generator URL: $GENERATOR_URL"
echo "Scheduler Job: $JOB_NAME"
echo "------------------------------------------------"
echo "To trigger manually now:"
echo "gcloud scheduler jobs execute $JOB_NAME --location=$REGION"
