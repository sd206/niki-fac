import { getDb, schema } from "./index.js";

export interface AuditLogParams {
  familyId: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Writes an audit log entry. Safe to call in a fire-and-forget manner;
 * errors are swallowed so they never break the primary operation.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const db = getDb();
    await db.insert(schema.auditLog).values({
      familyId: params.familyId,
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
  } catch {
    // Audit logging is best-effort; never fail the primary operation
  }
}
