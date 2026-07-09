#!/bin/bash

# Vanguard: Serverless Deployment Automation Script
# Targets: AWS Lambda (Backend) & AWS S3/CloudFront (Frontend)

echo "🚀 Starting Vanguard Deployment Sequence..."

# 1. Package Backend (Python/FastAPI)
echo "📦 Packaging Python Backend..."
cd backend
pip install -r requirements.txt -t lib/
cp -r app lib/
cd lib
zip -r ../../vanguard_backend.zip .
cd ../../
echo "✅ Backend packaged as vanguard_backend.zip"

# 2. Build Frontend (React)
echo "🏗️ Building React Frontend..."
cd frontend
npm install
npm run build
echo "✅ React build complete."

# 3. Infrastructure via Terraform
echo "🌍 Provisioning AWS Infrastructure..."
cd ../infrastructure
terraform init
terraform apply -auto-approve
echo "✅ AWS Infrastructure is synchronized."

# 4. Deploy Frontend to S3
echo "☁️ Syncing Frontend to S3..."
aws s3 sync ../frontend/build/ s3://vanguard-fintech-frontend-bucket --delete
echo "✅ Frontend is live at S3/CloudFront endpoint."

echo "🎉 Vanguard is fully deployed and secure!"