resource "google_sql_database_instance" "postgres" {
  name             = "niki-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region
  depends_on       = [google_project_service.enabled]

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "prod"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "niki" {
  name     = "niki"
  instance = google_sql_database_instance.postgres.name
}

resource "google_redis_instance" "cache" {
  name           = "niki-${var.environment}"
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = 1
  region         = var.region
  depends_on     = [google_project_service.enabled]
}
