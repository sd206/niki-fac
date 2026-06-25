locals {
  topics = [
    "document.uploaded",
    "expense.created",
    "task.completed",
    "event.created",
    "trip.created",
    "meal.planned",
    "memory.created",
  ]
}

resource "google_pubsub_topic" "topics" {
  for_each   = toset(local.topics)
  name       = each.value
  depends_on = [google_project_service.enabled]
}
