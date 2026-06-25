import type { AIConversation, AuditLogEntry, Budget, BudgetWithSpent, CalendarEvent, ChatRequest, ChatResponse, CreateBudgetRequest, CreateDocumentRequest, CreateEventRequest, CreateExpenseRequest, CreateMealRequest, CreateMemoryRequest, CreatePackingItemRequest, CreateRecipeRequest, CreateReservationRequest, CreateSavingsGoalRequest, CreateShoppingItemRequest, CreateTaskRequest, CreateTripRequest, Document, Expense, FamilyMemberWithUser, Insight, InvitationWithDetails, Meal, Memory, Notification, PackingItem, Recipe, Reservation, SavingsGoal, ShoppingListItem, Task, Trip, UpdateEventRequest, UpdatePackingItemRequest, UpdateSavingsGoalRequest, UpdateShoppingItemRequest, UpdateTaskRequest } from "@niki/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export interface FamilySummary {
  familyId: string;
  role: string;
  name: string;
}

export function useFamilies() {
  return useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const res = await apiFetch<FamilySummary[]>("/api/v1/families");
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCurrentFamily() {
  const { data, ...rest } = useFamilies();
  return { family: data?.[0] ?? null, families: data ?? [], ...rest };
}

export function useEvents(familyId: string | undefined, from?: string, to?: string) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["events", familyId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await apiFetch<CalendarEvent[]>(`/api/v1/calendar/events?${params}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventRequest) => {
      const res = await apiFetch<CalendarEvent>("/api/v1/calendar/events", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/calendar/events/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useTasks(familyId: string | undefined, status?: string) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["tasks", familyId, status],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! });
      if (status) params.set("status", status);
      const res = await apiFetch<Task[]>(`/api/v1/tasks/tasks?${params}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskRequest) => {
      const res = await apiFetch<Task>("/api/v1/tasks/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTaskRequest }) => {
      const res = await apiFetch<Task>(`/api/v1/tasks/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/tasks/tasks/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// ---- Members ----

export function useMembers(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["members", familyId],
    queryFn: async () => {
      const res = await apiFetch<FamilyMemberWithUser[]>(
        `/api/v1/families/${familyId}/members`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

// ---- Invitations ----

export function useInvitations(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["invitations", familyId],
    queryFn: async () => {
      const res = await apiFetch<InvitationWithDetails[]>(
        `/api/v1/families/${familyId}/invitations`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      familyId: string;
      channel: "email" | "sms" | "link";
      destination?: string;
      role: string;
    }) => {
      const { familyId, ...body } = input;
      const res = await apiFetch<InvitationWithDetails>(
        `/api/v1/families/${familyId}/invitations`,
        { method: "POST", body: JSON.stringify(body) },
      );
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

// ---- Activity ----

export function useActivity(familyId: string | undefined, limit = 20) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["activity", familyId, limit],
    queryFn: async () => {
      const res = await apiFetch<AuditLogEntry[]>(
        `/api/v1/families/${familyId}/activity?limit=${limit}`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

// ---- Notifications ----

export function useNotifications(familyId: string | undefined, unreadOnly = false) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["notifications", familyId, unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! });
      if (unreadOnly) params.set("unreadOnly", "true");
      const res = await apiFetch<Notification[]>(
        `/api/v1/notifications/?${params}`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

// ---- Finance: Budgets ----

export function useBudgets(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["budgets", familyId],
    queryFn: async () => {
      const res = await apiFetch<BudgetWithSpent[]>(
        `/api/v1/finance/budgets?familyId=${familyId}`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetRequest) => {
      const res = await apiFetch<Budget>("/api/v1/finance/budgets", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

// ---- Finance: Expenses ----

export function useExpenses(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["expenses", familyId],
    queryFn: async () => {
      const res = await apiFetch<Expense[]>(
        `/api/v1/finance/expenses?familyId=${familyId}`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseRequest) => {
      const res = await apiFetch<Expense>("/api/v1/finance/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", "budgets"] }),
  });
}

// ---- Finance: Savings Goals ----

export function useSavingsGoals(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["savingsGoals", familyId],
    queryFn: async () => {
      const res = await apiFetch<SavingsGoal[]>(
        `/api/v1/finance/savings-goals?familyId=${familyId}`,
      );
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSavingsGoalRequest) => {
      const res = await apiFetch<SavingsGoal>("/api/v1/finance/savings-goals", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["savingsGoals"] }),
  });
}

// ---- Documents ----

export function useDocuments(familyId: string | undefined, search?: string) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["documents", familyId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! });
      if (search) params.set("search", search);
      const res = await apiFetch<Document[]>(`/api/v1/documents/?${params}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDocumentRequest) => {
      const res = await apiFetch<Document>("/api/v1/documents/", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

// ---- Meals ----

export function useMeals(familyId: string | undefined, from?: string, to?: string) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["meals", familyId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await apiFetch<Meal[]>(`/api/v1/meals/meals?${params}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMealRequest) => {
      const res = await apiFetch<Meal>("/api/v1/meals/meals", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });
}

export function useShoppingList(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["shoppingList", familyId],
    queryFn: async () => {
      const res = await apiFetch<ShoppingListItem[]>(`/api/v1/meals/shopping-list?familyId=${familyId}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShoppingItemRequest) => {
      const res = await apiFetch<ShoppingListItem>("/api/v1/meals/shopping-list", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shoppingList"] }),
  });
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/meals/shopping-list/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shoppingList"] }),
  });
}

// ---- Travel ----

export function useTrips(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["trips", familyId],
    queryFn: async () => {
      const res = await apiFetch<Trip[]>(`/api/v1/travel/trips?familyId=${familyId}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTripRequest) => {
      const res = await apiFetch<Trip>("/api/v1/travel/trips", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useReservations(tripId: string | undefined) {
  return useQuery({
    enabled: Boolean(tripId),
    queryKey: ["reservations", tripId],
    queryFn: async () => {
      const res = await apiFetch<Reservation[]>(`/api/v1/travel/trips/${tripId}/reservations`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReservationRequest) => {
      const res = await apiFetch<Reservation>(`/api/v1/travel/trips/${input.tripId}/reservations`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });
}

export function usePackingItems(tripId: string | undefined) {
  return useQuery({
    enabled: Boolean(tripId),
    queryKey: ["packing", tripId],
    queryFn: async () => {
      const res = await apiFetch<PackingItem[]>(`/api/v1/travel/trips/${tripId}/packing`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreatePackingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePackingItemRequest) => {
      const res = await apiFetch<PackingItem>(`/api/v1/travel/trips/${input.tripId}/packing`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packing"] }),
  });
}

// ---- AI ----

export function useInsights(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["insights", familyId],
    queryFn: async () => {
      const res = await apiFetch<Insight[]>(`/api/v1/ai/insights?familyId=${familyId}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChatRequest) => {
      const res = await apiFetch<ChatResponse>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useMemories(familyId: string | undefined) {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ["memories", familyId],
    queryFn: async () => {
      const res = await apiFetch<Memory[]>(`/api/v1/ai/memories?familyId=${familyId}`);
      if (res.error) throw new Error(res.error.message);
      return res.data ?? [];
    },
  });
}

export function useCreateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMemoryRequest) => {
      const res = await apiFetch<Memory>("/api/v1/ai/memories", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
}

export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/ai/memories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
}
