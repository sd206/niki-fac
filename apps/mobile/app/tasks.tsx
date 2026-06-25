import { useCurrentFamily, useDeleteTask, useTasks, useUpdateTask } from "@/lib/queries";
import type { TaskStatus } from "@niki/shared-types";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function TasksScreen() {
  const { family } = useCurrentFamily();
  const { data: tasks = [], isLoading } = useTasks(family?.familyId, "open");
  const del = useDeleteTask();
  const update = useUpdateTask();

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  function toggleComplete(id: string, currentStatus: string) {
    const newStatus: TaskStatus = currentStatus === "completed" ? "open" : "completed";
    update.mutate({ id, patch: { status: newStatus } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Link href="/task/new" style={styles.newBtn}>
          New task
        </Link>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={<Text style={styles.muted}>No open tasks.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() => toggleComplete(item.id, item.status)}
                style={styles.checkbox}
              >
                <Text style={styles.checkmark}>
                  {item.status === "completed" ? "x" : ""}
                </Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.taskTitle,
                    item.status === "completed" && styles.completed,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {STATUS_LABELS[item.status]} - {item.priority}
                  {item.dueAt ? ` - due ${formatWhen(item.dueAt)}` : ""}
                  {item.points > 0 ? ` - +${item.points} pts` : ""}
                </Text>
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
    gap: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#4F46E5",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: { fontWeight: "700", color: "#4F46E5" },
  taskTitle: { fontWeight: "600", color: "#111827" },
  completed: { textDecorationLine: "line-through", color: "#9CA3AF" },
  meta: { color: "#6B7280", marginTop: 2, fontSize: 12 },
  delete: { color: "#EF4444" },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
