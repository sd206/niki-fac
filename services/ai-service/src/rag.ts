import { getDb, schema } from "@niki/db";
import type { Citation } from "@niki/shared-types";
import { and, eq, gte, lte, desc, ilike, or } from "drizzle-orm";

export interface RagResult {
  context: string;
  citations: Citation[];
}

/**
 * Retrieves family data relevant to the user's query across all domains
 * (events, tasks, expenses, documents, meals, trips, memories) and builds
 * a context string for the AI provider.
 */
export async function buildRagContext(familyId: string, query: string): Promise<RagResult> {
  const db = getDb();
  const citations: Citation[] = [];
  const sections: string[] = [];
  const searchTerm = `%${query.toLowerCase()}%`;

  // 1. Events (upcoming + matching)
  const events = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.familyId, familyId),
        or(
          ilike(schema.events.title, searchTerm),
          gte(schema.events.startAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        ),
      ),
    )
    .orderBy(desc(schema.events.startAt))
    .limit(10);

  if (events.length > 0) {
    const lines = events.map((e) => {
      citations.push({ type: "event", id: e.id, title: e.title });
      return `  - ${e.title} (${e.startAt.toISOString().split("T")[0]}${e.endAt ? " to " + e.endAt.toISOString().split("T")[0] : ""})${e.recurrenceRule ? " [recurring]" : ""}`;
    });
    sections.push(`[Calendar] Upcoming/relevant events:\n${lines.join("\n")}`);
  }

  // 2. Tasks (open + matching)
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.familyId, familyId),
        or(
          ilike(schema.tasks.title, searchTerm),
          eq(schema.tasks.status, "open"),
        ),
      ),
    )
    .orderBy(desc(schema.tasks.createdAt))
    .limit(10);

  if (tasks.length > 0) {
    const lines = tasks.map((t) => {
      citations.push({ type: "task", id: t.id, title: t.title });
      return `  - ${t.title} [${t.status}] priority=${t.priority}${t.dueAt ? " due=" + t.dueAt.toISOString().split("T")[0] : ""}${t.points ? " points=" + t.points : ""}`;
    });
    sections.push(`[Tasks] Open and relevant tasks:\n${lines.join("\n")}`);
  }

  // 3. Expenses (recent)
  const expenses = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.familyId, familyId),
        or(
          ilike(schema.expenses.notes, searchTerm),
          ilike(schema.expenses.merchant, searchTerm),
          gte(schema.expenses.expenseDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        ),
      ),
    )
    .orderBy(desc(schema.expenses.expenseDate))
    .limit(10);

  if (expenses.length > 0) {
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const lines = expenses.map((e) => {
      const label = e.merchant ?? e.notes ?? "Expense";
      citations.push({ type: "expense", id: e.id, title: `${label} ($${Number(e.amount).toFixed(2)})` });
      return `  - ${label}: $${Number(e.amount).toFixed(2)} (${e.category}) ${e.expenseDate.toISOString().split("T")[0]}`;
    });
    sections.push(`[Finance] Recent expenses (total $${total.toFixed(2)}):\n${lines.join("\n")}`);
  }

  // 4. Budgets
  const budgets = await db
    .select()
    .from(schema.budgets)
    .where(eq(schema.budgets.familyId, familyId))
    .limit(10);

  if (budgets.length > 0) {
    const lines = budgets.map((b) => {
      return `  - ${b.name}: $${Number(b.limitAmount).toFixed(2)} (${b.category ?? "general"}, ${b.period})`;
    });
    sections.push(`[Budgets] Active budgets:\n${lines.join("\n")}`);
  }

  // 5. Savings goals
  const goals = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.familyId, familyId))
    .limit(10);

  if (goals.length > 0) {
    const lines = goals.map((g) => {
      return `  - ${g.name}: $${Number(g.currentAmount).toFixed(2)} / $${Number(g.targetAmount).toFixed(2)}${g.targetDate ? " by " + g.targetDate.toISOString().split("T")[0] : ""}`;
    });
    sections.push(`[Savings] Goals:\n${lines.join("\n")}`);
  }

  // 6. Documents (keyword search)
  const documents = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.familyId, familyId),
        or(
          ilike(schema.documents.name, searchTerm),
          ilike(schema.documents.ocrText, searchTerm),
        ),
      ),
    )
    .limit(10);

  if (documents.length > 0) {
    const lines = documents.map((d) => {
      citations.push({ type: "document", id: d.id, title: d.name });
      return `  - ${d.name} (${d.category})${d.ocrText ? " [OCR: " + d.ocrText.slice(0, 80) + "...]" : ""}`;
    });
    sections.push(`[Documents] Matching documents:\n${lines.join("\n")}`);
  }

  // 7. Meals (this week)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const meals = await db
    .select()
    .from(schema.meals)
    .where(
      and(
        eq(schema.meals.familyId, familyId),
        gte(schema.meals.date, weekStart),
      ),
    )
    .orderBy(desc(schema.meals.date))
    .limit(10);

  if (meals.length > 0) {
    const lines = meals.map((m) => {
      citations.push({ type: "meal", id: m.id, title: m.title ?? m.mealType });
      return `  - ${m.title ?? m.mealType} (${m.mealType}, ${m.date.toISOString().split("T")[0]})`;
    });
    sections.push(`[Meals] This week's planned meals:\n${lines.join("\n")}`);
  }

  // 8. Trips
  const trips = await db
    .select()
    .from(schema.trips)
    .where(
      and(
        eq(schema.trips.familyId, familyId),
        or(
          ilike(schema.trips.name, searchTerm),
          ilike(schema.trips.destination, searchTerm),
        ),
      ),
    )
    .limit(5);

  if (trips.length > 0) {
    const lines = trips.map((t) => {
      citations.push({ type: "trip", id: t.id, title: t.name });
      return `  - ${t.name} (${t.destination ?? "no dest"}${t.startDate ? ", from " + t.startDate : ""}${t.budget ? ", budget $" + Number(t.budget).toFixed(0) : ""})`;
    });
    sections.push(`[Travel] Trips:\n${lines.join("\n")}`);
  }

  // 9. Memories (matching)
  const memories = await db
    .select()
    .from(schema.memories)
    .where(
      and(
        eq(schema.memories.familyId, familyId),
        ilike(schema.memories.content, searchTerm),
      ),
    )
    .limit(10);

  if (memories.length > 0) {
    const lines = memories.map((m) => {
      citations.push({ type: "memory", id: m.id, title: m.content.slice(0, 60) });
      return `  - [${m.type}] ${m.content}`;
    });
    sections.push(`[Family Memory] Relevant memories:\n${lines.join("\n")}`);
  }

  // 10. All memories (for general context even if no keyword match)
  if (memories.length === 0) {
    const allMemories = await db
      .select()
      .from(schema.memories)
      .where(eq(schema.memories.familyId, familyId))
      .orderBy(desc(schema.memories.createdAt))
      .limit(10);

    if (allMemories.length > 0) {
      const lines = allMemories.map((m) => {
        return `  - [${m.type}] ${m.content}`;
      });
      sections.push(`[Family Memory] Stored memories:\n${lines.join("\n")}`);
    }
  }

  return {
    context: sections.length > 0 ? sections.join("\n\n") : "No family data found yet.",
    citations,
  };
}

/**
 * Generates insights from family data without requiring an AI provider.
 * Analyzes spending, task completion, savings progress, and schedule.
 */
export async function generateInsights(familyId: string) {
  const db = getDb();
  const insights: Array<{
    type: string;
    title: string;
    detail: string;
    severity: "info" | "warning" | "positive";
  }> = [];

  // Spending insight: compare expenses to budgets
  const budgets = await db
    .select()
    .from(schema.budgets)
    .where(eq(schema.budgets.familyId, familyId))
    .limit(20);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentExpenses = await db
    .select()
    .from(schema.expenses)
    .where(
      and(
        eq(schema.expenses.familyId, familyId),
        gte(schema.expenses.expenseDate, thirtyDaysAgo),
      ),
    );

  for (const budget of budgets) {
    const spent = recentExpenses
      .filter((e) => e.category === budget.category || (!budget.category && !e.category))
      .reduce((s, e) => s + Number(e.amount), 0);
    const limit = Number(budget.limitAmount);
    const pct = limit > 0 ? (spent / limit) * 100 : 0;

    if (pct >= 100) {
      insights.push({
        type: "spending",
        title: `Budget "${budget.name}" exceeded`,
        detail: `You've spent $${spent.toFixed(2)} of the $${limit.toFixed(2)} ${budget.period} budget (${pct.toFixed(0)}%).`,
        severity: "warning",
      });
    } else if (pct >= 80) {
      insights.push({
        type: "spending",
        title: `Budget "${budget.name}" nearly full`,
        detail: `You've used $${spent.toFixed(2)} of $${limit.toFixed(2)} (${pct.toFixed(0)}%) for ${budget.category ?? "general"}.`,
        severity: "warning",
      });
    } else if (pct < 50 && pct > 0) {
      insights.push({
        type: "spending",
        title: `Budget "${budget.name}" on track`,
        detail: `Only $${spent.toFixed(2)} spent of $${limit.toFixed(2)} (${pct.toFixed(0)}%). Great job!`,
        severity: "positive",
      });
    }
  }

  // Task completion insight
  const openTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.familyId, familyId),
        eq(schema.tasks.status, "open"),
      ),
    );

  const overdueTasks = openTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date(),
  );

  if (overdueTasks.length > 0) {
    insights.push({
      type: "task_completion",
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      detail: overdueTasks.map((t) => t.title).join(", "),
      severity: "warning",
    });
  }

  if (openTasks.length > 5) {
    insights.push({
      type: "task_completion",
      title: `${openTasks.length} open tasks`,
      detail: "Consider completing some tasks to reduce backlog.",
      severity: "info",
    });
  }

  // Savings progress insight
  const savingsGoals = await db
    .select()
    .from(schema.savingsGoals)
    .where(eq(schema.savingsGoals.familyId, familyId));

  for (const goal of savingsGoals) {
    const current = Number(goal.currentAmount);
    const target = Number(goal.targetAmount);
    const pct = target > 0 ? (current / target) * 100 : 0;

    if (pct >= 100) {
      insights.push({
        type: "savings",
        title: `Savings goal "${goal.name}" reached!`,
        detail: `You've saved $${current.toFixed(2)} of your $${target.toFixed(2)} goal. Congratulations!`,
        severity: "positive",
      });
    } else if (pct >= 75) {
      insights.push({
        type: "savings",
        title: `Almost there: "${goal.name}"`,
        detail: `$${current.toFixed(2)} of $${target.toFixed(2)} (${pct.toFixed(0)}%). Just $${(target - current).toFixed(2)} to go!`,
        severity: "positive",
      });
    }
  }

  // Upcoming events insight
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.familyId, familyId),
        gte(schema.events.startAt, now),
        lte(schema.events.startAt, nextWeek),
      ),
    )
    .orderBy(schema.events.startAt)
    .limit(5);

  if (upcomingEvents.length > 0) {
    insights.push({
      type: "schedule",
      title: `${upcomingEvents.length} upcoming event${upcomingEvents.length > 1 ? "s" : ""} this week`,
      detail: upcomingEvents.map((e) => `${e.title} (${e.startAt.toISOString().split("T")[0]})`).join(", "),
      severity: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "general",
      title: "Welcome to Niki AI",
      detail: "Add budgets, tasks, events, and savings goals to get personalized insights.",
      severity: "info",
    });
  }

  return insights;
}
