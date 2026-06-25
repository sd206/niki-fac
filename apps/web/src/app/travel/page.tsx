"use client";

import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import {
  useCreatePackingItem,
  useCreateReservation,
  useCreateTrip,
  useCurrentFamily,
  useDeletePackingItem,
  useDeleteReservation,
  useDeleteTrip,
  usePackingItems,
  useReservations,
  useTrips,
  useUpdatePackingItem,
} from "@/lib/queries";
import type { PackingItem, Reservation, ReservationType, Trip } from "@niki/shared-types";
import { useState } from "react";

const RES_TYPES: ReservationType[] = ["flight", "hotel", "car", "restaurant", "activity", "other"];
const RES_ICONS: Record<ReservationType, string> = {
  flight: "\u{2708}",
  hotel: "\u{1F3E8}",
  car: "\u{1F697}",
  restaurant: "\u{1F374}",
  activity: "\u{1F3C0}",
  other: "\u{1F4C4}",
};

function TravelInner() {
  const { family } = useCurrentFamily();
  const { data: trips = [] } = useTrips(family?.familyId);
  const createTrip = useCreateTrip();
  const delTrip = useDeleteTrip();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripName, setTripName] = useState("");
  const [tripDest, setTripDest] = useState("");

  if (!family) {
    return <div className="p-8 text-gray-600">No family yet. Create one from the home screen first.</div>;
  }

  async function addTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!tripName) return;
    const trip = await createTrip.mutateAsync({
      familyId: family!.familyId,
      name: tripName,
      destination: tripDest || undefined,
    });
    setTripName(""); setTripDest("");
    setSelectedTrip(trip);
  }

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  return (
    <div>
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Travel</h1>
      </div>

      <form onSubmit={addTrip} className="mx-6 mb-4 flex gap-2">
        <input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Trip name" className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm" />
        <input value={tripDest} onChange={(e) => setTripDest(e.target.value)} placeholder="Destination" className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add trip</button>
      </form>

      <div className="px-6 pb-8">
        {trips.length === 0 ? (
          <p className="text-gray-500">No trips planned yet.</p>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-card border border-gray-200 p-3 cursor-pointer hover:border-primary"
                onClick={() => setSelectedTrip(t)}
              >
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">
                    {t.destination || "No destination"}
                    {t.startDate && ` - from ${new Date(t.startDate).toLocaleDateString()}`}
                    {t.budget && ` - budget $${Number(t.budget).toFixed(2)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary text-sm">Open</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); delTrip.mutate(t.id); }}
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
    </div>
  );
}

function TripDetail({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const { data: reservations = [] } = useReservations(trip.id);
  const { data: packing = [] } = usePackingItems(trip.id);
  const createRes = useCreateReservation();
  const delRes = useDeleteReservation();
  const createPack = useCreatePackingItem();
  const updatePack = useUpdatePackingItem();
  const delPack = useDeletePackingItem();

  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState<ReservationType>("flight");
  const [packName, setPackName] = useState("");

  async function addRes(e: React.FormEvent) {
    e.preventDefault();
    if (!resTitle) return;
    await createRes.mutateAsync({ tripId: trip.id, type: resType, title: resTitle });
    setResTitle("");
  }

  async function addPack(e: React.FormEvent) {
    e.preventDefault();
    if (!packName) return;
    await createPack.mutateAsync({ tripId: trip.id, name: packName });
    setPackName("");
  }

  const totalCost = reservations.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  const packedCount = packing.filter((p) => p.status === "packed").length;

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4">
        <button onClick={onBack} className="text-sm text-primary">Back</button>
        <h1 className="text-xl font-bold text-gray-900">{trip.name}</h1>
      </div>

      <div className="px-6 pb-2 text-sm text-gray-500">
        {trip.destination && <span>Destination: {trip.destination} - </span>}
        {trip.budget && <span>Budget: ${Number(trip.budget).toFixed(2)} - </span>}
        <span>Total reservations cost: ${totalCost.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 px-6 pb-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Reservations</h2>
          <form onSubmit={addRes} className="mb-3 flex gap-2">
            <select value={resType} onChange={(e) => setResType(e.target.value as ReservationType)} className="rounded-card border border-gray-300 px-2 py-2 text-sm">
              {RES_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="Title" className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add</button>
          </form>
          <ul className="space-y-2">
            {reservations.map((r: Reservation) => (
              <li key={r.id} className="flex items-center justify-between rounded-card border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{RES_ICONS[r.type]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      {r.type}
                      {r.provider && ` - ${r.provider}`}
                      {r.confirmationCode && ` - ${r.confirmationCode}`}
                      {r.cost && ` - $${Number(r.cost).toFixed(2)}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => delRes.mutate(r.id)} className="text-xs text-danger">Delete</button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Packing List ({packedCount}/{packing.length})</h2>
          <form onSubmit={addPack} className="mb-3 flex gap-2">
            <input value={packName} onChange={(e) => setPackName(e.target.value)} placeholder="Item name" className="flex-1 rounded-card border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white">Add</button>
          </form>
          <ul className="space-y-1">
            {packing.map((item: PackingItem) => (
              <li key={item.id} className="flex items-center justify-between rounded-card border border-gray-200 p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.status === "packed"}
                    onChange={() => updatePack.mutate({
                      id: item.id,
                      patch: { status: item.status === "packed" ? "not_packed" : "packed" },
                    })}
                    className="h-4 w-4"
                  />
                  <span className={`text-sm ${item.status === "packed" ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {item.name}
                    {item.category && <span className="ml-2 text-xs text-gray-400">{item.category}</span>}
                  </span>
                </div>
                <button onClick={() => delPack.mutate(item.id)} className="text-xs text-danger">Delete</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function TravelPage() {
  return (
    <RequireAuth>
      <NavBar />
      <TravelInner />
    </RequireAuth>
  );
}
