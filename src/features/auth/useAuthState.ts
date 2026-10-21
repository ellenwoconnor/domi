import { useConvexAuth } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

export type AuthState = "loading" | "signedOut" | "needsSignup" | "onboarded";

/** Where the person is: signed out, signed in without a profile, or fully in. */
export function useAuthState(): AuthState {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { data: me } = useQuery(convexQuery(api.profiles.me, isAuthenticated ? {} : "skip"));
  if (isLoading) return "loading";
  if (!isAuthenticated) return "signedOut";
  if (me === undefined) return "loading";
  return me?.needsSignup === false ? "onboarded" : "needsSignup";
}
