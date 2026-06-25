export type ReservationType =
  | "flight"
  | "hotel"
  | "car"
  | "restaurant"
  | "activity"
  | "other";

export type PackingStatus = "not_packed" | "packed";

export interface Trip {
  id: string;
  familyId: string;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateTripRequest {
  familyId: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  notes?: string;
}

export interface UpdateTripRequest {
  name?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | null;
  notes?: string | null;
}

export interface Reservation {
  id: string;
  tripId: string;
  type: ReservationType;
  title: string;
  provider: string | null;
  confirmationCode: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  cost: string | null;
  notes: string | null;
  documentId: string | null;
  createdAt: string;
}

export interface CreateReservationRequest {
  tripId: string;
  type: ReservationType;
  title: string;
  provider?: string;
  confirmationCode?: string;
  startDateTime?: string;
  endDateTime?: string;
  cost?: string;
  notes?: string;
  documentId?: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: string | null;
  assigneeId: string | null;
  status: PackingStatus;
  createdAt: string;
}

export interface CreatePackingItemRequest {
  tripId: string;
  name: string;
  category?: string;
  assigneeId?: string;
}

export interface UpdatePackingItemRequest {
  name?: string;
  category?: string | null;
  status?: PackingStatus;
}
