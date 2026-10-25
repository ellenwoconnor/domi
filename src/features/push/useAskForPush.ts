import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useCallback } from "react";
import { api } from "../../../convex/_generated/api";
import { pushPermission, registerDevice } from "./push";

export type AskReason = "welcome" | "join" | "request" | "post" | "wish" | "settings";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NOT_NOWS = 3;

/**
 * Opens our own "turn on notifications?" screen (app/notify.tsx) when it's a
 * good moment: not yet allowed, not blocked in Settings, fewer than 3 "Not
 * now"s, and no ask in the last week. The You row ("settings") always asks.
 * Resolves true when the screen was opened. With `replace`, the screen
 * replaces the current one and then goes to `next`.
 */
export function useAskForPush() {
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const register = useMutation(api.activity.registerPushToken);

  return useCallback(
    async (reason: AskReason, opts: { circle?: string; next?: string; replace?: boolean } = {}) => {
      let permission;
      try {
        permission = await pushPermission();
      } catch {
        return false;
      }
      if (permission === "granted") {
        registerDevice(register).catch(() => {});
        return false;
      }
      if (permission === "blocked" || !me) return false;
      if (reason !== "settings") {
        if (me.pushAskCount >= MAX_NOT_NOWS) return false;
        if (me.pushAskedAt !== null && Date.now() - me.pushAskedAt < WEEK_MS) return false;
      }
      const href = {
        pathname: "/notify" as const,
        params: { reason, ...(opts.circle ? { circle: opts.circle } : {}), ...(opts.next ? { next: opts.next } : {}) },
      };
      if (opts.replace) router.replace(href);
      else router.push(href);
      return true;
    },
    [me, register],
  );
}
