"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useCreateMemory, useCurrentFamily, useDeleteMemory, useMemories } from "@/lib/queries";
import type { MemoryType } from "@niki/shared-types";
import { useState } from "react";

const MEMORY_TYPES: MemoryType[] = [
  "preference",
  "goal",
  "habit",
  "fact",
  "event_summary",
  "travel_pattern",
  "financial_pattern",
];

const TYPE_COLORS: Record<MemoryType, string> = {
  preference: "bg-blue-100 text-blue-800",
  goal: "bg-green-100 text-green-800",
  habit: "bg-purple-100 text-purple-800",
  fact: "bg-gray-100 text-gray-800",
  event_summary: "bg-amber-100 text-amber-800",
  travel_pattern: "bg-cyan-100 text-cyan-800",
  financial_pattern: "bg-indigo-100 text-indigo-800",
};

function MemoriesInner() {
  const { family } = useCurrentFamily();
  const { data: memories = [] } = useMemories(family?.familyId);
  const createMemory = useCreateMemory();
  const delMemory = useDeleteMemory();

  const [content, setContent] = useState("");
  const [type, setType] = useState<MemoryType>("preference");

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!content) return;
    await createMemory.mutateAsync({
      familyId: family!.familyId,
      type,
      content,
    });
    setContent("");
  }

  return (
    <div>
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Family Memory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Store preferences, goals, habits, and facts that help the AI assistant understand your family.
        </p>
      </div>

      <form onSubmit={addMemory} className="mx-6 mb-4 space-y-2 rounded-card border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {MEMORY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-card px-2.5 py-1 text-xs font-medium ${
                type === t ? TYPE_COLORS[t] : "bg-gray-50 text-gray-500"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g., We prefer vegetarian meals on weekdays"
          className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm"
          rows={2}
        />
        <button type="submit" className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-white">
          Save memory
        </button>
      </form>

      <div className="px-6 pb-8">
        {memories.length === 0 ? (
          <p className="text-gray-500">No memories stored yet. Add one above to get started.</p>
        ) : (
          <ul className="space-y-2">
            {memories.map((m) => (
              <li key={m.id} className="flex items-start justify-between rounded-card border border-gray-200 p-3">
                <div>
                  <span className={`mb-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[m.type]}`}>
                    {m.type.replace("_", " ")}
                  </span>
                  <p className="text-sm text-gray-900">{m.content}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => delMemory.mutate(m.id)}
                  className="text-xs text-danger"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <RequireAuth>
      <NavBar />
      <MemoriesInner />
    </RequireAuth>
  );
}
