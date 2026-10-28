import { useConvexAuth } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";

export type AuthState = "loading" | "signedOut" | "needsSignup" | "needsTerms" | "onboarded";

/** Has a profile (link screens treat "needs to accept new terms" like signed up). */
export const hasProfile = (s: AuthState) => s === "onboarded" || s === "needsTerms";

/** Where the person is: signed out, signed in without a profile, signed up but the terms changed since, or fully in. */
export function useAuthState(): AuthState {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { data: me } = useQuery(convexQuery(api.profiles.me, isAuthenticated ? {} : "skip"));
  if (isLoading) return "loading";
  if (!isAuthenticated) return "signedOut";
  if (me === undefined) return "loading";
  if (me?.needsSignup !== false) return "needsSignup";
  return me.profile.termsCurrent ? "onboarded" : "needsTerms";
}
