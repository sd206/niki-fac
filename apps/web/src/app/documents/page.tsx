"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useCreateDocument, useCurrentFamily, useDeleteDocument, useDocuments } from "@/lib/queries";
import type { Document } from "@niki/shared-types";
import { useState } from "react";

const CATEGORIES = ["general", "medical", "insurance", "tax", "receipt", "travel", "education", "property", "other"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  medical: "bg-red-100 text-red-700",
  insurance: "bg-blue-100 text-blue-700",
  tax: "bg-amber-100 text-amber-700",
  receipt: "bg-green-100 text-green-700",
  travel: "bg-purple-100 text-purple-700",
  education: "bg-indigo-100 text-indigo-700",
  property: "bg-gray-100 text-gray-700",
  general: "bg-gray-100 text-gray-600",
  other: "bg-gray-100 text-gray-600",
};

function DocumentsInner() {
  const { family } = useCurrentFamily();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const { data: docs = [] } = useDocuments(family?.familyId, search || undefined);
  const create = useCreateDocument();
  const del = useDeleteDocument();

  const [docName, setDocName] = useState("");
  const [docPath, setDocPath] = useState("Niki/");
  const [docCat, setDocCat] = useState<string>("general");

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  const filtered = filterCat ? docs.filter((d) => d.category === filterCat) : docs;

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docName) return;
    await create.mutateAsync({
      familyId: family!.familyId,
      name: docName,
      path: docPath,
      category: docCat as Document["category"],
    });
    setDocName(""); setShowForm(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Family Vault</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-card bg-primary px-3 py-1 text-sm font-semibold text-white"
        >
          Add document
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-card border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={addDoc} className="mx-6 mb-4 space-y-2 rounded-card border border-gray-200 p-4">
          <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document name" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
          <input value={docPath} onChange={(e) => setDocPath(e.target.value)} placeholder="Path (e.g. Niki/Tax/2024)" className="w-full rounded-card border border-gray-300 px-3 py-2 text-sm" />
          <select value={docCat} onChange={(e) => setDocCat(e.target.value)} className="rounded-card border border-gray-300 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Save</button>
        </form>
      )}

      <div className="px-6 pb-8 pt-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500">No documents found. Add one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-card border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{"\u{1F4C4}"}</span>
                  <div>
                    <p className="font-medium text-gray-900">{d.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`rounded px-1.5 py-0.5 ${CATEGORY_COLORS[d.category] ?? ""}`}>{d.category}</span>
                      <span>{d.path}</span>
                      {d.ocrStatus === "done" && <span className="text-green-600">OCR ready</span>}
                      {d.ocrStatus === "pending" && <span className="text-amber-600">OCR pending</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => del.mutate(d.id)} className="text-sm text-danger">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RequireAuth>
      <NavBar />
      <DocumentsInner />
    </RequireAuth>
  );
}
