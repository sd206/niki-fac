import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from "firebase/auth";
// getReactNativePersistence ships in firebase's React Native entry (index.rn),
// which Metro resolves at runtime, but it is absent from the web type defs.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- present at runtime via the react-native export condition
import { getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * initializeAuth must run exactly once. On fast refresh it may already be
 * initialized, so fall back to getAuth.
 */
function resolveAuth(): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth: Auth = resolveAuth();

const emulatorUrl = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
if (emulatorUrl) {
  connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
}
