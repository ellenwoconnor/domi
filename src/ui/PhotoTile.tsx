import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color, radius } from "./theme";

/**
 * Stand-in for an item photo: the object on a Fog backdrop with room around it.
 * Real photos replace this when posting lands (M3).
 */
export function PhotoTile({
  emoji,
  emojiSize = 54,
  style,
  rounded = true,
  dimmed = false,
}: {
  emoji: string;
  emojiSize?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
  dimmed?: boolean;
}) {
  return (
    <View style={[styles.tile, rounded && { borderRadius: radius.thing }, style]}>
      <Text style={{ fontSize: emojiSize, opacity: dimmed ? 0.45 : 1 }}>{emoji}</Text>
    </View>
  );
}

/** The Poppy dot on a free item, like a gallery's "sold" sticker. */
export function FreeDot({ size = 12 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="Free"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color.poppy,
        borderWidth: 2,
        borderColor: color.white,
      }}
    />
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: color.fog, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
