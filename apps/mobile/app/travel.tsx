import { useCreateTrip, useCurrentFamily, useTrips } from "@/lib/queries";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";

export default function TravelScreen() {
  const { family } = useCurrentFamily();
  const { data: trips = [], isLoading } = useTrips(family?.familyId);
  const createTrip = useCreateTrip();
  const [name, setName] = useState("");
  const [dest, setDest] = useState("");

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  async function addTrip() {
    if (!name) return;
    await createTrip.mutateAsync({
      familyId: family!.familyId,
      name,
      destination: dest || undefined,
    });
    setName(""); setDest("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Travel</Text>

      <View style={styles.addRow}>
        <TextInput value={name} onChangeText={setName} placeholder="Trip name" style={styles.input} />
        <TextInput value={dest} onChangeText={setDest} placeholder="Destination" style={styles.input} />
        <Pressable style={[styles.btn, createTrip.isPending && styles.disabled]} disabled={createTrip.isPending} onPress={addTrip}>
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={<Text style={styles.muted}>No trips planned yet.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24, marginTop: 16 }}
          renderItem={({ item }) => (
            <Link href={`/travel/${item.id}`} key={item.id} style={styles.tripCard}>
              <Text style={styles.tripName}>{item.name}</Text>
              <Text style={styles.tripMeta}>
                {item.destination || "No destination"}
                {item.startDate ? ` - from ${new Date(item.startDate).toLocaleDateString()}` : ""}
                {item.budget ? ` - $${Number(item.budget).toFixed(2)}` : ""}
              </Text>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: { flex: 1, borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12 },
  btn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  btnText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  tripCard: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
  },
  tripName: { fontWeight: "700", color: "#111827", fontSize: 16 },
  tripMeta: { color: "#6B7280", fontSize: 12, marginTop: 4 },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
