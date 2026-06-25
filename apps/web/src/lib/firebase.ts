import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

const emulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
if (emulatorUrl) {
  connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithApple() {
  return signInWithPopup(auth, new OAuthProvider("apple.com"));
}

export async function logout() {
  return signOut(auth);
}
