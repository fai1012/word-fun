#!/bin/bash

# Configuration
SERVICE_NAME="examples-gen-batch" # Slightly shorter name
REGION="asia-east1" 
ENTRY_POINT="processQueueBatch"
PROJECT_ID=$(gcloud config get-value project)
# SERVICE_ACCOUNT="your-sa-name@$PROJECT_ID.iam.gserviceaccount.com"

echo "Deploying $SERVICE_NAME to project $PROJECT_ID in region $REGION..."

cd "$(dirname "$0")"

echo "Building..."
npm run build

if [ -z "$GEMINI_API_KEY" ]; then
  echo "ERROR: GEMINI_API_KEY environment variable is not set."
  echo "Please set it before running this script: export GEMINI_API_KEY=your_actual_key"
  exit 1
fi

# 1. Deploy Generator Function (HTTP)
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
  --allow-unauthenticated=false

# Get the URL of the deployed generator
GENERATOR_URL=$(gcloud functions describe $SERVICE_GEN --region=$REGION --format='value(url)' --gen2)

# 2. Deploy Trigger Function (Firestore onCreate)
SERVICE_TRIGGER="examples-gen-trigger"
ENTRY_TRIGGER="onQueueItemCreated"

echo "Deploying Trigger $SERVICE_TRIGGER..."
gcloud functions deploy $SERVICE_TRIGGER \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --source=. \
  --entry-point=$ENTRY_TRIGGER \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="document=example_generation_queue/{docId}" \
  --trigger-location=$REGION \
  --set-env-vars GENERATOR_URL=$GENERATOR_URL \
  ${SERVICE_ACCOUNT:+--service-account=$SERVICE_ACCOUNT} \
  --allow-unauthenticated=false

echo "Deployment complete!"
echo "Generator URL: $GENERATOR_URL"
