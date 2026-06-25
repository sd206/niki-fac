import { signInWithApple } from "@/lib/appleSignIn";
import { useGoogleSignIn } from "@/lib/useGoogleSignIn";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export default function SignIn() {
  const google = useGoogleSignIn();
  const [appleError, setAppleError] = useState<string | null>(null);

  async function onApple() {
    setAppleError(null);
    try {
      await signInWithApple();
    } catch (e) {
      setAppleError(e instanceof Error ? e.message : "Apple sign-in failed");
    }
  }

  const error = google.error ?? appleError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Niki</Text>

      <Pressable
        style={[styles.google, (!google.ready || google.pending) && styles.disabled]}
        disabled={!google.ready || google.pending}
        onPress={google.signIn}
      >
        {google.pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.googleText}>Continue with Google</Text>
        )}
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable style={styles.apple} onPress={onApple}>
          <Text style={styles.appleText}>Continue with Apple</Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  google: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 16 },
  googleText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  apple: { backgroundColor: "#000", padding: 14, borderRadius: 16 },
  appleText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: "#EF4444", textAlign: "center" },
});
