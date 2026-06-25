import { apiFetch } from "@/lib/api";
import type { Family } from "@niki/shared-types";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function CreateFamily() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await apiFetch<Family>("/api/v1/families", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.replace("/home");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your family</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Family name"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} disabled={submitting} onPress={onSubmit}>
        <Text style={styles.btnText}>{submitting ? "Creating..." : "Create Family"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 14 },
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  error: { color: "#EF4444" },
});
