import { logout } from "@/lib/useAuth";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const BENEFITS = [
  "Organize Family Life",
  "Manage Finances",
  "Secure Documents",
  "AI Family Assistant",
];

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Niki</Text>
      <Text style={styles.tagline}>Your Family Operating System</Text>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitCard}>
            <Text>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Link href="/home" style={styles.primaryBtn}>
          Go to Dashboard
        </Link>
        <Link href="/family/create" style={styles.secondaryBtn}>
          Create Family
        </Link>
        <Link href="/family/join" style={styles.secondaryBtn}>
          Join Family
        </Link>
        <Pressable onPress={() => logout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#fff" },
  brand: { fontSize: 40, fontWeight: "700", color: "#4F46E5", textAlign: "center" },
  tagline: { fontSize: 20, fontWeight: "600", textAlign: "center", marginTop: 8 },
  benefits: { marginTop: 32, gap: 8 },
  benefitCard: {
    backgroundColor: "#F5F5FF",
    padding: 14,
    borderRadius: 16,
  },
  actions: { marginTop: 40, gap: 12 },
  primaryBtn: {
    backgroundColor: "#4F46E5",
    color: "#fff",
    textAlign: "center",
    padding: 14,
    borderRadius: 16,
    fontWeight: "600",
    overflow: "hidden",
  },
  secondaryBtn: {
    borderColor: "#4F46E5",
    borderWidth: 1,
    color: "#4F46E5",
    textAlign: "center",
    padding: 14,
    borderRadius: 16,
    fontWeight: "600",
    overflow: "hidden",
  },
  signOut: { textAlign: "center", color: "#4F46E5", marginTop: 8 },
});
