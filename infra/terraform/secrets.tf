# Secret container for the database connection string. The VALUE is added
# out-of-band (not in Terraform) so secrets never land in state:
#
#   echo -n "postgresql://USER:PASS@/niki?host=/cloudsql/CONNECTION_NAME" \
#     | gcloud secrets versions add niki-database-url-<env> --data-file=-
#
resource "google_secret_manager_secret" "database_url" {
  secret_id = "niki-database-url-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled]
}
