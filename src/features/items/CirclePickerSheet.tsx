import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleMark } from "../../ui/Logo";
import { color, font, radius, space, type } from "../../ui/theme";
import type { CircleView } from "./format";

type CircleId = CircleView["id"];

/** "Who should see it?": a checklist of your circles, home circle first. At least one. */
export function CirclePickerSheet({
  visible,
  circles,
  selected,
  onClose,
}: {
  visible: boolean;
  circles: CircleView[];
  selected: CircleId[];
  /** Called with the new selection, or null when dismissed without saving. */
  onClose: (next: CircleId[] | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<CircleId[]>(selected);
  useEffect(() => {
    if (visible) setPicked(selected);
  }, [visible, selected]);

  const toggle = (id: CircleId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const reach = circles.filter((c) => picked.includes(c.id)).reduce((n, c) => n + c.memberCount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose(null)}>
      <View style={styles.wrap}>
        <Pressable style={styles.scrim} onPress={() => onClose(null)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <Text style={type.title}>Who should see it?</Text>
          <Text style={type.meta}>Your home circle is on to start. Add any others.</Text>
          <ScrollView style={{ maxHeight: 360, marginTop: space.sm }}>
            {circles.map((c) => {
              const on = picked.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={styles.row}
                >
                  <View style={[styles.mark, c.kind === "custom" && { backgroundColor: color.blush }]}>
                    {c.kind === "zip" ? (
                      <CircleMark size={20} />
                    ) : (
                      <Text style={styles.markText}>{c.emoji ?? c.name.charAt(0)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={type.meta}>
                      {c.kind === "zip" ? "Home circle · " : ""}
                      {c.memberCount} {c.memberCount === 1 ? "neighbor" : "neighbors"}
                    </Text>
                  </View>
                  <View style={[styles.box, on && styles.boxOn]}>
                    {on ? <Ionicons name="checkmark" size={17} color={color.white} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={() => onClose(picked)}
            disabled={picked.length === 0}
            accessibilityRole="button"
            style={[styles.primary, picked.length === 0 && { opacity: 0.5 }]}
          >
            <Text style={type.button}>
              {picked.length === 0 ? "Pick at least one" : `Done · about ${reach} ${reach === 1 ? "neighbor" : "neighbors"}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(24,34,46,0.35)" },
  sheet: {
    backgroundColor: color.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.xs,
  },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: color.line, marginBottom: space.md },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  mark: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.fog, alignItems: "center", justifyContent: "center" },
  markText: { fontFamily: font.uiBold, fontSize: 18, color: color.ink },
  name: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: color.inkFaint, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.bay, borderColor: color.bay },
  primary: {
    marginTop: space.md,
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
});
