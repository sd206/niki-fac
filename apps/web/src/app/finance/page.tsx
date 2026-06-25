"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useBudgets, useCreateBudget, useCreateExpense, useCreateSavingsGoal, useCurrentFamily, useDeleteBudget, useDeleteExpense, useDeleteSavingsGoal, useExpenses, useSavingsGoals, useUpdateSavingsGoal } from "@/lib/queries";
import type { BudgetWithSpent, Expense, SavingsGoal } from "@niki/shared-types";
import { useState } from "react";

function FinanceInner() {
  const { family } = useCurrentFamily();
  const { data: budgets = [] } = useBudgets(family?.familyId);
  const { data: expenses = [] } = useExpenses(family?.familyId);
  const { data: goals = [] } = useSavingsGoals(family?.familyId);

  const createExpense = useCreateExpense();
  const delExpense = useDeleteExpense();
  const createBudget = useCreateBudget();
  const delBudget = useDeleteBudget();
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const delGoal = useDeleteSavingsGoal();

  const [expAmount, setExpAmount] = useState("");
  const [expMerchant, setExpMerchant] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [budName, setBudName] = useState("");
  const [budCategory, setBudCategory] = useState("");
  const [budLimit, setBudLimit] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = budgets.reduce((s, b) => s + Number(b.limitAmount), 0);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expAmount) return;
    await createExpense.mutateAsync({
      familyId: family!.familyId,
      amount: expAmount,
      merchant: expMerchant || undefined,
      category: expCategory || undefined,
      expenseDate: new Date().toISOString(),
    });
    setExpAmount(""); setExpMerchant(""); setExpCategory("");
  }

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!budName || !budLimit) return;
    await createBudget.mutateAsync({
      familyId: family!.familyId,
      name: budName,
      category: budCategory || undefined,
      limitAmount: budLimit,
    });
    setBudName(""); setBudCategory(""); setBudLimit("");
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalName || !goalTarget) return;
    await createGoal.mutateAsync({
      familyId: family!.familyId,
      name: goalName,
      targetAmount: goalTarget,
    });
    setGoalName(""); setGoalTarget("");
  }

  return (
    <div>
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <div className="mt-2 flex gap-6 text-sm text-gray-500">
          <span>Total budget: <strong className="text-gray-900">${totalBudget.toFixed(2)}</strong></span>
          <span>Total spent: <strong className="text-gray-900">${totalSpent.toFixed(2)}</strong></span>
          <span>Remaining: <strong className={totalBudget - totalSpent >= 0 ? "text-green-600" : "text-danger"}>${(totalBudget - totalSpent).toFixed(2)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-6 pb-8 md:grid-cols-3">
        {/* Budgets */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Budgets</h2>
          <form onSubmit={addBudget} className="mb-3 space-y-2">
            <input value={budName} onChange={(e) => setBudName(e.target.value)} placeholder="Budget name" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <input value={budCategory} onChange={(e) => setBudCategory(e.target.value)} placeholder="Category (optional)" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <input value={budLimit} onChange={(e) => setBudLimit(e.target.value)} placeholder="Limit $" type="number" step="0.01" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add budget</button>
          </form>
          <ul className="space-y-2">
            {budgets.map((b: BudgetWithSpent) => {
              const pct = Number(b.limitAmount) > 0 ? (Number(b.spentAmount) / Number(b.limitAmount)) * 100 : 0;
              return (
                <li key={b.id} className="rounded-card border border-gray-200 p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <button onClick={() => delBudget.mutate(b.id)} className="text-xs text-danger">Delete</button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    ${Number(b.spentAmount).toFixed(2)} / ${Number(b.limitAmount).toFixed(2)} ({b.period})
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${pct > 100 ? "bg-danger" : pct > 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Expenses */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Expenses</h2>
          <form onSubmit={addExpense} className="mb-3 space-y-2">
            <input value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="Amount $" type="number" step="0.01" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <input value={expMerchant} onChange={(e) => setExpMerchant(e.target.value)} placeholder="Merchant" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <input value={expCategory} onChange={(e) => setExpCategory(e.target.value)} placeholder="Category" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add expense</button>
          </form>
          <ul className="space-y-2">
            {expenses.slice(0, 15).map((e: Expense) => (
              <li key={e.id} className="flex items-center justify-between rounded-card border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.merchant || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{e.category || "Uncategorized"} - {new Date(e.expenseDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => delExpense.mutate(e.id)} className="text-xs text-danger">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Savings Goals */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Savings Goals</h2>
          <form onSubmit={addGoal} className="mb-3 space-y-2">
            <input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <input value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Target $" type="number" step="0.01" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add goal</button>
          </form>
          <ul className="space-y-2">
            {goals.map((g: SavingsGoal) => {
              const pct = Number(g.targetAmount) > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
              return (
                <li key={g.id} className="rounded-card border border-gray-200 p-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{g.name}</span>
                    <button onClick={() => delGoal.mutate(g.id)} className="text-xs text-danger">Delete</button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    ${Number(g.currentAmount).toFixed(2)} / ${Number(g.targetAmount).toFixed(2)}
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => updateGoal.mutate({ id: g.id, patch: { currentAmount: String(Number(g.currentAmount) + 50) } })}
                      className="rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                    >
                      +$50
                    </button>
                    <button
                      onClick={() => updateGoal.mutate({ id: g.id, patch: { currentAmount: String(Number(g.currentAmount) + 100) } })}
                      className="rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                    >
                      +$100
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <RequireAuth>
      <NavBar />
      <FinanceInner />
    </RequireAuth>
  );
}
