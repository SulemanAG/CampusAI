# Google Cloud Run Deployment Guide
**Region: Mumbai (asia-south1)**

## 🚀 Quick Deployment

Your application is ready to deploy to Google Cloud Run in Mumbai! Follow these steps:

---

## Prerequisites

### 1. Install Google Cloud SDK
```bash
# macOS
brew install --cask google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud auth application-default login
```

### 3. Create or Select a GCP Project
```bash
# Create new project
gcloud projects create YOUR_PROJECT_ID --name="SmartUniversity"

# Or list existing projects
gcloud projects list

# Set the project
gcloud config set project YOUR_PROJECT_ID
```

---

## 🔑 Firebase Credentials for Cloud Run

Since Cloud Run doesn't have access to local files, you need to provide Firebase credentials via **environment variables**.

### Get Firebase Credentials

1. Open your `firebase-service-account.json` file
2. Extract these values:
   - `project_id`
   - `private_key`
   - `client_email`

### Set Credentials as Secret

**Option A: Use Google Secret Manager (Recommended)**

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secret with your Firebase credentials
gcloud secrets create firebase-credentials \
    --data-file=firebase-service-account.json \
    --replication-policy="automatic"

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding firebase-credentials \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

**Option B: Use Environment Variables (Alternative)**

Set the Firebase credentials as environment variables during deployment (see deployment command below).

---

## 📦 Deploy to Cloud Run

### Method 1: Using the Deployment Script (Easiest)

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"

# Run the deployment script
./deploy-cloudrun.sh
```

The script will:
- ✅ Enable required APIs
- ✅ Build the Docker container
- ✅ Deploy to Cloud Run in Mumbai
- ✅ Output your service URL

### Method 2: Manual Deployment

```bash
# Set variables
PROJECT_ID="your-project-id"
REGION="asia-south1"  # Mumbai
SERVICE_NAME="smartuniversity"

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy with Firebase credentials from Secret Manager
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 300 \
    --update-secrets=FIREBASE_CREDENTIALS=/firebase-credentials:latest \
    --set-env-vars="NODE_ENV=production"

# OR Deploy with Firebase credentials as environment variables
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --min-instances 0 \
    --timeout 300 \
    --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=your-project-id,FIREBASE_CLIENT_EMAIL=your-client-email" \
    --set-secrets="FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
```

---

## 🔧 Configure Firebase Credentials in Cloud Run

### Update firebase.js to Read from Environment

The `firebase.js` file already supports environment variables! It will automatically use them if the service account file is not found.

Make sure these environment variables are set in Cloud Run:

```bash
# Using gcloud command
gcloud run services update smartuniversity \
    --region asia-south1 \
    --set-env-vars="FIREBASE_PROJECT_ID=your-project-id,FIREBASE_PRIVATE_KEY=your-private-key,FIREBASE_CLIENT_EMAIL=your-client-email"
```

**OR** set them in the Cloud Run console:
1. Go to Cloud Run → Select your service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Add:
   - `FIREBASE_PROJECT_ID`: your-project-id
   - `FIREBASE_CLIENT_EMAIL`: your-firebase-email@project.iam.gserviceaccount.com
   - `FIREBASE_PRIVATE_KEY`: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

---

## 🔐 Set Other Environment Variables

Update other environment variables from your `.env` file:

```bash
gcloud run services update smartuniversity \
    --region asia-south1 \
    --set-env-vars="\
IMAGEKIT_PUBLIC_KEY=public_N4lfDBDhNug2TIezJOtr1MN+4kQ=,\
IMAGEKIT_PRIVATE_KEY=private_QWFtR+BfUI3xDT6VW5Bty/mu7ig=,\
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/wh1qqsphz/,\
WEB_SCRAPER_BASE_URL=https://web-scrapper-production-7fba.up.railway.app/crawl,\
GFAPI_KEY=AIzaSyB1fSKYe32_I4ztlFmjgese0LWDWV4KNsY,\
GFAPI_BASE_URL=https://gfapi-production.up.railway.app"
```

---

## 🧪 Test Your Deployment

### 1. Get Service URL
```bash
gcloud run services describe smartuniversity \
    --region asia-south1 \
    --format 'value(status.url)'
```

### 2. Test Health Check
```bash
curl https://your-service-url.run.app/health
```

### 3. Test University Registration
```bash
curl "https://your-service-url.run.app/university/register/initiate?email=test@university.com&password=Test123456"
```

---

## 📊 Monitor Your Service

### View Logs
```bash
gcloud run logs tail smartuniversity --region asia-south1
```

### View Metrics
```bash
# Open in browser
gcloud run services browse smartuniversity --region asia-south1
```

### Cloud Console
Visit: https://console.cloud.google.com/run?project=YOUR_PROJECT_ID

---

## 🔄 Update Deployment

When you make code changes:

```bash
# Rebuild and redeploy
./deploy-cloudrun.sh

# OR manually
gcloud builds submit --tag gcr.io/$PROJECT_ID/smartuniversity
gcloud run deploy smartuniversity \
    --image gcr.io/$PROJECT_ID/smartuniversity \
    --region asia-south1
```

---

## 💰 Cost Optimization

Cloud Run pricing (Mumbai region):
- **Free tier**: 180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests/month
- **After free tier**: ~$0.00002400/vCPU-second, ~$0.00000250/GiB-second

### Tips:
1. Use `--min-instances 0` (already set) - scales to zero when not in use
2. Set `--max-instances` based on expected load
3. Use appropriate memory allocation (512Mi is good for start)
4. Monitor in Cloud Console → Billing

---

## 🛡️ Security Best Practices

### 1. Enable IAM Authentication (Optional)
```bash
# Deploy with authentication required
gcloud run deploy smartuniversity \
    --region asia-south1 \
    --no-allow-unauthenticated
```

### 2. Set Up Custom Domain
```bash
gcloud run domain-mappings create \
    --service smartuniversity \
    --domain your-domain.com \
    --region asia-south1
```

### 3. Configure CORS (Already in app.js)
Your app already has CORS enabled via the `cors` middleware.

---

## 🔍 Troubleshooting

### Error: "Firebase initialization error"
- **Check**: Environment variables are set correctly
- **Solution**: Run `gcloud run services update` with correct Firebase credentials

### Error: "Port 8080 not exposed"
- **Check**: Dockerfile exposes port 8080 ✅ (already done)
- **Check**: `--port 8080` flag in deployment ✅ (already set)

### Error: "Service timeout"
- **Solution**: Increase timeout: `--timeout 300` ✅ (already set)

### Error: "Out of memory"
- **Solution**: Increase memory: `--memory 1Gi`

### View Detailed Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=smartuniversity" \
    --limit 50 \
    --format json
```

---

## 📈 Scaling Configuration

### Auto-scaling (Current Setup)
- **Min instances**: 0 (scales to zero)
- **Max instances**: 10
- **Concurrency**: 80 requests per instance (default)

### Increase Max Instances
```bash
gcloud run services update smartuniversity \
    --region asia-south1 \
    --max-instances 50
```

### Set Min Instances (Keep Warm)
```bash
gcloud run services update smartuniversity \
    --region asia-south1 \
    --min-instances 1  # Keeps 1 instance always running
```

---

## 🎯 Production Checklist

- [ ] Firebase credentials set via environment variables or Secret Manager
- [ ] All environment variables from `.env` configured
- [ ] Health check endpoint working (`/health`)
- [ ] Logs monitored in Cloud Console
- [ ] Budget alerts configured
- [ ] Custom domain configured (optional)
- [ ] CI/CD pipeline set up (optional)
- [ ] Firestore indexes created for performance

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Firebase Admin SDK on Cloud Run](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/tips/general)

---

## 🆘 Need Help?

**Common Issues:**
1. Firebase not connecting → Check environment variables
2. Timeout errors → Increase timeout or memory
3. Cost concerns → Check scaling configuration

**Get Service Info:**
```bash
gcloud run services describe smartuniversity --region asia-south1
```

---

**Your service is now running in Mumbai! 🇮🇳**

Service will be available at: `https://smartuniversity-XXXXX-el.a.run.app`
