import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space } from "./theme";

/**
 * "I have this": a quiet Blush pill with the Poppy dot. Many of these can sit
 * on one screen, so they stay calm; solid Poppy is saved for the send moment.
 */
export function GiveButton({
  onPress,
  small = false,
  onBlush = false,
}: {
  onPress?: () => void;
  small?: boolean;
  /** On a Blush card the pill turns white so it still reads as a button. */
  onBlush?: boolean;
}) {
  const inner = (
    <>
      <View style={styles.dot} />
      <Text style={[styles.text, small && { fontSize: 14 }]}>I have this</Text>
    </>
  );
  const tint = onBlush ? { backgroundColor: color.white } : null;
  if (!onPress) return <View style={[styles.pill, small && styles.small, tint]}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, small && styles.small, tint, pressed && { opacity: 0.8 }]}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 36,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: color.blush,
  },
  small: { height: 32, paddingHorizontal: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.poppy },
  text: { fontFamily: font.uiSemi, fontSize: 15, color: color.ink },
});
