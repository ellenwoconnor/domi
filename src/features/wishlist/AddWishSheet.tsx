import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleMark } from "../../ui/Logo";
import { color, font, radius, space, type } from "../../ui/theme";
import { circleLabel, circles } from "../items/mockData";
import { addWish } from "./store";

const NOTE_MAX = 140;

export function AddWishSheet({
  visible,
  initialTitle = "",
  onClose,
}: {
  visible: boolean;
  initialTitle?: string;
  onClose: (added: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialTitle);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>(circles.map((c) => c.id));

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setNote("");
      setPicked(circles.map((c) => c.id));
    }
  }, [visible, initialTitle]);

  const canAdd = title.trim().length > 0 && picked.length > 0;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Pressable style={styles.scrim} onPress={() => onClose(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <Text style={type.title}>What are you looking for?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            placeholder="Kids' bike helmet"
            placeholderTextColor={color.inkFaint}
            style={styles.input}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX}
            multiline
            placeholder="A note for neighbors (optional)"
            placeholderTextColor={color.inkFaint}
            style={[styles.input, styles.note]}
          />
          <Text style={[type.label, { marginTop: space.sm }]}>Show it in</Text>
          <View style={styles.chips}>
            {circles.map((c) => {
              const on = picked.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  {c.kind === "zip" ? <CircleMark size={13} tone={on ? "white" : "bay"} /> : null}
                  <Text style={[styles.chipText, on && { color: color.white }]}>{circleLabel(c)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            disabled={!canAdd}
            onPress={() => {
              addWish({ title: title.trim(), note: note.trim(), circleIds: picked });
              onClose(true);
            }}
            style={[styles.primary, !canAdd && { opacity: 0.4 }]}
          >
            <Text style={type.button}>Add to wishlist</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    gap: space.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.line,
    marginBottom: space.sm,
  },
  input: {
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    height: 48,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
  },
  note: { height: 84, paddingTop: space.md, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.fog,
  },
  chipOn: { backgroundColor: color.bay },
  chipText: { fontFamily: font.uiMedium, fontSize: 14, color: color.ink },
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
});
