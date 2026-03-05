resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.service_name
  format        = "DOCKER"
}

locals {
  image_url = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/${var.service_name}:${var.image_tag}"
}

resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = local.image_url

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.data.name
      }

      env {
        name  = "NEXTBILLION_API_KEY"
        value = var.nextbillion_api_key
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/api"
          port = 3000
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api"
          port = 3000
        }
        period_seconds = 30
      }
    }
  }

  depends_on = [
    google_artifact_registry_repository.app,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.app.project
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
