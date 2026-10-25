import { useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AuthState } from "../auth/useAuthState";
import { clock, configurePush, pushPermission, registerDevice } from "./push";

const TOUCH_EVERY_MS = 5 * 60 * 1000;

type PushData = {
  eventId?: string;
  open?: "chat" | "item" | "wish" | "browse";
  conversationId?: string;
  itemId?: string;
  wishlistItemId?: string;
  tab?: "offers" | "wishes";
  communityId?: string;
};

function openFromPush(d: PushData) {
  if (d.open === "chat" && d.conversationId) router.push(`/chat/${d.conversationId}`);
  else if (d.open === "item" && d.itemId) router.push(`/item/${d.itemId}`);
  else if (d.open === "wish" && d.wishlistItemId) router.push(`/wish/${d.wishlistItemId}`);
  else if (d.open === "browse") {
    router.navigate({
      pathname: "/",
      params: { mode: d.tab === "wishes" ? "wishes" : "free", ...(d.communityId ? { circle: d.communityId } : {}) },
    });
  }
}

/**
 * Once signed in: keep this device's push token fresh, tell the server the app
 * was opened (for "seen" and back-off), and open the right screen when a push
 * is tapped (also when the tap launched the app).
 */
export function usePushSetup(state: AuthState) {
  const onboarded = state === "onboarded";
  const register = useMutation(api.activity.registerPushToken);
  const touch = useMutation(api.activity.touch);
  const markOpened = useMutation(api.activity.markOpened);
  const lastTouch = useRef(0);
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    configurePush();
  }, []);

  useEffect(() => {
    if (!onboarded) return;
    pushPermission()
      .then((p) => (p === "granted" ? registerDevice(register) : false))
      .catch(() => {});
  }, [onboarded, register]);

  useEffect(() => {
    if (!onboarded) return;
    const ping = () => {
      if (Date.now() - lastTouch.current < TOUCH_EVERY_MS) return;
      lastTouch.current = Date.now();
      touch(clock()).catch(() => {});
    };
    ping();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") ping();
    });
    return () => sub.remove();
  }, [onboarded, touch]);

  useEffect(() => {
    if (!onboarded || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = (response.notification.request.content.data ?? {}) as PushData;
    if (data.eventId) markOpened({ eventId: data.eventId as Id<"events"> }).catch(() => {});
    // Let the app's screens mount first when the tap launched the app.
    setTimeout(() => openFromPush(data), 0);
    Notifications.clearLastNotificationResponse();
  }, [onboarded, response, markOpened]);
}
