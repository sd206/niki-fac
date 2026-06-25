"use client";

import { EventForm } from "@/components/EventForm";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import {
  addMonths,
  endOfMonth,
  formatDayLabel,
  formatTime,
  monthGridDays,
  monthLabel,
  sameDay,
  startOfMonth,
} from "@/lib/date";
import { useCurrentFamily, useDeleteEvent, useEvents } from "@/lib/queries";
import type { CalendarEvent } from "@niki/shared-types";
import { useMemo, useState } from "react";

type View = "month" | "agenda";

function CalendarInner() {
  const { family } = useCurrentFamily();
  const [view, setView] = useState<View>("month");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | undefined>();
  const [formDate, setFormDate] = useState<Date | undefined>();

  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();
  const { data: events = [], isLoading } = useEvents(family?.familyId, from, to);
  const del = useDeleteEvent();

  const days = useMemo(() => monthGridDays(month), [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = new Date(e.startAt).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  function openCreate(date?: Date) {
    setEditing(undefined);
    setFormDate(date);
    setFormOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setFormOpen(true);
  }

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{monthLabel(month)}</h1>
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            className="rounded-card border px-2 py-1 text-sm"
          >
            Prev
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="rounded-card border px-2 py-1 text-sm"
          >
            Today
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-card border px-2 py-1 text-sm"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === "month" ? "agenda" : "month")}
            className="rounded-card border px-3 py-1 text-sm"
          >
            {view === "month" ? "Agenda view" : "Month view"}
          </button>
          <button
            onClick={() => openCreate()}
            className="rounded-card bg-primary px-3 py-1 text-sm font-semibold text-white"
          >
            New event
          </button>
        </div>
      </div>

      {isLoading && <p className="px-6 text-gray-500">Loading events...</p>}

      {view === "month" ? (
        <div className="px-6 pb-8">
          <div className="grid grid-cols-7 gap-px text-xs font-semibold text-gray-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {days.map((d) => {
              const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
              const isCurrentMonth = d.getMonth() === month.getMonth();
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => openCreate(d)}
                  className={`min-h-24 cursor-pointer bg-white p-1 ${
                    isCurrentMonth ? "" : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <div
                    className={`text-xs ${
                      sameDay(d, new Date()) ? "font-bold text-primary" : ""
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(e);
                        }}
                        className="truncate rounded bg-indigo-100 px-1 text-[11px] text-indigo-800"
                      >
                        {formatTime(e.startAt)} {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-500">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-8">
          {events.length === 0 ? (
            <p className="text-gray-500">No events this month.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-card border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{e.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDayLabel(new Date(e.startAt))} - {formatTime(e.startAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(e)}
                      className="text-sm text-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del.mutate(e.id)}
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
      )}

      {formOpen && (
        <EventForm
          familyId={family.familyId}
          event={editing}
          defaultDate={formDate}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <RequireAuth>
      <NavBar />
      <CalendarInner />
    </RequireAuth>
  );
}
