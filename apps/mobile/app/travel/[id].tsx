import { useCreatePackingItem, useCreateReservation, useCurrentFamily, usePackingItems, useReservations, useTrips } from "@/lib/queries";
import type { ReservationType } from "@niki/shared-types";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";

const RES_TYPES: ReservationType[] = ["flight", "hotel", "car", "restaurant", "activity", "other"];

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { family } = useCurrentFamily();
  const { data: trips = [] } = useTrips(family?.familyId);
  const trip = trips.find((t) => t.id === id);

  const { data: reservations = [], isLoading: resLoading } = useReservations(trip?.id);
  const { data: packing = [], isLoading: packLoading } = usePackingItems(trip?.id);
  const createRes = useCreateReservation();
  const createPack = useCreatePackingItem();

  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState<ReservationType>("flight");
  const [packName, setPackName] = useState("");

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Trip not found.</Text>
      </View>
    );
  }

  const totalCost = reservations.reduce((s, r) => s + Number(r.cost ?? 0), 0);

  async function addRes() {
    if (!resTitle || !trip) return;
    await createRes.mutateAsync({ tripId: trip.id, type: resType, title: resTitle });
    setResTitle("");
  }

  async function addPack() {
    if (!packName || !trip) return;
    await createPack.mutateAsync({ tripId: trip.id, name: packName });
    setPackName("");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Text style={styles.title}>{trip.name}</Text>
      <Text style={styles.meta}>
        {trip.destination || "No destination"}
        {trip.budget ? ` - budget $${Number(trip.budget).toFixed(2)}` : ""}
      </Text>
      <Text style={styles.costSummary}>Total reservations: ${totalCost.toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Reservations</Text>
      <View style={styles.addRow}>
        <View style={styles.pills}>
          {RES_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setResType(t)}
              style={[styles.pill, resType === t && styles.pillActive]}
            >
              <Text style={[styles.pillText, resType === t && styles.pillTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={resTitle} onChangeText={setResTitle} placeholder="Title" style={styles.input} />
        <Pressable style={styles.btn} onPress={addRes}>
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>
      {resLoading ? (
        <ActivityIndicator color="#4F46E5" />
      ) : reservations.length === 0 ? (
        <Text style={styles.muted}>No reservations yet.</Text>
      ) : (
        reservations.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardTitle}>{r.title}</Text>
            <Text style={styles.cardMeta}>
              {r.type}
              {r.provider ? ` - ${r.provider}` : ""}
              {r.cost ? ` - $${Number(r.cost).toFixed(2)}` : ""}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Packing List</Text>
      <View style={styles.addRow}>
        <TextInput value={packName} onChangeText={setPackName} placeholder="Item name" style={styles.input} />
        <Pressable style={styles.btn} onPress={addPack}>
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>
      {packLoading ? (
        <ActivityIndicator color="#4F46E5" />
      ) : packing.length === 0 ? (
        <Text style={styles.muted}>No packing items yet.</Text>
      ) : (
        packing.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={[styles.cardTitle, item.status === "packed" && styles.packed]}>
              {item.status === "packed" ? "v  " : "o  "}{item.name}
            </Text>
            {item.category && <Text style={styles.cardMeta}>{item.category}</Text>}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  meta: { color: "#6B7280", fontSize: 14, marginTop: 4 },
  costSummary: { color: "#4F46E5", fontSize: 14, fontWeight: "600", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginTop: 24, marginBottom: 8 },
  addRow: { gap: 8, marginBottom: 8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB" },
  pillActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pillText: { color: "#4B5563", fontSize: 12 },
  pillTextActive: { color: "#fff", fontSize: 12 },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12 },
  btn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignSelf: "flex-start" },
  btnText: { color: "#fff", fontWeight: "600" },
  card: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: "600", color: "#111827" },
  cardMeta: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  packed: { textDecorationLine: "line-through", color: "#9CA3AF" },
  muted: { color: "#888" },
});
