# Runtime service account used by all Cloud Run services. The gateway verifies
# Firebase ID tokens using Application Default Credentials (this SA) plus the
# project id, so no service account JSON key is needed at runtime.
resource "google_service_account" "run" {
  account_id   = "niki-run-${var.environment}"
  display_name = "Niki Cloud Run runtime (${var.environment})"
}

# Allow the runtime SA to read secrets (e.g. DATABASE_URL).
resource "google_secret_manager_secret_iam_member" "db_url_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}

# Allow the runtime SA to connect to Cloud SQL.
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run.email}"
}

# Allow the gateway to invoke the internal backend services.
resource "google_cloud_run_v2_service_iam_member" "gateway_invokes_backends" {
  for_each = google_cloud_run_v2_service.backend

  project  = var.project_id
  location = var.region
  name     = each.value.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.run.email}"
}
