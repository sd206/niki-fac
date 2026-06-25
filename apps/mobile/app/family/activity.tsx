import { useActivity, useCurrentFamily } from "@/lib/queries";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

export default function ActivityScreen() {
  const { family } = useCurrentFamily();
  const { data: activity = [], isLoading } = useActivity(family?.familyId, 50);

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={activity}
          keyExtractor={(a) => a.id}
          ListEmptyComponent={<Text style={styles.muted}>No activity yet.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24, marginTop: 16 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.actorName || "?")[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.action}>
                  <Text style={styles.actor}>{item.actorName || "Someone"}</Text>{" "}
                  {item.action} {item.entity}
                </Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
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
  title: { fontSize: 24, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "700", color: "#4F46E5", fontSize: 12 },
  action: { fontSize: 14, color: "#111827" },
  actor: { fontWeight: "600" },
  time: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
