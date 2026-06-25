"use client";

import { InviteForm } from "@/components/InviteForm";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import {
  useActivity,
  useCurrentFamily,
  useInvitations,
  useMembers,
  useRevokeInvitation,
} from "@/lib/queries";
import type { AuditLogEntry, FamilyMemberWithUser, InvitationWithDetails } from "@niki/shared-types";
import { useState } from "react";

type Tab = "members" | "invitations" | "activity";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary text-white",
  parent: "bg-blue-100 text-blue-800",
  adult: "bg-green-100 text-green-800",
  child: "bg-amber-100 text-amber-800",
  guest: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-500",
  revoked: "bg-red-100 text-red-800",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function MembersTab({ members }: { members: FamilyMemberWithUser[] }) {
  if (members.length === 0) {
    return <p className="text-gray-500">No members yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li
          key={m.userId}
          className="flex items-center justify-between rounded-card border border-gray-200 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
              {(m.displayName || m.email || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {m.displayName || m.email || "Unknown"}
              </p>
              {m.email && m.displayName && (
                <p className="text-xs text-gray-500">{m.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {m.points > 0 && (
              <span className="text-sm font-medium text-primary">{m.points} pts</span>
            )}
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? ""}`}>
              {m.role}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function InvitationsTab({
  invitations,
  familyId,
}: {
  invitations: InvitationWithDetails[];
  familyId: string;
}) {
  const revoke = useRevokeInvitation();
  if (invitations.length === 0) {
    return <p className="text-gray-500">No invitations yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="flex items-center justify-between rounded-card border border-gray-200 p-3"
        >
          <div>
            <p className="font-semibold text-gray-900">
              {inv.destination || "Link invitation"}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded bg-gray-100 px-1.5 py-0.5">{inv.channel}</span>
              <span>role: {inv.role}</span>
              <span className={`rounded px-1.5 py-0.5 ${STATUS_COLORS[inv.status] ?? ""}`}>
                {inv.status}
              </span>
              <span>{formatRelative(inv.createdAt)}</span>
            </div>
            {inv.status === "pending" && (
              <code className="mt-1 block text-xs text-gray-400 break-all">
                {inv.token}
              </code>
            )}
          </div>
          {inv.status === "pending" && (
            <button
              onClick={() => revoke.mutate({ familyId, invitationId: inv.id })}
              className="text-sm text-danger"
            >
              Revoke
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActivityTab({ activity }: { activity: AuditLogEntry[] }) {
  if (activity.length === 0) {
    return <p className="text-gray-500">No activity yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {activity.map((entry) => (
        <li
          key={entry.id}
          className="flex items-start gap-3 rounded-card border border-gray-200 p-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(entry.actorName || "?")[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-gray-900">
              <span className="font-semibold">{entry.actorName || "Someone"}</span>{" "}
              {entry.action} {entry.entity}
              {entry.entityId && (
                <span className="text-gray-400"> #{entry.entityId.slice(0, 8)}</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{formatRelative(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FamilyInner() {
  const { family } = useCurrentFamily();
  const [tab, setTab] = useState<Tab>("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: members = [] } = useMembers(family?.familyId);
  const { data: invitations = [] } = useInvitations(family?.familyId);
  const { data: activity = [] } = useActivity(family?.familyId);

  if (!family) {
    return (
      <div className="p-8 text-gray-600">
        No family yet. Create one from the home screen first.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">The {family.name} Family</h1>
        <button
          onClick={() => setInviteOpen(true)}
          className="rounded-card bg-primary px-3 py-1 text-sm font-semibold text-white"
        >
          Invite member
        </button>
      </div>

      <div className="flex gap-2 px-6 py-2">
        {(["members", "invitations", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-card px-3 py-1 text-sm capitalize ${
              tab === t
                ? "bg-primary text-white"
                : "border border-gray-300 text-gray-600"
            }`}
          >
            {t}
            {t === "invitations" && invitations.filter((i) => i.status === "pending").length > 0 && (
              <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-xs text-white">
                {invitations.filter((i) => i.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 pb-8 pt-2">
        {tab === "members" && <MembersTab members={members} />}
        {tab === "invitations" && (
          <InvitationsTab invitations={invitations} familyId={family.familyId} />
        )}
        {tab === "activity" && <ActivityTab activity={activity} />}
      </div>

      {inviteOpen && <InviteForm onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

export default function FamilyPage() {
  return (
    <RequireAuth>
      <NavBar />
      <FamilyInner />
    </RequireAuth>
  );
}
