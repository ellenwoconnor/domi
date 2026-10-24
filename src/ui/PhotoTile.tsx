import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color, radius } from "./theme";

/**
 * An item photo on a Fog backdrop. With no photo (still uploading, or purged
 * after the listing ended) it shows a quiet camera mark; `emoji` is only for
 * the remaining mock screens (wishes).
 */
export function PhotoTile({
  uri,
  emoji,
  emojiSize = 54,
  style,
  rounded = true,
  dimmed = false,
}: {
  uri?: string | null;
  emoji?: string;
  emojiSize?: number;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
  dimmed?: boolean;
}) {
  return (
    <View style={[styles.tile, rounded && { borderRadius: radius.thing }, style]}>
      {uri ? (
        <Image source={{ uri }} style={[StyleSheet.absoluteFill, dimmed && { opacity: 0.55 }]} resizeMode="cover" />
      ) : emoji ? (
        <Text style={{ fontSize: emojiSize, opacity: dimmed ? 0.45 : 1 }}>{emoji}</Text>
      ) : (
        <Ionicons name="image-outline" size={28} color={color.inkFaint} />
      )}
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
