import { getDb, schema, writeAuditLog } from "@niki/db";
import type {
  CreateTaskRequest,
  ListTasksQuery,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  UpdateTaskRequest,
} from "@niki/shared-types";
import { and, asc, eq, sql } from "drizzle-orm";

/** Resolves the internal user id for a Firebase uid, or null if unknown. */
export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Returns true if the user is an active member of the family. */
export async function isFamilyMember(familyId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.familyMembers.userId })
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Award gamification points to a family member. */
async function awardPoints(familyId: string, userId: string, points: number): Promise<void> {
  const db = getDb();
  await db
    .update(schema.familyMembers)
    .set({ points: sql`${schema.familyMembers.points} + ${points}` })
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    );
}

export async function listTasks(params: ListTasksQuery): Promise<Task[]> {
  const db = getDb();
  const conditions = [eq(schema.tasks.familyId, params.familyId)];
  if (params.status) conditions.push(eq(schema.tasks.status, params.status));
  if (params.assigneeId) conditions.push(eq(schema.tasks.assigneeId, params.assigneeId));

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(and(...conditions))
    .orderBy(asc(schema.tasks.dueAt), asc(schema.tasks.createdAt));

  return rows.map(rowToTask);
}

export async function createTask(ownerId: string, input: CreateTaskRequest): Promise<Task> {
  const db = getDb();
  const inserted = await db
    .insert(schema.tasks)
    .values({
      familyId: input.familyId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      type: (input.type ?? "family") as TaskType,
      priority: (input.priority ?? "medium") as TaskPriority,
      status: "open",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      points: input.points ?? 0,
    })
    .returning();
  const task = rowToTask(inserted[0]!);
  await writeAuditLog({
    familyId: input.familyId,
    actorId: ownerId,
    action: "created",
    entity: "task",
    entityId: task.id,
    after: { title: task.title, priority: task.priority, points: task.points },
  });
  return task;
}

export async function getTask(taskId: string): Promise<Task | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);
  return rows[0] ? rowToTask(rows[0]) : null;
}

export async function updateTask(
  taskId: string,
  familyId: string,
  actingUserId: string,
  patch: UpdateTaskRequest,
): Promise<Task | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.assigneeId !== undefined) values.assigneeId = patch.assigneeId;
  if (patch.type !== undefined) values.type = patch.type;
  if (patch.priority !== undefined) values.priority = patch.priority;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.dueAt !== undefined) values.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
  if (patch.points !== undefined) values.points = patch.points;

  const updated = await db
    .update(schema.tasks)
    .set(values)
    .where(eq(schema.tasks.id, taskId))
    .returning();

  const task = updated[0] ? rowToTask(updated[0]) : null;

  // Award points when a task is marked completed
  if (patch.status === "completed" && task?.assigneeId) {
    await awardPoints(familyId, task.assigneeId, task.points);
  }

  return task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
}

function rowToTask(row: typeof schema.tasks.$inferSelect): Task {
  return {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    description: row.description,
    assigneeId: row.assigneeId,
    type: row.type as TaskType,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    recurrenceRule: row.recurrenceRule,
    points: row.points,
    createdAt: row.createdAt.toISOString(),
  };
}

