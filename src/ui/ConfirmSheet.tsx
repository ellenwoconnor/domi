import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { errorMessage } from "../lib/errors";
import { Sheet, sheetStyles } from "./Sheet";
import { color, radius, type } from "./theme";

type Ask = {
  title: string;
  message: string;
  /** The button that does it: "Remove listing", "Delete this domi". */
  action: string;
  /** The way out: "Keep it". */
  keep?: string;
  /** Runs while the sheet shows a spinner; the sheet closes when it settles. Throwing keeps it open. */
  run: () => Promise<unknown>;
};

/**
 * One confirm for every remove or delete, in the Domi sheet (not the iOS alert):
 * a sentence of what happens, an Ink button that does it, and a way out.
 * Usage: const { confirm, confirmSheet } = useConfirmSheet(); render {confirmSheet}; call confirm({...}).
 */
export function useConfirmSheet() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Ask | null>(null);
  current.current = ask;

  const confirm = useCallback((a: Ask) => {
    setError(null);
    setAsk(a);
  }, []);

  const close = () => {
    if (!busy) setAsk(null);
  };

  const go = async () => {
    const a = current.current;
    if (!a) return;
    setBusy(true);
    setError(null);
    try {
      await a.run();
      setAsk(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmSheet = (
    <Sheet visible={!!ask} onClose={close} title={ask?.title}>
      <Text style={type.body}>{ask?.message}</Text>
      {error ? <Text style={[type.meta, { color: color.ink }]}>{error}</Text> : null}
      <Pressable
        onPress={go}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator color={color.white} /> : <Text style={type.button}>{ask?.action}</Text>}
      </Pressable>
      <Pressable onPress={close} disabled={busy} accessibilityRole="button" style={sheetStyles.secondary}>
        <Text style={sheetStyles.secondaryText}>{ask?.keep ?? "Keep it"}</Text>
      </Pressable>
    </Sheet>
  );

  return { confirm, confirmSheet };
}

const styles = StyleSheet.create({
  // Ink, like Delete account: destructive without red (the brand has none).
  action: { height: 54, borderRadius: radius.control, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
});
