import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { color, font, radius, space, type } from "../../ui/theme";
import { registerDevice, requestPushPermission } from "./push";
import { usePushPermission } from "./usePushPermission";

/**
 * A quiet Fog strip for when there's a handoff under way and this phone has
 * notifications off, so people find out before the other person is left
 * waiting. Not the full "turn on notifications?" screen (app/notify.tsx): it
 * doesn't count as a "Not now" and isn't held back by useAskForPush's limits.
 * Tapping it shows the system dialog, or opens Settings once the phone has said
 * no. × hides it for this visit.
 */
export function NotificationsOffStrip({ because, style }: { because: string; style?: object }) {
  const { permission, recheck } = usePushPermission();
  const register = useMutation(api.activity.registerPushToken);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden || permission === null || permission === "granted") return null;

  async function turnOn() {
    if (busy) return;
    if (permission === "blocked") {
      Linking.openSettings().catch(() => {});
      return; // rechecked when the app comes back
    }
    setBusy(true);
    try {
      if (await requestPushPermission()) await registerDevice(register);
    } catch {
      // the system said no or isn't available
    }
    setBusy(false);
    recheck();
  }

  return (
    <View style={[styles.strip, style]}>
      <Pressable
        style={styles.main}
        onPress={turnOn}
        accessibilityRole="button"
        accessibilityHint={permission === "blocked" ? "Opens Settings" : undefined}
      >
        <Ionicons name="notifications-off-outline" size={20} color={color.bay} />
        <Text style={[type.body, styles.text]}>
          <Text style={{ fontFamily: font.uiSemi }}>Notifications are off.</Text> {because}{" "}
          <Text style={styles.action}>{permission === "blocked" ? "Turn on in Settings" : "Turn on"}</Text>
        </Text>
      </Pressable>
      <Pressable onPress={() => setHidden(true)} accessibilityLabel="Hide" hitSlop={10}>
        <Text style={styles.x}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  text: { flex: 1, fontSize: 14, lineHeight: 19 },
  action: { fontFamily: font.uiSemi, color: color.bay },
  x: { fontFamily: font.ui, fontSize: 22, lineHeight: 22, color: color.inkSoft, paddingHorizontal: 2 },
});
