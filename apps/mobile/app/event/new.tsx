import { useCreateEvent, useCurrentFamily } from "@/lib/queries";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function defaultDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function defaultTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewEventScreen() {
  const { family } = useCurrentFamily();
  const create = useCreateEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState(defaultTime());
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!family) {
      setError("No family selected");
      return;
    }
    const startAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startAt.getTime())) {
      setError("Use date YYYY-MM-DD and time HH:MM");
      return;
    }
    try {
      await create.mutateAsync({
        familyId: family.familyId,
        title,
        startAt: startAt.toISOString(),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create event");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New event</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        style={styles.input}
      />
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        value={time}
        onChangeText={setTime}
        placeholder="HH:MM"
        autoCapitalize="none"
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
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: "#EF4444" },
});
