import { useCreateTask, useCurrentFamily } from "@/lib/queries";
import type { TaskPriority, TaskType } from "@niki/shared-types";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const TYPES: TaskType[] = ["personal", "family", "chore"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NewTaskScreen() {
  const { family } = useCurrentFamily();
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<TaskType>("family");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [points, setPoints] = useState("0");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!family) {
      setError("No family selected");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    try {
      await create.mutateAsync({
        familyId: family.familyId,
        title,
        type,
        priority,
        points: Number(points) || 0,
        dueAt: date ? new Date(date + "T09:00").toISOString() : undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New task</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        style={styles.input}
      />
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="Due date (YYYY-MM-DD, optional)"
        autoCapitalize="none"
        style={styles.input}
      />
      <Text style={styles.label}>Type</Text>
      <View style={styles.pills}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[styles.pill, type === t && styles.pillActive]}
          >
            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Priority</Text>
      <View style={styles.pills}>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPriority(p)}
            style={[styles.pill, priority === p && styles.pillActive]}
          >
            <Text style={[styles.pillText, priority === p && styles.pillTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={points}
        onChangeText={setPoints}
        placeholder="Points"
        keyboardType="numeric"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.btn, create.isPending && styles.disabled]}
        disabled={create.isPending}
        onPress={onSubmit}
      >
        <Text style={styles.btnText}>{create.isPending ? "Saving..." : "Save"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#4B5563", marginTop: 4 },
  pills: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "#D1D5DB" },
  pillActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pillText: { color: "#4B5563" },
  pillTextActive: { color: "#fff" },
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: "#EF4444" },
});
