import { useCurrentFamily, useDeleteEvent, useEvents } from "@/lib/queries";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarScreen() {
  const { family } = useCurrentFamily();
  const from = startOfDay(new Date()).toISOString();
  const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events = [], isLoading } = useEvents(family?.familyId, from, to);
  const del = useDeleteEvent();

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Link href="/event/new" style={styles.newBtn}>
          New event
        </Link>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          ListEmptyComponent={<Text style={styles.muted}>No upcoming events.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.when}>{formatWhen(item.startAt)}</Text>
              </View>
              <Pressable onPress={() => del.mutate(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  newBtn: {
    backgroundColor: "#4F46E5",
    color: "#fff",
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  eventTitle: { fontWeight: "600", color: "#111827" },
  when: { color: "#6B7280", marginTop: 2 },
  delete: { color: "#EF4444" },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
