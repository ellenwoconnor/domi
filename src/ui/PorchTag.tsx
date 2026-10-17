import { StyleSheet, Text, View } from "react-native";
import { color } from "./theme";

/**
 * The yellow tag pinned to every listing photo, like a "free" sign taped to
 * a box on the curb. Shows the one thing you want at a glance: how far.
 */
export function PorchTag({ label, size = "sm" }: { label: string; size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <View style={[styles.tag, lg && styles.tagLg]}>
      <View style={[styles.hole, lg && styles.holeLg]} />
      <Text style={[styles.text, lg && styles.textLg]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: color.tag,
    paddingLeft: 6,
    paddingRight: 9,
    paddingVertical: 4,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#3A2E00",
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tagLg: { paddingLeft: 9, paddingRight: 13, paddingVertical: 7, gap: 7 },
  hole: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(58,46,0,0.35)" },
  holeLg: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: "700", color: color.tagInk },
  textLg: { fontSize: 15 },
});
