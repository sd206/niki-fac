import { useCurrentFamily, useInsights, useSendChat } from "@/lib/queries";
import type { ConversationMessage } from "@niki/shared-types";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";

const SUGGESTED = [
  "What events do we have this week?",
  "How much have we spent on food?",
  "What tasks are overdue?",
  "What are our savings goals?",
];

export default function AIChatScreen() {
  const { family } = useCurrentFamily();
  const sendChat = useSendChat();
  const { data: insights = [] } = useInsights(family?.familyId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();

  if (!family) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Create a family first.</Text>
      </View>
    );
  }

  async function send(query: string) {
    if (!query.trim() || !family) return;
    const userMsg: ConversationMessage = {
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const result = await sendChat.mutateAsync({
        familyId: family!.familyId,
        query,
        conversationId,
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [...prev, result.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error.", createdAt: new Date().toISOString() },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Niki Assistant</Text>

      {insights.length > 0 && messages.length === 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>INSIGHTS</Text>
          {insights.slice(0, 3).map((ins, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                ins.severity === "warning" && styles.insightWarning,
                ins.severity === "positive" && styles.insightPositive,
              ]}
            >
              <Text style={styles.insightTitle}>{ins.title}</Text>
              <Text style={styles.insightDetail}>{ins.detail}</Text>
            </View>
          ))}
        </View>
      )}

      {messages.length === 0 ? (
        <View style={styles.suggestions}>
          <Text style={styles.muted}>Try asking:</Text>
          {SUGGESTED.map((q) => (
            <Pressable key={q} style={styles.suggestionBtn} onPress={() => send(q)}>
              <Text style={styles.suggestionText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ gap: 8, padding: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.msgBubble, item.role === "user" ? styles.msgUser : styles.msgAI]}>
              <Text style={item.role === "user" ? styles.msgUserText : styles.msgAIText}>
                {item.content}
              </Text>
              {item.citations && item.citations.length > 0 && (
                <View style={styles.citations}>
                  {item.citations.slice(0, 3).map((c, ci) => (
                    <Text key={ci} style={styles.citationTag}>
                      {c.type}: {c.title.slice(0, 20)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}

      {sendChat.isPending && (
        <ActivityIndicator color="#4F46E5" style={{ marginBottom: 8 }} />
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Niki..."
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.btn, (!input.trim() || sendChat.isPending) && styles.disabled]}
          disabled={!input.trim() || sendChat.isPending}
          onPress={() => send(input)}
        >
          <Text style={styles.btnText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  muted: { color: "#888", marginBottom: 8 },
  insightsContainer: { marginBottom: 16 },
  insightsTitle: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  insightCard: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6 },
  insightWarning: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
  insightPositive: { backgroundColor: "#D1FAE5", borderColor: "#10B981" },
  insightTitle: { fontSize: 13, fontWeight: "600", color: "#111827" },
  insightDetail: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  suggestions: { flex: 1, justifyContent: "center" },
  suggestionBtn: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  suggestionText: { color: "#4F46E5", fontSize: 14 },
  msgBubble: { maxWidth: "85%", borderRadius: 16, padding: 12 },
  msgUser: { backgroundColor: "#4F46E5", alignSelf: "flex-end" },
  msgAI: { backgroundColor: "#F3F4F6", alignSelf: "flex-start" },
  msgUserText: { color: "#fff", fontSize: 14 },
  msgAIText: { color: "#111827", fontSize: 14 },
  citations: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  citationTag: { fontSize: 10, color: "#6B7280", backgroundColor: "#E5E7EB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inputRow: { flexDirection: "row", gap: 8, paddingBottom: 8 },
  input: { flex: 1, borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 12, maxHeight: 80 },
  btn: { backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignSelf: "flex-end" },
  btnText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
