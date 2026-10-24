import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "../../lib/errors";
import { Sheet, sheetStyles } from "../../ui/Sheet";
import { color, space, type } from "../../ui/theme";

export type BlockTarget = { userId: Id<"users">; displayName: string };

/** Confirm a block. Blocking hides everything both ways and quietly undoes anything in flight. */
export function BlockSheet({
  target,
  onClose,
  onBlocked,
}: {
  target: BlockTarget | null;
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const block = useMutation(api.safety.block);
  const [busy, setBusy] = useState(false);
  const name = target?.displayName ?? "";

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await block({ userId: target.userId });
      onClose();
      onBlocked?.();
    } catch (e) {
      Alert.alert("Couldn't block", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!target} onClose={onClose} title={`Block ${name}?`}>
      <View style={{ gap: space.md }}>
        <Point icon="eye-off-outline" text="You won't see each other's listings or wishes." />
        <Point icon="chatbubble-outline" text="Neither of you can message or ask for the other's things." />
        <Point icon="arrow-undo-outline" text="Anything you're arranging together is cancelled." />
      </View>
      <Text style={type.meta}>{name} isn't told. You can unblock from You › Blocked people.</Text>
      <View style={{ gap: space.sm }}>
        <Pressable
          onPress={confirm}
          disabled={busy}
          style={[sheetStyles.primary, { backgroundColor: color.ink }, busy && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <Text style={type.button}>{busy ? "Blocking…" : `Block ${name}`}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={sheetStyles.secondary} accessibilityRole="button">
          <Text style={sheetStyles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Point({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.point}>
      <Ionicons name={icon} size={20} color={color.bay} />
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
});
