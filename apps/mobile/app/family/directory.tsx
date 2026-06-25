import { useCurrentFamily, useMembers } from "@/lib/queries";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function FamilyDirectoryScreen() {
  const { family } = useCurrentFamily();
  const { data: members = [], isLoading } = useMembers(family?.familyId);

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
        <Text style={styles.title}>Members</Text>
        <Link href="/family/invite" style={styles.inviteBtn}>
          Invite
        </Link>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.userId}
          ListEmptyComponent={<Text style={styles.muted}>No members yet.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.displayName || item.email || "?")[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName || item.email || "Unknown"}</Text>
                {item.email && item.displayName ? (
                  <Text style={styles.email}>{item.email}</Text>
                ) : null}
              </View>
              <View style={styles.badges}>
                {item.points > 0 && (
                  <Text style={styles.points}>{item.points} pts</Text>
                )}
                <Text style={styles.role}>{item.role}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  inviteBtn: {
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
    gap: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "700", color: "#4B5563" },
  name: { fontWeight: "600", color: "#111827" },
  email: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  badges: { alignItems: "flex-end", gap: 2 },
  points: { color: "#4F46E5", fontWeight: "600", fontSize: 12 },
  role: {
    color: "#4B5563",
    fontSize: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
