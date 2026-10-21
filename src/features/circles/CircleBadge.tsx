import { StyleSheet, Text, View } from "react-native";
import { CircleMark } from "../../ui/Logo";
import { color } from "../../ui/theme";

/**
 * A circle's face: its emoji in a disc, or the Domi mark for zip circles.
 * Use `onFog` when it sits on a Fog card, so the disc stays visible.
 */
export function CircleBadge({
  kind,
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
      {kind === "zip" ? <CircleMark size={size * 0.5} /> : <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: "center", justifyContent: "center" },
});
