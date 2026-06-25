import { useAuth } from "@/lib/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const AUTH_GROUP = "(auth)";

/**
 * Redirects based on auth state:
 * - unauthenticated users are sent to the sign-in screen
 * - authenticated users are kept out of the auth group
 */
function useAuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === AUTH_GROUP;

    if (!user && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  return { loading };
}

function RootNavigator() {
  const { loading } = useAuthGate();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="auto" />
      <RootNavigator />
    </QueryClientProvider>
  );
}
