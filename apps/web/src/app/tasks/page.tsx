"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { TaskForm } from "@/components/TaskForm";
import { formatDayLabel } from "@/lib/date";
import { useCurrentFamily, useDeleteTask, useTasks, useUpdateTask } from "@/lib/queries";
import type { Task, TaskStatus } from "@niki/shared-types";
import { useState } from "react";

const STATUS_FILTERS: (TaskStatus | "all")[] = [
  "all",
  "open",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-danger",
  medium: "text-amber-600",
  low: "text-gray-400",
};

function TasksInner() {
  const { family } = useCurrentFamily();
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>();

  const { data: tasks = [], isLoading } = useTasks(
    family?.familyId,
    filter === "all" ? undefined : filter,
  );
  const del = useDeleteTask();
  const update = useUpdateTask();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  function toggleComplete(task: Task) {
    const newStatus: TaskStatus = task.status === "completed" ? "open" : "completed";
    update.mutate({ id: task.id, patch: { status: newStatus } });
  }

  if (!family) {
    return (
      <div className="p-8 text-gray-600">
        No family yet. Create one from the home screen first.
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalPoints = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.points, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Tasks &amp; Chores</h1>
        <button
          onClick={openCreate}
          className="rounded-card bg-primary px-3 py-1 text-sm font-semibold text-white"
        >
          New task
        </button>
      </div>

      <div className="px-6">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{tasks.length} total</span>
          <span>{completedCount} completed</span>
          <span>{totalPoints} points earned</span>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-card px-3 py-1 text-sm capitalize ${
              filter === f
                ? "bg-primary text-white"
                : "border border-gray-300 text-gray-600"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading && <p className="px-6 text-gray-500">Loading tasks...</p>}

      <div className="px-6 pb-8">
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks found. Create one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-card border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.status === "completed"}
                    onChange={() => toggleComplete(t)}
                    className="h-5 w-5 rounded border-gray-300"
                  />
                  <div>
                    <p
                      className={`font-semibold text-gray-900 ${
                        t.status === "completed" ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`rounded px-1.5 py-0.5 ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                      <span className={PRIORITY_COLORS[t.priority]}>
                        {t.priority}
                      </span>
                      {t.dueAt && (
                        <span>due {formatDayLabel(new Date(t.dueAt))}</span>
                      )}
                      {t.points > 0 && (
                        <span className="font-medium text-primary">
                          +{t.points} pts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-sm text-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del.mutate(t.id)}
                    className="text-sm text-danger"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <TaskForm
          familyId={family.familyId}
          task={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth>
      <NavBar />
      <TasksInner />
    </RequireAuth>
  );
}
