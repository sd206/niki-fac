import { useCreateInvitation, useCurrentFamily } from "@/lib/queries";
import type { FamilyRole } from "@niki/shared-types";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const ROLES: FamilyRole[] = ["parent", "adult", "child", "guest"];
const CHANNELS = ["link", "email", "sms"] as const;

export default function InviteScreen() {
  const { family } = useCurrentFamily();
  const create = useCreateInvitation();
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("link");
  const [destination, setDestination] = useState("");
  const [role, setRole] = useState<FamilyRole>("adult");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setToken(null);
    if (!family) return;
    if (channel !== "link" && !destination.trim()) {
      setError("Destination required for email/SMS");
      return;
    }
    try {
      const result = await create.mutateAsync({
        familyId: family.familyId,
        channel,
        destination: channel === "link" ? undefined : destination,
        role,
      });
      setToken(result.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invitation");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite a member</Text>

      {token ? (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenLabel}>Invitation code:</Text>
          <Text style={styles.token}>{token}</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Channel</Text>
          <View style={styles.pills}>
            {CHANNELS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setChannel(c)}
                style={[styles.pill, channel === c && styles.pillActive]}
              >
                <Text style={[styles.pillText, channel === c && styles.pillTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          {channel !== "link" && (
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder={channel === "email" ? "Email address" : "Phone number"}
              style={styles.input}
              autoCapitalize="none"
            />
          )}

          <Text style={styles.label}>Role</Text>
          <View style={styles.pills}>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.pill, role === r && styles.pillActive]}
              >
                <Text style={[styles.pillText, role === r && styles.pillTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.btn, create.isPending && styles.disabled]}
            disabled={create.isPending}
            onPress={onSubmit}
          >
            <Text style={styles.btnText}>
              {create.isPending ? "Creating..." : "Create invite"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: "#4B5563", marginTop: 4 },
  input: { borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 16, padding: 14 },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: "#D1D5DB" },
  pillActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pillText: { color: "#4B5563" },
  pillTextActive: { color: "#fff" },
  btn: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16, marginTop: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: "#EF4444" },
  tokenBox: { gap: 12, marginTop: 16 },
  tokenLabel: { fontSize: 16, fontWeight: "600", color: "#4B5563" },
  token: { fontSize: 14, color: "#4F46E5", backgroundColor: "#F5F5FF", padding: 16, borderRadius: 16 },
});
