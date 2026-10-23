import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { api } from "../../../convex/_generated/api";
import { clearPendingCodes, getPendingCodes } from "./pendingCodes";
import type { AuthState } from "./useAuthState";

/**
 * Someone who already has an account can tap an invite or listing link while
 * signed out. The link screen saves the code and sends them to sign in; once
 * they're back in, this redeems what was saved and opens the circle (or the
 * listing). New accounts redeem their codes in onboarding
 * (profiles.completeSignup), so this only acts on signed out → onboarded.
 */
export function useRedeemSavedCodes(state: AuthState) {
  const redeem = useMutation(api.profiles.redeemSavedCodes);
  const cameFromSignedOut = useRef(false);

  useEffect(() => {
    if (state === "signedOut") cameFromSignedOut.current = true;
    if (state === "needsSignup") cameFromSignedOut.current = false; // onboarding handles it
    if (state !== "onboarded" || !cameFromSignedOut.current) return;
    cameFromSignedOut.current = false;

    (async () => {
      const codes = await getPendingCodes();
      if (codes.invites.length === 0 && codes.shares.length === 0) return;
      try {
        const result = await redeem({ inviteCodes: codes.invites, shareCodes: codes.shares });
        await clearPendingCodes();
        const circle = result.invites.find((i) => i.result.ok && i.result.communityId)?.result;
        const item = result.shares.find((s) => s.result.ok && s.result.itemId)?.result;
        if (circle?.ok && circle.communityId) router.push(`/circle/${circle.communityId}`);
        else if (item?.ok && item.itemId) router.push(`/item/${item.itemId}`);
        const failed =
          result.invites.filter((i) => !i.result.ok).length + result.shares.filter((s) => !s.result.ok).length;
        if (failed > 0) {
          Alert.alert(
            "Welcome back",
            failed === 1
              ? "One link didn't work. It may have been replaced; ask for a new one."
              : `${failed} links didn't work. They may have been replaced; ask for new ones.`,
          );
        }
      } catch {
        // Keep the codes; they'll be tried again after the next sign-in.
      }
    })();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
}
