# The AWS region where Vanguard will be deployed
variable "aws_region" {
  description = "The AWS region to deploy the Vanguard banking suite"
  type        = string
  default     = "us-east-1"
}

# Project Naming for Resource Tagging
variable "project_name" {
  description = "Project name for resource tagging and identification"
  type        = string
  default     = "vanguard-fintech"
}

# DocumentDB (MongoDB Compatible) Cluster Settings
variable "docdb_cluster_name" {
  description = "The name of the DocumentDB cluster"
  type        = string
  default     = "vanguard-cluster"
}

variable "docdb_instance_class" {
  description = "The instance type for the DocumentDB cluster (t3.medium is standard for dev)"
  type        = string
  default     = "db.t3.medium"
}

variable "docdb_admin_username" {
  description = "The master username for the database"
  type        = string
  default     = "vanguard_admin"
}

variable "docdb_admin_password" {
  description = "The master password for the database (Use a Secret Manager in Production)"
  type        = string
  sensitive   = true
}

# Lambda Configuration
variable "lambda_function_name" {
  type    = string
  default = "vanguard_api_handler"
}