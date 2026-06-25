"use client";

import {
  useCreateInvitation,
  useCurrentFamily,
} from "@/lib/queries";
import type { FamilyRole } from "@niki/shared-types";
import { useState } from "react";

const ROLES: FamilyRole[] = ["parent", "adult", "child", "guest"];
const CHANNELS = ["email", "sms", "link"] as const;

export function InviteForm({ onClose }: { onClose: () => void }) {
  const { family } = useCurrentFamily();
  const create = useCreateInvitation();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("link");
  const [destination, setDestination] = useState("");
  const [role, setRole] = useState<FamilyRole>("adult");
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedToken(null);
    if (!family) return;
    if (channel !== "link" && !destination.trim()) {
      setError("Destination is required for email/SMS invitations");
      return;
    }
    try {
      const result = await create.mutateAsync({
        familyId: family.familyId,
        channel,
        destination: channel === "link" ? undefined : destination,
        role,
      });
      setCreatedToken(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">Invite a member</h2>
        {createdToken ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Invitation created! Share this code with the invitee:
            </p>
            <code className="block rounded-card bg-gray-100 p-3 text-sm break-all">
              {createdToken}
            </code>
            <p className="text-xs text-gray-500">
              They can join at the Join Family page using this code.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-card bg-primary px-4 py-2 font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block text-sm text-gray-600">
              Channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as typeof channel)}
                className="mt-1 w-full rounded-card border border-gray-300 px-2 py-2"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            {channel !== "link" && (
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={channel === "email" ? "Email address" : "Phone number"}
                className="w-full rounded-card border border-gray-300 px-3 py-2"
              />
            )}
            <label className="block text-sm text-gray-600">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as FamilyRole)}
                className="mt-1 w-full rounded-card border border-gray-300 px-2 py-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
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
                disabled={create.isPending}
                className="rounded-card bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {create.isPending ? "Creating..." : "Create invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
