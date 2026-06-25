import { getDb, schema } from "@niki/db";
import { count, eq, and, sql } from "drizzle-orm";

export async function resolveUserId(firebaseUid: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.firebaseUid, firebaseUid))
    .limit(1);
  return rows[0]?.id ?? null;
}

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

export async function isFamilyOwner(familyId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ role: schema.familyMembers.role })
    .from(schema.familyMembers)
    .where(
      and(
        eq(schema.familyMembers.familyId, familyId),
        eq(schema.familyMembers.userId, userId),
      ),
    )
    .limit(1);
  return rows[0]?.role === "owner";
}

export interface FamilyMetrics {
  members: number;
  events: number;
  tasksTotal: number;
  tasksCompleted: number;
  budgets: number;
  expenses: number;
  totalExpenses: string;
  savingsGoals: number;
  documents: number;
  meals: number;
  trips: number;
  memories: number;
  aiConversations: number;
  entities: number;
  auditEntries: number;
}

export async function getFamilyMetrics(familyId: string): Promise<FamilyMetrics> {
  const db = getDb();

  const [members] = await db.select({ c: count() }).from(schema.familyMembers).where(eq(schema.familyMembers.familyId, familyId));
  const [events] = await db.select({ c: count() }).from(schema.events).where(eq(schema.events.familyId, familyId));
  const [tasksTotal] = await db.select({ c: count() }).from(schema.tasks).where(eq(schema.tasks.familyId, familyId));
  const [tasksCompleted] = await db.select({ c: count() }).from(schema.tasks).where(and(eq(schema.tasks.familyId, familyId), eq(schema.tasks.status, "completed")));
  const [budgets] = await db.select({ c: count() }).from(schema.budgets).where(eq(schema.budgets.familyId, familyId));
  const [expenses] = await db.select({ c: count() }).from(schema.expenses).where(eq(schema.expenses.familyId, familyId));
  const expenseSum = await db.select({ total: sql<string>`coalesce(sum(${schema.expenses.amount}), 0)` }).from(schema.expenses).where(eq(schema.expenses.familyId, familyId));
  const [savingsGoals] = await db.select({ c: count() }).from(schema.savingsGoals).where(eq(schema.savingsGoals.familyId, familyId));
  const [documents] = await db.select({ c: count() }).from(schema.documents).where(eq(schema.documents.familyId, familyId));
  const [meals] = await db.select({ c: count() }).from(schema.meals).where(eq(schema.meals.familyId, familyId));
  const [trips] = await db.select({ c: count() }).from(schema.trips).where(eq(schema.trips.familyId, familyId));
  const [memories] = await db.select({ c: count() }).from(schema.memories).where(eq(schema.memories.familyId, familyId));
  const [aiConversations] = await db.select({ c: count() }).from(schema.aiConversations).where(eq(schema.aiConversations.familyId, familyId));
  const [entities] = await db.select({ c: count() }).from(schema.entities).where(eq(schema.entities.familyId, familyId));
  const [auditEntries] = await db.select({ c: count() }).from(schema.auditLog).where(eq(schema.auditLog.familyId, familyId));

  return {
    members: members?.c ?? 0,
    events: events?.c ?? 0,
    tasksTotal: tasksTotal?.c ?? 0,
    tasksCompleted: tasksCompleted?.c ?? 0,
    budgets: budgets?.c ?? 0,
    expenses: expenses?.c ?? 0,
    totalExpenses: expenseSum[0]?.total ?? "0",
    savingsGoals: savingsGoals?.c ?? 0,
    documents: documents?.c ?? 0,
    meals: meals?.c ?? 0,
    trips: trips?.c ?? 0,
    memories: memories?.c ?? 0,
    aiConversations: aiConversations?.c ?? 0,
    entities: entities?.c ?? 0,
    auditEntries: auditEntries?.c ?? 0,
  };
}

export interface PlatformMetrics {
  families: number;
  users: number;
  events: number;
  tasks: number;
  budgets: number;
  expenses: number;
  documents: number;
  meals: number;
  trips: number;
  memories: number;
  aiConversations: number;
  entities: number;
  auditEntries: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const db = getDb();

  const [families] = await db.select({ c: count() }).from(schema.families);
  const [users] = await db.select({ c: count() }).from(schema.users);
  const [events] = await db.select({ c: count() }).from(schema.events);
  const [tasks] = await db.select({ c: count() }).from(schema.tasks);
  const [budgets] = await db.select({ c: count() }).from(schema.budgets);
  const [expenses] = await db.select({ c: count() }).from(schema.expenses);
  const [documents] = await db.select({ c: count() }).from(schema.documents);
  const [meals] = await db.select({ c: count() }).from(schema.meals);
  const [trips] = await db.select({ c: count() }).from(schema.trips);
  const [memories] = await db.select({ c: count() }).from(schema.memories);
  const [aiConversations] = await db.select({ c: count() }).from(schema.aiConversations);
  const [entities] = await db.select({ c: count() }).from(schema.entities);
  const [auditEntries] = await db.select({ c: count() }).from(schema.auditLog);

  return {
    families: families?.c ?? 0,
    users: users?.c ?? 0,
    events: events?.c ?? 0,
    tasks: tasks?.c ?? 0,
    budgets: budgets?.c ?? 0,
    expenses: expenses?.c ?? 0,
    documents: documents?.c ?? 0,
    meals: meals?.c ?? 0,
    trips: trips?.c ?? 0,
    memories: memories?.c ?? 0,
    aiConversations: aiConversations?.c ?? 0,
    entities: entities?.c ?? 0,
    auditEntries: auditEntries?.c ?? 0,
  };
}
