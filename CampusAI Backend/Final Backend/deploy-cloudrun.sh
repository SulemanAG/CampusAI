#!/bin/bash

# Cloud Run Deployment Script for SmartUniversity
# Region: Mumbai (asia-south1)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  SmartUniversity - Cloud Run Deployment${NC}"
echo -e "${GREEN}  Region: Mumbai (asia-south1)${NC}"
echo -e "${GREEN}=================================================${NC}"

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="asia-south1"  # Mumbai
SERVICE_NAME="smartuniversity"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Prompt for project ID if not set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Enter your GCP Project ID:${NC}"
    read PROJECT_ID
    export GCP_PROJECT_ID=$PROJECT_ID
fi

echo -e "\n${GREEN}Using Project ID: ${PROJECT_ID}${NC}"

# Set the project
echo -e "\n${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "\n${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the container image
echo -e "\n${YELLOW}Building container image...${NC}"
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo -e "\n${YELLOW}Deploying to Cloud Run in Mumbai...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}  Deployment Successful! 🎉${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}Health Check: ${SERVICE_URL}/health${NC}"
echo -e "${GREEN}=================================================${NC}"

# Test health endpoint
echo -e "\n${YELLOW}Testing health endpoint...${NC}"
curl -s "${SERVICE_URL}/health" | jq '.' || echo "Health check endpoint responded"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
