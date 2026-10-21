import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

// Verifies ID tokens that Apple and Google issue to the app's native sign-in
// sheets, so Convex Auth can trust them without a browser redirect.

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** The iOS bundle id; Apple puts it in the token's `aud`. */
export const APPLE_AUDIENCE = "com.ellenwoconnor.domi";

export type VerifiedIdentity = {
  sub: string; // stable per-provider user id
  email?: string;
  emailVerified: boolean;
};

export async function sha256Hex(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAppleIdToken(
  idToken: string,
  rawNonce: string,
  keys: JWTVerifyGetKey = APPLE_JWKS, // injectable for tests
): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: "https://appleid.apple.com",
    audience: APPLE_AUDIENCE,
  });
  // The app sends Apple sha256(rawNonce) and sends us the raw nonce, so a
  // stolen token can't be replayed without the nonce that went with it.
  if (payload.nonce !== (await sha256Hex(rawNonce))) {
    throw new Error("Apple sign-in nonce mismatch");
  }
  return identity(payload);
}

export async function verifyGoogleIdToken(
  idToken: string,
  keys: JWTVerifyGetKey = GOOGLE_JWKS, // injectable for tests
): Promise<VerifiedIdentity> {
  const audience = [process.env.AUTH_GOOGLE_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(
    (a): a is string => !!a,
  );
  if (audience.length === 0) throw new Error("AUTH_GOOGLE_ID is not set on the Convex deployment");
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
  });
  return identity(payload);
}

function identity(payload: JWTPayload): VerifiedIdentity {
  if (!payload.sub) throw new Error("ID token has no subject");
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const verified = payload.email_verified === true || payload.email_verified === "true";
  return { sub: payload.sub, email, emailVerified: verified };
}
