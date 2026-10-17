import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, tileTints } from "./theme";

/** Placeholder for an item photo in the mockup: a big emoji on a soft tint. */
export function PhotoTile({
  emoji,
  seed,
  emojiSize = 56,
  style,
  rounded = true,
}: {
  emoji: string;
  seed: string;
  emojiSize?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
}) {
  const tint = tileTints[hash(seed) % tileTints.length];
  return (
    <View style={[styles.tile, { backgroundColor: tint }, rounded && { borderRadius: radius.md }, style]}>
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
    </View>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
