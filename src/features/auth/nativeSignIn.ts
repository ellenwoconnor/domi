import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

// Native sign-in sheets. Each returns the params for Convex Auth's
// signIn(provider, params), or null if the person cancelled.

type Params = Record<string, string>;

export async function appleSignInParams(): Promise<Params | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!cred.identityToken) throw new Error("Apple didn't return an identity token");
    // Apple only shares the name on the very first sign-in.
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ");
    return { idToken: cred.identityToken, nonce: rawNonce, ...(name ? { name } : {}) };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
}

let googleConfigured = false;
export async function googleSignInParams(): Promise<Params | null> {
  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    googleConfigured = true;
  }
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (res.type !== "success") return null;
  if (!res.data.idToken) throw new Error("Google didn't return an ID token");
  return { idToken: res.data.idToken, ...(res.data.user.name ? { name: res.data.user.name } : {}) };
}

export async function signOutOfProviders() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // not signed in with Google; nothing to do
  }
}
