variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Primary GCP region"
}

variable "environment" {
  type        = string
  description = "Deployment environment: dev | test | stage | prod"
}

variable "firebase_project_id" {
  type        = string
  description = "Firebase project id used by the gateway to verify ID tokens"
}

variable "db_tier" {
  type        = string
  default     = "db-g1-small"
  description = "Cloud SQL machine tier"
}
