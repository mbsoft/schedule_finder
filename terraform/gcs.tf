resource "google_storage_bucket" "data" {
  name     = "${var.project_id}-slot-engine-data"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }

  force_destroy = false
}
