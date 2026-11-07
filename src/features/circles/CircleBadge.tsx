import { StyleSheet, Text, View } from "react-native";
import { color } from "../../ui/theme";

/**
 * A domi's face: its emoji in a disc (📍 for the neighborhood).
 * Use `onFog` when it sits on a Fog card, so the disc stays visible.
 */
export function CircleBadge({
  emoji,
  size = 44,
  onFog = false,
}: {
  kind: "zip" | "custom";
  emoji: string;
  size?: number;
  onFog?: boolean;
}) {
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: onFog ? color.white : color.fog },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: "center", justifyContent: "center" },
});
