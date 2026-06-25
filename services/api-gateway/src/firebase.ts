import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Initializes the Firebase Admin SDK exactly once, supporting three modes:
 *
 * 1. Emulator (local dev): FIREBASE_AUTH_EMULATOR_HOST is set. No credentials
 *    are required; the Admin SDK talks to the local Auth emulator. Uses
 *    FIREBASE_PROJECT_ID (default "demo-niki").
 * 2. Service account: FIREBASE_SERVICE_ACCOUNT holds the JSON key (single line).
 * 3. Application Default Credentials: used on Cloud Run / when neither is set.
 */
export function initFirebase(): void {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (emulatorHost) {
    initializeApp({ projectId: projectId ?? "demo-niki" });
    return;
  }

  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)), projectId });
    return;
  }

  initializeApp({ credential: applicationDefault(), projectId });
}

export function firebaseAuth() {
  initFirebase();
  return getAuth();
}
