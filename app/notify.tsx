import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { registerDevice, requestPushPermission } from "../src/features/push/push";
import type { AskReason } from "../src/features/push/useAskForPush";
import { PrimaryButton, TextButton } from "../src/ui/Form";
import { color, space, type } from "../src/ui/theme";

/**
 * Our own "turn on notifications?" screen. Only "Turn on notifications" shows
 * the system dialog, which iOS shows once; "Not now" keeps that chance for a
 * better moment (src/features/push/useAskForPush.ts decides when).
 */
function copy(reason: AskReason, circle?: string) {
  switch (reason) {
    case "welcome":
      return {
        title: `${circle ?? "Your circle"} is just getting started`,
        body: "Get a heads-up when neighbors post something or someone wants your stuff.",
      };
    case "join":
      return {
        title: `You're in ${circle ?? "the circle"}`,
        body: "Get a heads-up when neighbors here post something, and when someone wants your stuff.",
      };
    case "request":
      return {
        title: "Want to know if it's yours?",
        body: "We'll tell you when they pick someone, and when they message you.",
      };
    case "post":
      return {
        title: "Want to know when someone asks for it?",
        body: "We'll tell you when a neighbor requests it or messages you.",
      };
    case "wish":
      return {
        title: "Want to know when someone has one?",
        body: "We'll tell you when a neighbor offers one or posts something that matches.",
      };
    default:
      return {
        title: "Turn on notifications",
        body: "Only when there's something to do: someone wants your stuff, picks you, or messages you. And a heads-up when your circles have something new.",
      };
  }
}

export default function Notify() {
  const params = useLocalSearchParams<{ reason?: AskReason; circle?: string; next?: string }>();
  const reason = params.reason ?? "settings";
  const { title, body } = copy(reason, params.circle);
  const insets = useSafeAreaInsets();
  const register = useMutation(api.activity.registerPushToken);
  const decline = useMutation(api.activity.declinePushAsk);
  const [busy, setBusy] = useState(false);

  function done() {
    if (params.next === "/listing/new") router.replace("/listing/new");
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function turnOn() {
    setBusy(true);
    try {
      if (await requestPushPermission()) await registerDevice(register);
    } catch {
      // the system said no or isn't available; nothing else to do here
    }
    setBusy(false);
    done();
  }

  function notNow() {
    decline({}).catch(() => {});
    done();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.middle}>
        <View style={styles.bell}>
          <Ionicons name="notifications-outline" size={40} color={color.bay} />
        </View>
        <Text style={[type.display, styles.center]}>{title}</Text>
        <Text style={[type.caption, styles.center]}>{body}</Text>
      </View>
      <View style={{ gap: space.xs }}>
        <PrimaryButton title="Turn on notifications" onPress={turnOn} busy={busy} />
        <TextButton title="Not now" onPress={notNow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white, paddingHorizontal: space.lg, justifyContent: "space-between" },
  middle: { flex: 1, justifyContent: "center", alignItems: "center", gap: space.md },
  bell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  center: { textAlign: "center" },
});
