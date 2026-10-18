#!/bin/bash
# Quick Deploy to Cloud Run - Mumbai Region
# Run this after initial setup

set -e

PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="asia-south1"
SERVICE="smartuniversity"

echo "🚀 Deploying to Cloud Run (Mumbai)..."
echo "Project: $PROJECT_ID"

# Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE --project $PROJECT_ID
gcloud run deploy $SERVICE \
  --image gcr.io/$PROJECT_ID/$SERVICE \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID

# Get URL
URL=$(gcloud run services describe $SERVICE --region $REGION --project $PROJECT_ID --format 'value(status.url)')
echo ""
echo "✅ Deployed successfully!"
echo "🌐 Service URL: $URL"
echo "💚 Health: $URL/health"
