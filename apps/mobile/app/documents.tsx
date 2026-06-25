import { useCreateDocument, useCurrentFamily, useDocuments } from "@/lib/queries";
import type { DocumentCategory } from "@niki/shared-types";
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

const CATEGORIES: DocumentCategory[] = ["general", "medical", "insurance", "tax", "receipt", "travel", "education", "property", "other"];

const CATEGORY_ICONS: Record<string, string> = {
  medical: "H",
  insurance: "I",
  tax: "T",
  receipt: "R",
  travel: "V",
  education: "E",
  property: "P",
  general: "D",
  other: "O",
};

export default function DocumentsScreen() {
  const { family } = useCurrentFamily();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: docs = [], isLoading } = useDocuments(family?.familyId, search || undefined);
  const create = useCreateDocument();

  const [name, setName] = useState("");
  const [path, setPath] = useState("Niki/");
  const [category, setCategory] = useState<DocumentCategory>("general");

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
        <Text style={styles.title}>Vault</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addBtnText}>{showForm ? "Cancel" : "Add"}</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search documents..."
        style={styles.searchInput}
      />

      {showForm && (
        <View style={styles.form}>
          <TextInput value={name} onChangeText={setName} placeholder="Document name" style={styles.input} />
          <TextInput value={path} onChangeText={setPath} placeholder="Path" style={styles.input} />
          <View style={styles.pills}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.pill, category === c && styles.pillActive]}
              >
                <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.btn, create.isPending && styles.disabled]}
            disabled={create.isPending}
            onPress={async () => {
              if (!name) return;
              await create.mutateAsync({ familyId: family!.familyId, name, path, category });
              setName(""); setShowForm(false);
            }}
          >
            <Text style={styles.btnText}>{create.isPending ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          ListEmptyComponent={<Text style={styles.muted}>No documents found.</Text>}
          contentContainerStyle={{ gap: 8, paddingBottom: 24, marginTop: 12 }}
          renderItem={({ item }) => (
            <View style={styles.docCard}>
              <View style={styles.docIcon}>
                <Text style={styles.docIconText}>{CATEGORY_ICONS[item.category] || "D"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docMeta}>
                  {item.category} - {item.path}
                </Text>
                {item.ocrStatus === "done" && (
                  <Text style={styles.ocrReady}>OCR ready</Text>
                )}
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  addBtn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, overflow: "hidden" },
  addBtnText: { color: "#fff", fontWeight: "600" },
  searchInput: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  form: { gap: 8, marginBottom: 16 },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB" },
  pillActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pillText: { color: "#4B5563", fontSize: 12 },
  pillTextActive: { color: "#fff", fontSize: 12 },
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16, marginTop: 4 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  docIconText: { fontWeight: "700", color: "#4F46E5" },
  docName: { fontWeight: "600", color: "#111827" },
  docMeta: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  ocrReady: { color: "#10B981", fontSize: 12, marginTop: 2 },
  muted: { color: "#888", textAlign: "center", marginTop: 24 },
});
