import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Push on the device: permission, the Expo token, and what a push does while
// the app is open. Server side: convex/push.ts. Decisions: docs/m5-requirements.md.

const TOKEN_KEY = "domi.pushToken";

export type PushPermission = "granted" | "ask" | "blocked";

/** The chat on screen, so its own pushes don't show a banner. Set by app/chat/[id].tsx. */
let openChatId: string | null = null;
export function setOpenChat(id: string | null) {
  openChatId = id;
}

let configured = false;
export function configurePush() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = n.request.content.data as { open?: string; conversationId?: string } | undefined;
      const show = !(data?.open === "chat" && data.conversationId && data.conversationId === openChatId);
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
  if (Platform.OS === "android") {
    // Android 13+ shows the permission dialog only once a channel exists.
    Notifications.setNotificationChannelAsync("default", {
      name: "Domi",
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function pushPermission(): Promise<PushPermission> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain ? "ask" : "blocked";
}

/** Shows the system dialog. Only call after the person tapped "Turn on notifications". */
export async function requestPushPermission(): Promise<boolean> {
  configurePush();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

export function clock() {
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  return { timeZone, utcOffsetMinutes: -new Date().getTimezoneOffset() };
}

type Register = (args: {
  token: string;
  platform: "ios" | "android";
  timeZone?: string;
  utcOffsetMinutes?: number;
}) => Promise<unknown>;

/** Gets this device's Expo push token and saves it on the server. Needs permission. */
export async function registerDevice(register: Register): Promise<boolean> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await register({ token, platform: Platform.OS, ...clock() });
    await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
    return true;
  } catch (e) {
    console.warn("push token", e); // simulators have no token
    return false;
  }
}

/** Sign-out: this device stops getting the signed-out person's pushes. */
export async function unregisterDevice(unregister: (args: { token: string }) => Promise<unknown>) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await unregister({ token }).catch(() => {});
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}
