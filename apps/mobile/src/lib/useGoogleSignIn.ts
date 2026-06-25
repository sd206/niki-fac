import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

// Required so the auth popup/redirect can complete on native.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleSignInState {
  ready: boolean;
  pending: boolean;
  error: string | null;
  signIn: () => void;
}

/**
 * Native Google sign-in via expo-auth-session. The returned Google ID token is
 * exchanged for a Firebase credential so the rest of the app uses Firebase auth.
 */
export function useGoogleSignIn(): GoogleSignInState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (!idToken) {
        setError("No ID token returned from Google");
        setPending(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed"))
        .finally(() => setPending(false));
    } else if (response.type === "error") {
      setError(response.error?.message ?? "Google sign-in error");
      setPending(false);
    } else if (response.type === "dismiss" || response.type === "cancel") {
      setPending(false);
    }
  }, [response]);

  return {
    ready: Boolean(request),
    pending,
    error,
    signIn: () => {
      setError(null);
      setPending(true);
      void promptAsync();
    },
  };
}
