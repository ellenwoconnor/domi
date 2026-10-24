import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { Sheet, sheetStyles } from "../../ui/Sheet";
import { color, font, radius, space, type } from "../../ui/theme";

export type ReportTarget = {
  type: "item" | "user" | "message" | "wishlist_item";
  id: string;
  /** Shown in the title: "Report Maya", "Report this listing". */
  label: string;
};

const REASONS = ["Spam or scam", "Unsafe or offensive", "Item isn't as described", "Didn't show up", "Something else"];

/** Report a person, listing, wish or message. Reports are reviewed by hand. */
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const report = useMutation(api.safety.report);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (target) {
      setReason(null);
      setNote("");
      setSent(false);
    }
  }, [target]);

  const send = async () => {
    if (!target || !reason) return;
    setBusy(true);
    try {
      const detail = note.trim();
      await report({ targetType: target.type, targetId: target.id, reason: detail ? `${reason}: ${detail}` : reason });
      setSent(true);
    } catch (e) {
      Alert.alert("Couldn't send the report", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Sheet visible={!!target} onClose={onClose} title="Thanks. We'll take a look.">
        <Text style={type.body}>Only the Domi team sees reports. Nobody is told who sent it.</Text>
        <Pressable onPress={onClose} style={sheetStyles.primary} accessibilityRole="button">
          <Text style={type.button}>Done</Text>
        </Pressable>
      </Sheet>
    );
  }

  return (
    <Sheet visible={!!target} onClose={onClose} title={target ? `Report ${target.label}` : undefined}>
      <Text style={type.meta}>What's going on?</Text>
      <View accessibilityRole="radiogroup">
        {REASONS.map((r, i) => {
          const on = r === reason;
          return (
            <Pressable
              key={r}
              onPress={() => setReason(r)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.reason, i < REASONS.length - 1 && styles.line]}
            >
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? color.bay : color.inkSoft} />
              <Text style={[styles.reasonText, on && { fontFamily: font.uiSemi }]}>{r}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder="Anything else we should know? (optional)"
        placeholderTextColor={color.inkSoft}
        style={styles.note}
      />
      <Text style={type.meta}>Only the Domi team sees reports. They aren't told.</Text>
      <Pressable
        onPress={send}
        disabled={!reason || busy}
        style={[sheetStyles.primary, (!reason || busy) && { opacity: 0.4 }]}
        accessibilityRole="button"
      >
        <Text style={type.button}>{busy ? "Sending…" : "Send report"}</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  reason: { height: 50, flexDirection: "row", alignItems: "center", gap: space.md },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  reasonText: { fontFamily: font.ui, fontSize: 16, color: color.ink },
  note: {
    minHeight: 76,
    backgroundColor: color.fog,
    borderRadius: radius.control,
    padding: space.md,
    paddingTop: space.md,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
    textAlignVertical: "top",
  },
});
