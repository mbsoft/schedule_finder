variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and GCS"
  type        = string
  default     = "europe-west2"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "mtll-slot-engine"
}

variable "nextbillion_api_key" {
  description = "NextBillion.ai API key for geocoding"
  type        = string
  default     = ""
  sensitive   = true
}
