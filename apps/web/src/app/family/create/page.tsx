"use client";

import { apiFetch } from "@/lib/api";
import type { Family } from "@niki/shared-types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateFamilyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await apiFetch<Family>("/api/v1/families", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push("/home");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Create your family</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Family name"
          className="w-full rounded-card border border-gray-300 px-4 py-3"
          required
        />
        {error && <p className="text-danger">{error}</p>}
        <button
          disabled={submitting}
          className="w-full rounded-card bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Family"}
        </button>
      </form>
    </main>
  );
}
