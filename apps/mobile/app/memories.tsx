import { useCreateMemory, useCurrentFamily, useDeleteMemory, useMemories } from "@/lib/queries";
import type { MemoryType } from "@niki/shared-types";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";

const MEMORY_TYPES: MemoryType[] = [
  "preference",
  "goal",
  "habit",
  "fact",
  "event_summary",
  "travel_pattern",
  "financial_pattern",
];

export default function MemoriesScreen() {
  const { family } = useCurrentFamily();
  const { data: memories = [] } = useMemories(family?.familyId);
  const createMemory = useCreateMemory();
  const delMemory = useDeleteMemory();

  const [content, setContent] = useState("");
  const [type, setType] = useState<MemoryType>("preference");

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  async function add() {
    if (!content) return;
    await createMemory.mutateAsync({ familyId: family!.familyId, type, content });
    setContent("");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family Memory</Text>
      <Text style={styles.subtitle}>Store preferences, goals, and facts for the AI assistant.</Text>

      <View style={styles.form}>
        <ScrollView horizontal style={styles.typeScroll}>
          <View style={styles.typeRow}>
            {MEMORY_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.typePill, type === t && styles.typePillActive]}
              >
                <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>
                  {t.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="e.g., We prefer vegetarian meals on weekdays"
          style={styles.input}
          multiline
        />
        <Pressable style={styles.btn} onPress={add}>
          <Text style={styles.btnText}>Save memory</Text>
        </Pressable>
      </View>

      <FlatList
        data={memories}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text style={styles.muted}>No memories yet.</Text>}
        contentContainerStyle={{ gap: 8, paddingBottom: 24, marginTop: 16 }}
        renderItem={({ item }) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardType}>{item.type.replace("_", " ")}</Text>
              <Pressable onPress={() => delMemory.mutate(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
            <Text style={styles.cardContent}>{item.content}</Text>
            <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#6B7280", fontSize: 14, marginTop: 4, marginBottom: 16 },
  form: { gap: 8, marginBottom: 8 },
  typeScroll: { flexGrow: 0 },
  typeRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB" },
  typePillActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  typePillText: { color: "#4B5563", fontSize: 12 },
  typePillTextActive: { color: "#fff", fontSize: 12 },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 50 },
  btn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignSelf: "flex-start" },
  btnText: { color: "#fff", fontWeight: "600" },
  card: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardType: { fontSize: 12, fontWeight: "600", color: "#4F46E5", textTransform: "capitalize" },
  delete: { color: "#EF4444", fontSize: 12 },
  cardContent: { color: "#111827", fontSize: 14 },
  cardDate: { color: "#9CA3AF", fontSize: 12, marginTop: 4 },
  muted: { color: "#888" },
});
