import { StyleSheet, Text, View } from "react-native";
import { CircleMark } from "../../ui/Logo";
import { color } from "../../ui/theme";

/** A circle's face: its emoji in a Fog disc, or the Domi mark for zip circles. */
export function CircleBadge({ kind, emoji, size = 44 }: { kind: "zip" | "custom"; emoji: string; size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      {kind === "zip" ? <CircleMark size={size * 0.5} /> : <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: color.fog, alignItems: "center", justifyContent: "center" },
});
