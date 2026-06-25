"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentFamily, useFamilyMetrics } from "@/lib/queries";
import type { FamilyMetrics } from "@niki/shared-types";

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-card border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function AnalyticsInner() {
  const { family } = useCurrentFamily();
  const { data: metrics, isLoading, error } = useFamilyMetrics(family?.familyId);

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-danger">Failed to load analytics.</p>
        <p className="text-sm text-gray-500 mt-1">
          {(error as Error).message}. Analytics requires owner role.
        </p>
      </div>
    );
  }

  if (!metrics) return null;
  const m = metrics as FamilyMetrics;
  const taskRate = m.tasksTotal > 0 ? Math.round((m.tasksCompleted / m.tasksTotal) * 100) : 0;

  return (
    <div>
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Family usage metrics and platform statistics.</p>
      </div>

      <div className="px-6 pb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Family Overview</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <MetricCard label="Members" value={m.members} />
          <MetricCard label="Events" value={m.events} />
          <MetricCard label="Tasks Total" value={m.tasksTotal} sub={`${m.tasksCompleted} completed (${taskRate}%)`} />
          <MetricCard label="Budgets" value={m.budgets} />
          <MetricCard label="Expenses" value={m.expenses} sub={`$${Number(m.totalExpenses).toFixed(2)} total`} />
          <MetricCard label="Savings Goals" value={m.savingsGoals} />
          <MetricCard label="Documents" value={m.documents} />
          <MetricCard label="Meals Planned" value={m.meals} />
          <MetricCard label="Trips" value={m.trips} />
          <MetricCard label="Memories" value={m.memories} />
          <MetricCard label="AI Conversations" value={m.aiConversations} />
          <MetricCard label="KG Entities" value={m.entities} />
          <MetricCard label="Audit Entries" value={m.auditEntries} />
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-700">Task Completion</h2>
        <div className="rounded-card border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{m.tasksCompleted} of {m.tasksTotal} tasks completed</span>
            <span className="text-sm font-bold text-primary">{taskRate}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${taskRate}%` }}
            />
          </div>
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-700">Expense Summary</h2>
        <div className="rounded-card border border-gray-200 p-4">
          <p className="text-3xl font-bold text-gray-900">${Number(m.totalExpenses).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Total expenses across {m.expenses} transactions</p>
          {m.budgets > 0 && (
            <p className="text-xs text-gray-400 mt-2">Tracking against {m.budgets} budget{m.budgets > 1 ? "s" : ""}</p>
          )}
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-700">AI & Knowledge Graph</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard label="AI Conversations" value={m.aiConversations} />
          <MetricCard label="Family Memories" value={m.memories} />
          <MetricCard label="KG Entities" value={m.entities} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <NavBar />
      <AnalyticsInner />
    </RequireAuth>
  );
}
