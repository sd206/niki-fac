"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { endOfDay, formatDayLabel, formatTime, startOfDay } from "@/lib/date";
import { useCurrentFamily, useEvents, useTasks, useActivity } from "@/lib/queries";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { useMemo } from "react";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardInner() {
  const { user } = useAuth();
  const { family } = useCurrentFamily();

  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events = [] } = useEvents(family?.familyId, from, to);
  const { data: tasks = [] } = useTasks(family?.familyId, "open");
  const { data: activity = [] } = useActivity(family?.familyId, 10);

  const todayEvents = useMemo(
    () =>
      events.filter((e) => {
        const d = new Date(e.startAt);
        return d >= startOfDay(now) && d <= endOfDay(now);
      }),
    [events, now],
  );
  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.startAt) > endOfDay(now)).slice(0, 5),
    [events, now],
  );
  const dueTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.dueAt && new Date(t.dueAt) <= endOfDay(now))
        .slice(0, 5),
    [tasks, now],
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {greeting()}
        {family ? `, the ${family.name} family` : ""}
      </h1>
      <p className="mt-1 text-gray-500">{user?.email}</p>

      {!family && (
        <div className="mt-6 rounded-card border border-dashed border-gray-300 p-6 text-center">
          <p className="text-gray-600">You are not part of a family yet.</p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-card bg-primary px-4 py-2 font-semibold text-white"
          >
            Create or join a family
          </Link>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">Today</h2>
        <div className="mt-3 rounded-card border border-gray-200 p-4">
          {todayEvents.length === 0 ? (
            <p className="text-gray-500">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span className="font-medium text-gray-900">{e.title}</span>
                  <span className="text-gray-500">{formatTime(e.startAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Upcoming</h2>
          <Link href="/calendar" className="text-sm text-primary">
            Open calendar
          </Link>
        </div>
        <div className="mt-3 rounded-card border border-gray-200 p-4">
          {upcoming.length === 0 ? (
            <p className="text-gray-500">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span className="font-medium text-gray-900">{e.title}</span>
                  <span className="text-gray-500">
                    {formatDayLabel(new Date(e.startAt))} {formatTime(e.startAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Tasks due</h2>
          <Link href="/tasks" className="text-sm text-primary">
            Open tasks
          </Link>
        </div>
        <div className="mt-3 rounded-card border border-gray-200 p-4">
          {dueTasks.length === 0 ? (
            <p className="text-gray-500">No tasks due today.</p>
          ) : (
            <ul className="space-y-2">
              {dueTasks.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span className="font-medium text-gray-900">{t.title}</span>
                  <span className="text-gray-500">
                    {t.dueAt && formatDayLabel(new Date(t.dueAt))}
                    {t.points > 0 && ` - +${t.points} pts`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent activity</h2>
          <Link href="/family" className="text-sm text-primary">
            View all
          </Link>
        </div>
        <div className="mt-3 rounded-card border border-gray-200 p-4">
          {activity.length === 0 ? (
            <p className="text-gray-500">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="text-sm text-gray-700">
                  <span className="font-medium">{a.actorName || "Someone"}</span>{" "}
                  {a.action} {a.entity}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <NavBar />
      <DashboardInner />
    </RequireAuth>
  );
}
