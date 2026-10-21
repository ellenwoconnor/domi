/// <reference types="vite/client" />
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, test } from "vitest";
import { APPLE_AUDIENCE, sha256Hex, verifyAppleIdToken, verifyGoogleIdToken } from "./idTokens";

// Stand-in for Apple's / Google's signing keys.
let privateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "test", alg: "RS256" }] });
  otherPrivateKey = (await generateKeyPair("RS256")).privateKey;
});

function token(claims: Record<string, unknown>, opts: { key?: CryptoKey; iss: string; aud: string; exp?: string }) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(opts.iss)
    .setAudience(opts.aud)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "5m")
    .sign(opts.key ?? privateKey);
}

describe("Apple ID tokens", () => {
  const iss = "https://appleid.apple.com";

  test("accepts a valid token with the matching nonce", async () => {
    const raw = "nonce-123";
    const t = await token({ sub: "apple-user-1", email: "a@privaterelay.appleid.com", email_verified: "true", nonce: await sha256Hex(raw) }, { iss, aud: APPLE_AUDIENCE });
    const who = await verifyAppleIdToken(t, raw, keys);
    expect(who).toEqual({ sub: "apple-user-1", email: "a@privaterelay.appleid.com", emailVerified: true });
  });

  test("rejects a nonce mismatch (replayed token)", async () => {
    const t = await token({ sub: "u", nonce: await sha256Hex("original") }, { iss, aud: APPLE_AUDIENCE });
    await expect(verifyAppleIdToken(t, "different", keys)).rejects.toThrow(/nonce/);
  });

  test("rejects a token issued for another app", async () => {
    const t = await token({ sub: "u", nonce: await sha256Hex("n") }, { iss, aud: "com.someone.else" });
    await expect(verifyAppleIdToken(t, "n", keys)).rejects.toThrow();
  });

  test("rejects a token not signed by Apple", async () => {
    const t = await token({ sub: "u", nonce: await sha256Hex("n") }, { iss, aud: APPLE_AUDIENCE, key: otherPrivateKey });
    await expect(verifyAppleIdToken(t, "n", keys)).rejects.toThrow();
  });

  test("rejects an expired token", async () => {
    const t = await token({ sub: "u", nonce: await sha256Hex("n") }, { iss, aud: APPLE_AUDIENCE, exp: "-1m" });
    await expect(verifyAppleIdToken(t, "n", keys)).rejects.toThrow();
  });
});

describe("Google ID tokens", () => {
  const iss = "https://accounts.google.com";
  const webClientId = "web-client.apps.googleusercontent.com";

  test("accepts a token for our web client id", async () => {
    process.env.AUTH_GOOGLE_ID = webClientId;
    const t = await token({ sub: "google-1", email: "ellen@example.com", email_verified: true }, { iss, aud: webClientId });
    expect(await verifyGoogleIdToken(t, keys)).toEqual({ sub: "google-1", email: "ellen@example.com", emailVerified: true });
  });

  test("rejects a token for a different client", async () => {
    process.env.AUTH_GOOGLE_ID = webClientId;
    const t = await token({ sub: "g" }, { iss, aud: "someone-else.apps.googleusercontent.com" });
    await expect(verifyGoogleIdToken(t, keys)).rejects.toThrow();
  });

  test("rejects a token from the wrong issuer", async () => {
    process.env.AUTH_GOOGLE_ID = webClientId;
    const t = await token({ sub: "g" }, { iss: "https://evil.example.com", aud: webClientId });
    await expect(verifyGoogleIdToken(t, keys)).rejects.toThrow();
  });
});
