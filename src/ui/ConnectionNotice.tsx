import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { convex } from "../lib/convex";
import { color, radius, space, type } from "./theme";

/** How long the connection has to be down before we say so (brief blips on resume stay quiet). */
const SHOW_AFTER_MS = 2000;

/**
 * "Reconnecting…" while the app can't reach the backend. Until it reconnects,
 * screens show what they last knew, so this says that what's on screen may be
 * out of date (for example after the app comes back from the background).
 */
export function ConnectionNotice() {
  const insets = useSafeAreaInsets();
  const [down, setDown] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const update = (s: { isWebSocketConnected: boolean; hasEverConnected: boolean }) => {
      const offline = s.hasEverConnected && !s.isWebSocketConnected;
      if (!offline) {
        if (timer) clearTimeout(timer);
        timer = null;
        setDown(false);
      } else if (!timer) {
        timer = setTimeout(() => setDown(true), SHOW_AFTER_MS);
      }
    };
    update(convex.connectionState());
    const unsubscribe = convex.subscribeToConnectionState(update);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!down) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.sm }]} accessibilityLiveRegion="polite">
      <View style={styles.pill}>
        <ActivityIndicator size="small" color={color.inkSoft} />
        <Text style={type.meta}>Reconnecting…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.fog,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
});
