locals {
  backend_services = {
    "family-service"             = 8081
    "calendar-service"           = 8082
    "tasks-service"              = 8083
    "notification-service"       = 8084
    "finance-service"            = 8085
    "document-service"           = 8086
    "meal-service"               = 8087
    "travel-service"             = 8088
    "ai-service"                 = 8089
    "knowledge-graph-service"    = 8090
    "analytics-service"          = 8091
  }
  image_prefix = "${var.region}-docker.pkg.dev/${var.project_id}/niki-${var.environment}"
  sql_connection = google_sql_database_instance.postgres.connection_name
}

# Internal backend services (family, calendar). They read DATABASE_URL from
# Secret Manager and connect to Cloud SQL over the built-in socket.
resource "google_cloud_run_v2_service" "backend" {
  for_each = local.backend_services

  name     = "niki-${each.key}-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  deletion_protection = var.environment == "prod"

  template {
    service_account = google_service_account.run.email

    containers {
      # Placeholder image; CI/CD replaces with real service images after first deploy
      image = "gcr.io/cloudrun/hello:latest"
      ports {
        container_port = each.value
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "CLOUD_SQL_CONNECTION_NAME"
        value = local.sql_connection
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        cpu_idle = var.environment != "prod"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.sql_connection]
      }
    }

    scaling {
      min_instance_count = var.environment == "prod" ? 1 : 0
      max_instance_count = 10
    }
  }

  depends_on = [google_artifact_registry_repository.containers]
}

# Public API gateway. Verifies Firebase ID tokens via ADC + project id and
# proxies to the internal backends using their Cloud Run URLs.
resource "google_cloud_run_v2_service" "gateway" {
  name     = "niki-api-gateway-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  deletion_protection = var.environment == "prod"

  template {
    service_account = google_service_account.run.email

    containers {
      image = "gcr.io/cloudrun/hello:latest"
      ports {
        container_port = 8080
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }
      env {
        name  = "FAMILY_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["family-service"].uri
      }
      env {
        name  = "CALENDAR_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["calendar-service"].uri
      }
      env {
        name  = "TASKS_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["tasks-service"].uri
      }
      env {
        name  = "NOTIFICATION_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["notification-service"].uri
      }
      env {
        name  = "FINANCE_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["finance-service"].uri
      }
      env {
        name  = "DOCUMENT_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["document-service"].uri
      }
      env {
        name  = "MEAL_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["meal-service"].uri
      }
      env {
        name  = "TRAVEL_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["travel-service"].uri
      }
      env {
        name  = "AI_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["ai-service"].uri
      }
      env {
        name  = "KG_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["knowledge-graph-service"].uri
      }
      env {
        name  = "ANALYTICS_SERVICE_URL"
        value = google_cloud_run_v2_service.backend["analytics-service"].uri
      }
      env {
        name  = "RATE_LIMIT_RPM"
        value = "120"
      }

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        cpu_idle = var.environment != "prod"
      }
    }

    scaling {
      min_instance_count = var.environment == "prod" ? 1 : 0
      max_instance_count = 10
    }
  }

  depends_on = [google_artifact_registry_repository.containers]
}

# The gateway is publicly reachable; auth is enforced in the app via Firebase.
# The allUsers IAM binding may need to be set manually if an org policy
# restricts public access:
#   gcloud run services add-iam-policy-binding niki-api-gateway-dev \
#     --region=us-central1 --member=allUsers --role=roles/run.invoker
resource "google_cloud_run_v2_service_iam_member" "gateway_public" {
  count    = 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "gateway_url" {
  value = google_cloud_run_v2_service.gateway.uri
}
