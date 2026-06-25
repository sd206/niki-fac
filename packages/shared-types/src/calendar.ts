export type EventSource =
  | "manual"
  | "ai"
  | "google_calendar"
  | "school"
  | "sports"
  | "travel";

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  recurrenceRule: string | null;
  ownerId: string | null;
  source: EventSource;
  color: string | null;
  createdAt: string;
}

export interface CreateEventRequest {
  familyId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  recurrenceRule?: string;
  color?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string | null;
  recurrenceRule?: string | null;
  color?: string | null;
}

export interface ListEventsQuery {
  familyId: string;
  from?: string;
  to?: string;
}
