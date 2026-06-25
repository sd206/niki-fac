import { getDb, schema, writeAuditLog } from "@niki/db";
import type {
  Budget,
  BudgetWithSpent,
  CreateBudgetRequest,
  CreateExpenseRequest,
  CreateSavingsGoalRequest,
  Expense,
  ListExpensesQuery,
  SavingsGoal,
  UpdateBudgetRequest,
  UpdateExpenseRequest,
  UpdateSavingsGoalRequest,
} from "@niki/shared-types";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

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

// ---- Budgets ----

export async function listBudgets(familyId: string): Promise<BudgetWithSpent[]> {
  const db = getDb();
  const budgetRows = await db
    .select()
    .from(schema.budgets)
    .where(eq(schema.budgets.familyId, familyId))
    .orderBy(asc(schema.budgets.name));

  // Calculate spent amount per budget by summing matching expenses
  const result: BudgetWithSpent[] = [];
  for (const b of budgetRows) {
    const conditions = [eq(schema.expenses.familyId, familyId)];
    if (b.category) conditions.push(eq(schema.expenses.category, b.category));

    const spent = await db
      .select({ total: sql<string>`coalesce(sum(${schema.expenses.amount}), 0)` })
      .from(schema.expenses)
      .where(and(...conditions));

    const spentAmount = spent[0]?.total ?? "0";
    result.push({
      ...rowToBudget(b),
      spentAmount,
      remainingAmount: String(Number(b.limitAmount) - Number(spentAmount)),
    });
  }
  return result;
}

export async function createBudget(input: CreateBudgetRequest): Promise<Budget> {
  const db = getDb();
  const inserted = await db
    .insert(schema.budgets)
    .values({
      familyId: input.familyId,
      name: input.name,
      period: input.period ?? "monthly",
      category: input.category ?? null,
      limitAmount: input.limitAmount,
    })
    .returning();
  const budget = rowToBudget(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, action: "created", entity: "budget", entityId: budget.id, after: { name: budget.name, limitAmount: budget.limitAmount } });
  return budget;
}

export async function getBudget(budgetId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.budgets)
    .where(eq(schema.budgets.id, budgetId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateBudget(budgetId: string, patch: UpdateBudgetRequest): Promise<Budget | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.period !== undefined) values.period = patch.period;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.limitAmount !== undefined) values.limitAmount = patch.limitAmount;

  const updated = await db
    .update(schema.budgets)
    .set(values)
    .where(eq(schema.budgets.id, budgetId))
    .returning();
  return updated[0] ? rowToBudget(updated[0]) : null;
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.budgets).where(eq(schema.budgets.id, budgetId));
}

// ---- Expenses ----

export async function listExpenses(params: ListExpensesQuery): Promise<Expense[]> {
  const db = getDb();
  const conditions = [eq(schema.expenses.familyId, params.familyId)];
  if (params.category) conditions.push(eq(schema.expenses.category, params.category));
  if (params.from) conditions.push(gte(schema.expenses.expenseDate, new Date(params.from)));
  if (params.to) conditions.push(lte(schema.expenses.expenseDate, new Date(params.to)));
  if (params.approvalStatus) conditions.push(eq(schema.expenses.approvalStatus, params.approvalStatus));

  const rows = await db
    .select()
    .from(schema.expenses)
    .where(and(...conditions))
    .orderBy(desc(schema.expenses.expenseDate));

  return rows.map(rowToExpense);
}

export async function createExpense(userId: string, input: CreateExpenseRequest): Promise<Expense> {
  const db = getDb();
  const inserted = await db
    .insert(schema.expenses)
    .values({
      familyId: input.familyId,
      amount: input.amount,
      merchant: input.merchant ?? null,
      category: input.category ?? null,
      expenseDate: new Date(input.expenseDate),
      source: input.source ?? "manual",
      createdBy: userId,
      notes: input.notes ?? null,
    })
    .returning();
  const expense = rowToExpense(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, actorId: userId, action: "created", entity: "expense", entityId: expense.id, after: { amount: expense.amount, merchant: expense.merchant, category: expense.category } });
  return expense;
}

export async function getExpense(expenseId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.id, expenseId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateExpense(expenseId: string, patch: UpdateExpenseRequest): Promise<Expense | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.amount !== undefined) values.amount = patch.amount;
  if (patch.merchant !== undefined) values.merchant = patch.merchant;
  if (patch.category !== undefined) values.category = patch.category;
  if (patch.expenseDate !== undefined) values.expenseDate = new Date(patch.expenseDate);
  if (patch.approvalStatus !== undefined) values.approvalStatus = patch.approvalStatus;
  if (patch.notes !== undefined) values.notes = patch.notes;

  const updated = await db
    .update(schema.expenses)
    .set(values)
    .where(eq(schema.expenses.id, expenseId))
    .returning();
  return updated[0] ? rowToExpense(updated[0]) : null;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.expenses).where(eq(schema.expenses.id, expenseId));
}

// ---- Savings Goals ----

export async function listSavingsGoals(familyId: string): Promise<SavingsGoal[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.familyId, familyId))
    .orderBy(asc(schema.savingsGoals.name));
  return rows.map(rowToSavingsGoal);
}

export async function createSavingsGoal(input: CreateSavingsGoalRequest): Promise<SavingsGoal> {
  const db = getDb();
  const inserted = await db
    .insert(schema.savingsGoals)
    .values({
      familyId: input.familyId,
      name: input.name,
      targetAmount: input.targetAmount,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
    })
    .returning();
  const goal = rowToSavingsGoal(inserted[0]!);
  await writeAuditLog({ familyId: input.familyId, action: "created", entity: "savings_goal", entityId: goal.id, after: { name: goal.name, targetAmount: goal.targetAmount } });
  return goal;
}

export async function getSavingsGoal(goalId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.id, goalId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSavingsGoal(goalId: string, patch: UpdateSavingsGoalRequest): Promise<SavingsGoal | null> {
  const db = getDb();
  const values: Record<string, unknown> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.targetAmount !== undefined) values.targetAmount = patch.targetAmount;
  if (patch.currentAmount !== undefined) values.currentAmount = patch.currentAmount;
  if (patch.targetDate !== undefined) values.targetDate = patch.targetDate ? new Date(patch.targetDate) : null;

  const updated = await db
    .update(schema.savingsGoals)
    .set(values)
    .where(eq(schema.savingsGoals.id, goalId))
    .returning();
  return updated[0] ? rowToSavingsGoal(updated[0]) : null;
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.savingsGoals).where(eq(schema.savingsGoals.id, goalId));
}

// ---- Mappers ----

function rowToBudget(row: typeof schema.budgets.$inferSelect): Budget {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    period: row.period as Budget["period"],
    category: row.category,
    limitAmount: row.limitAmount,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToExpense(row: typeof schema.expenses.$inferSelect): Expense {
  return {
    id: row.id,
    familyId: row.familyId,
    amount: row.amount,
    merchant: row.merchant,
    category: row.category,
    expenseDate: row.expenseDate.toISOString(),
    source: row.source as Expense["source"],
    receiptDocId: row.receiptDocId ?? null,
    approvalStatus: row.approvalStatus as Expense["approvalStatus"],
    createdBy: row.createdBy,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToSavingsGoal(row: typeof schema.savingsGoals.$inferSelect): SavingsGoal {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    targetDate: row.targetDate ? row.targetDate.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
