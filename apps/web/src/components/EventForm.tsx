"use client";

import { isoToLocalInput, localInputToIso } from "@/lib/date";
import { useCreateEvent, useUpdateEvent } from "@/lib/queries";
import type { CalendarEvent } from "@niki/shared-types";
import { useState } from "react";

interface Props {
  familyId: string;
  event?: CalendarEvent;
  defaultDate?: Date;
  onClose: () => void;
}

export function EventForm({ familyId, event, defaultDate, onClose }: Props) {
  const create = useCreateEvent();
  const update = useUpdateEvent();

  const initialStart = event
    ? isoToLocalInput(event.startAt)
    : isoToLocalInput((defaultDate ?? new Date()).toISOString());

  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(event?.endAt ? isoToLocalInput(event.endAt) : "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const saving = create.isPending || update.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (event) {
        await update.mutateAsync({
          id: event.id,
          patch: {
            title,
            startAt: localInputToIso(start),
            endAt: end ? localInputToIso(end) : null,
            description: description || null,
          },
        });
      } else {
        await create.mutateAsync({
          familyId,
          title,
          startAt: localInputToIso(start),
          endAt: end ? localInputToIso(end) : undefined,
          description: description || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">
          {event ? "Edit event" : "New event"}
        </h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full rounded-card border border-gray-300 px-3 py-2"
          />
          <label className="block text-sm text-gray-600">
            Starts
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              className="mt-1 w-full rounded-card border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Ends (optional)
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-card border border-gray-300 px-3 py-2"
            />
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-card border border-gray-300 px-3 py-2"
            rows={2}
          />
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
