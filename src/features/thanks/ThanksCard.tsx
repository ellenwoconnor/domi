import { useMutation } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "../../lib/errors";
import { color, font, radius, space, type } from "../../ui/theme";
import { ThankYouPoppy } from "./ThankYouPoppy";

const NOTE_MAX = 140;

type Props = {
  conversationId: Id<"conversations">;
  role: "owner" | "recipient";
  other: string;
  thing: string;
  pickedUp: boolean;
  thanks: { at: number; note: string | null } | null;
};

/**
 * The thank-you poppy in the pickup chat (docs/spec.md, "Thank-you poppy").
 * The person who got the item is offered it once, after pickup; the giver sees
 * it when it arrives. Returns null when there's nothing to show.
 */
export function ThanksCard({ conversationId, role, other, thing, pickedUp, thanks }: Props) {
  const send = useMutation(api.thanks.send);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [justSent, setJustSent] = useState(false);

  if (!pickedUp) return null;

  // The giver: the poppy, large, once it's sent.
  if (role === "owner") {
    if (!thanks) return null;
    return (
      <View style={[styles.card, styles.center]}>
        <ThankYouPoppy height={150} bloom />
        <Text style={[type.title, styles.centerText]}>{other} sent you a poppy</Text>
        {thanks.note ? <Text style={[type.caption, styles.centerText]}>“{thanks.note}”</Text> : null}
        <Text style={[type.meta, styles.centerText]}>for the {thing}</Text>
      </View>
    );
  }

  // The person who got it, right after sending: the poppy blooms.
  if (justSent && thanks) {
    return (
      <View style={[styles.card, styles.center]}>
        <ThankYouPoppy height={150} bloom />
        <Text style={[type.title, styles.centerText]}>Sent to {other}</Text>
        {thanks.note ? <Text style={[type.caption, styles.centerText]}>“{thanks.note}”</Text> : null}
      </View>
    );
  }

  // Later: a small reminder of what they sent.
  if (thanks) {
    return (
      <View style={[styles.card, styles.compact]}>
        <ThankYouPoppy height={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.label}>You sent {other} a poppy</Text>
          {thanks.note ? <Text style={type.caption}>“{thanks.note}”</Text> : null}
        </View>
      </View>
    );
  }

  if (dismissed) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await send({ conversationId, note: note.trim() || undefined });
      setJustSent(true);
    } catch (e) {
      Alert.alert("Couldn't send the poppy", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // The offer: once, never required.
  return (
    <View style={[styles.card, styles.center]}>
      <ThankYouPoppy height={110} />
      <Text style={[type.title, styles.centerText]}>Send {other} a poppy?</Text>
      <Text style={[type.meta, styles.centerText]}>A small thank-you for the {thing}.</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)"
        placeholderTextColor={color.inkFaint}
        maxLength={NOTE_MAX}
        style={styles.input}
        accessibilityLabel="Note"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy }}
        onPress={submit}
        style={[styles.send, busy && { opacity: 0.6 }]}
      >
        {busy ? <ActivityIndicator color={color.ink} /> : <Text style={styles.sendText}>Send a poppy</Text>}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setDismissed(true)} hitSlop={8}>
        <Text style={type.meta}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.blush, borderRadius: radius.sheet, padding: space.lg, marginVertical: space.md },
  center: { alignItems: "center", gap: space.sm },
  centerText: { textAlign: "center" },
  compact: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  input: {
    alignSelf: "stretch",
    backgroundColor: color.white,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
    marginTop: space.xs,
  },
  // Solid Poppy is for giving moments; text on Poppy is always Ink.
  send: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: radius.control,
    backgroundColor: color.poppy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
});
