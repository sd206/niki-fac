"use client";

import { isoToLocalInput, localInputToIso } from "@/lib/date";
import { useCreateTask, useUpdateTask } from "@/lib/queries";
import type { Task, TaskPriority, TaskStatus, TaskType } from "@niki/shared-types";
import { useState } from "react";

interface Props {
  familyId: string;
  task?: Task;
  onClose: () => void;
}

const TYPES: TaskType[] = ["personal", "family", "chore"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const STATUSES: TaskStatus[] = ["open", "in_progress", "completed", "cancelled"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function TaskForm({ familyId, task, onClose }: Props) {
  const create = useCreateTask();
  const update = useUpdateTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState<TaskType>(task?.type ?? "family");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "open");
  const [dueAt, setDueAt] = useState(task?.dueAt ? isoToLocalInput(task.dueAt) : "");
  const [points, setPoints] = useState(task?.points ?? 0);
  const [error, setError] = useState<string | null>(null);

  const saving = create.isPending || update.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (task) {
        await update.mutateAsync({
          id: task.id,
          patch: {
            title,
            description: description || null,
            type,
            priority,
            status,
            dueAt: dueAt ? localInputToIso(dueAt) : null,
            points,
          },
        });
      } else {
        await create.mutateAsync({
          familyId,
          title,
          description: description || undefined,
          type,
          priority,
          dueAt: dueAt ? localInputToIso(dueAt) : undefined,
          points,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">
          {task ? "Edit task" : "New task"}
        </h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full rounded-card border border-gray-300 px-3 py-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-card border border-gray-300 px-3 py-2"
            rows={2}
          />
          <div className="flex gap-2">
            <label className="flex-1 text-sm text-gray-600">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="mt-1 w-full rounded-card border border-gray-300 px-2 py-2"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-sm text-gray-600">
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1 w-full rounded-card border border-gray-300 px-2 py-2"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          {task && (
            <label className="block text-sm text-gray-600">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="mt-1 w-full rounded-card border border-gray-300 px-2 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm text-gray-600">
            Due (optional)
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-card border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Points (gamification)
            <input
              type="number"
              min={0}
              max={1000}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="mt-1 w-full rounded-card border border-gray-300 px-3 py-2"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-card px-4 py-2 text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-card bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
