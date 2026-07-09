provider "aws" {
  region = var.aws_region
}

# 1. S3 Bucket for Frontend Hosting (React/HTML/CSS)
resource "aws_s3_bucket" "vanguard_frontend" {
  bucket = "${var.project_name}-frontend-bucket"
}

# 2. AWS Lambda Function for the Backend (Python)
resource "aws_lambda_function" "vanguard_api" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "app.main.handler" # Points to the Mangum handler we just made
  runtime       = "python3.11"
  
  # Connects to your DocumentDB/MongoDB
  environment {
    variables = {
      MONGODB_URL = "mongodb://${var.docdb_admin_username}:${var.docdb_admin_password}@${var.docdb_cluster_name}:27017"
    }
  }
}

# 3. API Gateway to route HTTP traffic to Lambda
resource "aws_apigatewayv2_api" "vanguard_gw" {
  name          = "vanguard-api-gateway"
  protocol_type = "HTTP"
  target        = aws_lambda_function.vanguard_api.arn
}