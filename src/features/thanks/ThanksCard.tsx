import { useMutation } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "../../lib/errors";
import { PoppyMark } from "../../ui/Logo";
import { Sheet } from "../../ui/Sheet";
import { color, font, radius, space, type } from "../../ui/theme";
import { ThankYouPoppy } from "./ThankYouPoppy";

// The domi flower in the pickup chat (docs/spec.md, "Domi flower"). The person
// who got the item can send it from pickup time on; it's offered quietly and
// never required.

const NOTE_MAX = 140;

export type Thanks = { at: number; note: string | null };

/** Writing the flower: the poppy, a line, an optional note, Send. */
export function FlowerSheet({
  visible,
  onClose,
  onSent,
  conversationId,
  other,
  thing,
  pickedUp,
}: {
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
  conversationId: Id<"conversations">;
  other: string;
  thing: string;
  pickedUp: boolean;
}) {
  const send = useMutation(api.thanks.send);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await send({ conversationId, note: note.trim() || undefined });
      setNote("");
      onSent();
    } catch (e) {
      Alert.alert("Couldn't send the domi flower", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.center}>
        <ThankYouPoppy height={110} />
        <Text style={[type.title, styles.centerText]}>
          Thank {other} for the {thing}
        </Text>
        <Text style={[type.meta, styles.centerText]}>
          {pickedUp
            ? `A domi flower lets ${other} know it meant a lot.`
            : `Just picked it up? Let ${other} know it means a lot.`}
        </Text>
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
        <PoppyButton title="Send a domi flower" busy={busy} onPress={submit} />
      </View>
    </Sheet>
  );
}

/** While the item is pending: a quiet strip above the message box, once they've been chatting. */
export function FlowerStrip({
  other,
  onOpen,
  onDismiss,
}: {
  other: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.strip}>
      <Pressable style={styles.stripMain} onPress={onOpen} accessibilityRole="button">
        <PoppyMark size={22} />
        <Text style={[type.body, { flex: 1, fontSize: 14, lineHeight: 19 }]}>
          <Text style={{ fontFamily: font.uiSemi }}>Picked it up?</Text> Send {other} a thank-you.
        </Text>
      </Pressable>
      <Pressable onPress={onDismiss} accessibilityLabel="Hide" hitSlop={10}>
        <Text style={styles.x}>×</Text>
      </Pressable>
    </View>
  );
}

/** After the giver marks it picked up, if no flower was sent: an "I appreciate this" card. */
export function AfterPickupCard({
  other,
  thing,
  onOpen,
  onDismiss,
}: {
  other: string;
  thing: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={[styles.card, styles.center]}>
      <ThankYouPoppy height={100} />
      <Text style={[type.title, styles.centerText]}>Enjoy the {thing}!</Text>
      <Text style={[type.meta, styles.centerText]}>Send {other} a domi flower to say thanks.</Text>
      <PoppyButton title="Send a domi flower" onPress={onOpen} />
      <Pressable accessibilityRole="button" onPress={onDismiss} hitSlop={8}>
        <Text style={type.meta}>Not now</Text>
      </Pressable>
    </View>
  );
}

/** The sent flower, in the thread where it was sent. Blooms when `bloom` (just sent or just arrived). */
export function FlowerInThread({
  role,
  other,
  thing,
  thanks,
  bloom,
  onMarkPickedUp,
}: {
  role: "owner" | "recipient";
  other: string;
  thing: string;
  thanks: Thanks;
  bloom: boolean;
  onMarkPickedUp?: () => void;
}) {
  const note = thanks.note ? <Text style={[type.caption, styles.centerText]}>“{thanks.note}”</Text> : null;
  if (role === "owner") {
    return (
      <View style={{ marginVertical: space.md, gap: space.sm }}>
        <View style={[styles.card, styles.center, { marginVertical: 0 }]}>
          <ThankYouPoppy height={130} bloom={bloom} />
          <Text style={[type.title, styles.centerText]}>{other} sent you a domi flower</Text>
          {note}
          <Text style={[type.meta, styles.centerText]}>for the {thing}</Text>
        </View>
        {onMarkPickedUp ? (
          <Pressable accessibilityRole="button" onPress={onMarkPickedUp} hitSlop={8} style={{ alignSelf: "center" }}>
            <Text style={styles.link}>{other} has it? Mark it picked up</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (bloom) {
    return (
      <View style={[styles.card, styles.center]}>
        <ThankYouPoppy height={120} bloom />
        <Text style={[type.title, styles.centerText]}>Sent to {other}</Text>
        {note}
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.compact]}>
      <ThankYouPoppy height={60} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.label}>You sent {other} a domi flower</Text>
        {thanks.note ? <Text style={type.caption}>“{thanks.note}”</Text> : null}
      </View>
    </View>
  );
}

// Solid Poppy is for giving moments; text on Poppy is always Ink.
function PoppyButton({ title, onPress, busy = false }: { title: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy }}
      onPress={busy ? undefined : onPress}
      style={[styles.send, busy && { opacity: 0.6 }]}
    >
      {busy ? <ActivityIndicator color={color.ink} /> : <Text style={styles.sendText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.blush,
    borderRadius: radius.sheet,
    padding: space.lg,
    marginVertical: space.md,
  },
  center: { alignItems: "center", gap: space.sm },
  centerText: { textAlign: "center" },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.blush,
    borderRadius: radius.control,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  stripMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  x: { fontSize: 20, lineHeight: 22, color: color.inkFaint },
  link: { fontFamily: font.uiSemi, fontSize: 14, color: color.bay },
  input: {
    alignSelf: "stretch",
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
    marginTop: space.xs,
  },
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
