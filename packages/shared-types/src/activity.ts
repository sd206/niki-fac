export interface AuditLogEntry {
  id: string;
  familyId: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListActivityQuery {
  familyId: string;
  limit?: number;
}
