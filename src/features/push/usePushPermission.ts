import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { pushPermission, type PushPermission } from "./push";

/**
 * This phone's notification permission, checked when the screen comes into
 * focus and whenever the app comes back (the person may have just changed it
 * in Settings). Null until the first check, or if it can't be read.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const check = useCallback(() => {
    pushPermission()
      .then(setPermission)
      .catch(() => setPermission(null));
  }, []);

  useFocusEffect(check);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => sub.remove();
  }, [check]);

  return { permission, recheck: check };
}
