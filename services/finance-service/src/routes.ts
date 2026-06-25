import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  createBudget,
  createExpense,
  createSavingsGoal,
  deleteBudget,
  deleteExpense,
  deleteSavingsGoal,
  getBudget,
  getExpense,
  getSavingsGoal,
  isFamilyMember,
  listBudgets,
  listExpenses,
  listSavingsGoals,
  resolveUserId,
  updateBudget,
  updateExpense,
  updateSavingsGoal,
} from "./repository.js";

const amountSchema = z.union([z.string(), z.number()]).transform((v) => String(v));

const createBudgetSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(120),
  period: z.enum(["weekly", "monthly", "yearly"]).optional(),
  category: z.string().max(60).optional(),
  limitAmount: amountSchema,
});

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  period: z.enum(["weekly", "monthly", "yearly"]).optional(),
  category: z.string().max(60).nullable().optional(),
  limitAmount: amountSchema.optional(),
});

const createExpenseSchema = z.object({
  familyId: z.string().uuid(),
  amount: amountSchema,
  merchant: z.string().max(200).optional(),
  category: z.string().max(60).optional(),
  expenseDate: z.string().datetime(),
  source: z.enum(["manual", "voice", "ocr"]).optional(),
  notes: z.string().max(2000).optional(),
});

const updateExpenseSchema = z.object({
  amount: amountSchema.optional(),
  merchant: z.string().max(200).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  expenseDate: z.string().datetime().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const listExpensesSchema = z.object({
  familyId: z.string().uuid(),
  category: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
});

const createSavingsSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(120),
  targetAmount: amountSchema,
  targetDate: z.string().datetime().optional(),
});

const updateSavingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  targetAmount: amountSchema.optional(),
  currentAmount: amountSchema.optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export const financeRouter: ExpressRouter = Router();
financeRouter.use(withCaller);

async function requireMembership(
  req: Request,
  res: Response,
  familyId: string,
): Promise<string | null> {
  const userId = await resolveUserId(req.caller!.uid);
  if (!userId || !(await isFamilyMember(familyId, userId))) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return null;
  }
  return userId;
}

// ---- Budgets ----

financeRouter.get("/budgets", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const budgets = await listBudgets(parsed.data.familyId);
  res.json({ data: budgets });
});

financeRouter.post("/budgets", async (req, res) => {
  const parsed = createBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const budget = await createBudget(parsed.data);
  res.status(201).json({ data: budget });
});

financeRouter.patch("/budgets/:id", async (req, res) => {
  const parsed = updateBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getBudget(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Budget not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const budget = await updateBudget(req.params.id, parsed.data);
  res.json({ data: budget });
});

financeRouter.delete("/budgets/:id", async (req, res) => {
  const existing = await getBudget(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Budget not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteBudget(req.params.id);
  res.status(204).end();
});

// ---- Expenses ----

financeRouter.get("/expenses", async (req, res) => {
  const parsed = listExpensesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const expenses = await listExpenses(parsed.data);
  res.json({ data: expenses });
});

financeRouter.post("/expenses", async (req, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const expense = await createExpense(userId, parsed.data);
  res.status(201).json({ data: expense });
});

financeRouter.patch("/expenses/:id", async (req, res) => {
  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getExpense(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Expense not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const expense = await updateExpense(req.params.id, parsed.data);
  res.json({ data: expense });
});

financeRouter.delete("/expenses/:id", async (req, res) => {
  const existing = await getExpense(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Expense not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteExpense(req.params.id);
  res.status(204).end();
});

// ---- Savings Goals ----

financeRouter.get("/savings-goals", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const goals = await listSavingsGoals(parsed.data.familyId);
  res.json({ data: goals });
});

financeRouter.post("/savings-goals", async (req, res) => {
  const parsed = createSavingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireMembership(req, res, parsed.data.familyId);
  if (!userId) return;
  const goal = await createSavingsGoal(parsed.data);
  res.status(201).json({ data: goal });
});

financeRouter.patch("/savings-goals/:id", async (req, res) => {
  const parsed = updateSavingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const existing = await getSavingsGoal(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Savings goal not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  const goal = await updateSavingsGoal(req.params.id, parsed.data);
  res.json({ data: goal });
});

financeRouter.delete("/savings-goals/:id", async (req, res) => {
  const existing = await getSavingsGoal(req.params.id);
  if (!existing) {
    res.status(404).json({ error: { code: "not_found", message: "Savings goal not found" } });
    return;
  }
  const userId = await requireMembership(req, res, existing.familyId);
  if (!userId) return;
  await deleteSavingsGoal(req.params.id);
  res.status(204).end();
});
