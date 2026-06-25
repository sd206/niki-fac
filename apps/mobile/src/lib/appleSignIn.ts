import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential, type UserCredential } from "firebase/auth";
import { auth } from "./firebase";

function randomNonce(byteLength = 16): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Native Apple sign-in. A SHA-256 hashed nonce is sent to Apple while the raw
 * nonce is passed to Firebase so it can verify the identity token.
 */
export async function signInWithApple(): Promise<UserCredential> {
  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error("Apple did not return an identity token");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCredential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });

  return signInWithCredential(auth, firebaseCredential);
}
