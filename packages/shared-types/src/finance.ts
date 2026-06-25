export type BudgetPeriod = "weekly" | "monthly" | "yearly";
export type ExpenseSource = "manual" | "voice" | "ocr";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Budget {
  id: string;
  familyId: string;
  name: string;
  period: BudgetPeriod;
  category: string | null;
  limitAmount: string;
  createdAt: string;
}

export interface CreateBudgetRequest {
  familyId: string;
  name: string;
  period?: BudgetPeriod;
  category?: string;
  limitAmount: string;
}

export interface UpdateBudgetRequest {
  name?: string;
  period?: BudgetPeriod;
  category?: string | null;
  limitAmount?: string;
}

export interface Expense {
  id: string;
  familyId: string;
  amount: string;
  merchant: string | null;
  category: string | null;
  expenseDate: string;
  source: ExpenseSource;
  receiptDocId: string | null;
  approvalStatus: ApprovalStatus;
  createdBy: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateExpenseRequest {
  familyId: string;
  amount: string;
  merchant?: string;
  category?: string;
  expenseDate: string;
  source?: ExpenseSource;
  notes?: string;
}

export interface UpdateExpenseRequest {
  amount?: string;
  merchant?: string | null;
  category?: string | null;
  expenseDate?: string;
  approvalStatus?: ApprovalStatus;
  notes?: string | null;
}

export interface ListExpensesQuery {
  familyId: string;
  category?: string;
  from?: string;
  to?: string;
  approvalStatus?: ApprovalStatus;
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  createdAt: string;
}

export interface CreateSavingsGoalRequest {
  familyId: string;
  name: string;
  targetAmount: string;
  targetDate?: string;
}

export interface UpdateSavingsGoalRequest {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  targetDate?: string | null;
}

export interface BudgetWithSpent extends Budget {
  spentAmount: string;
  remainingAmount: string;
}
