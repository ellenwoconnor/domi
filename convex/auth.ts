import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, createAccount } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { verifyAppleIdToken, verifyGoogleIdToken, type VerifiedIdentity } from "./lib/idTokens";

/**
 * Native sign-in: the app gets an ID token from Apple's / Google's own sheet
 * and calls signIn("apple" | "google", { idToken, ... }). We verify the token
 * here and find or create the matching account. No browser redirects.
 */
function nativeProvider(
  id: "apple" | "google",
  verify: (credentials: Record<string, unknown>) => Promise<VerifiedIdentity>,
) {
  return ConvexCredentials<DataModel>({
    id,
    authorize: async (credentials, ctx) => {
      if (typeof credentials.idToken !== "string") return null;
      const who = await verify(credentials);
      const name = typeof credentials.name === "string" && credentials.name.trim() ? credentials.name.trim() : undefined;
      // createAccount returns the existing account if this provider id has signed in before.
      const { user } = await createAccount(ctx, {
        provider: id,
        account: { id: who.sub },
        profile: {
          ...(who.email ? { email: who.email } : {}),
          ...(name ? { name } : {}),
        },
      });
      return { userId: user._id };
    },
  });
}

/**
 * Dev-only email + password sign-in, so the backend can be exercised with
 * several test accounts before Apple sign-in works. Enabled only when the
 * deployment has DEV_PASSWORD_AUTH=true (`npx convex env set DEV_PASSWORD_AUTH true`).
 * Never set this on the production deployment.
 */
const devPassword = process.env.DEV_PASSWORD_AUTH === "true" ? [Password<DataModel>({ id: "dev-password" })] : [];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    nativeProvider("apple", async (c) => {
      if (typeof c.nonce !== "string") throw new Error("Missing nonce");
      return verifyAppleIdToken(c.idToken as string, c.nonce);
    }),
    nativeProvider("google", async (c) => verifyGoogleIdToken(c.idToken as string)),
    ...devPassword,
  ],
});
