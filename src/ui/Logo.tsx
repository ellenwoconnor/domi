import { StyleSheet, Text, View } from "react-native";
import { color, font } from "./theme";

/** The "o" mark: a Bay Blue ring with a Poppy dot. You, inside your circle. */
export function CircleMark({ size = 16, tone = "bay" }: { size?: number; tone?: "bay" | "white" }) {
  const ring = tone === "white" ? color.white : color.bay;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, size * 0.2),
        borderColor: ring,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: color.poppy }} />
    </View>
  );
}

/** Wordmark: "domi" in Figtree ExtraBold, with the mark in place of the o. */
export function Logo({ size = 24 }: { size?: number }) {
  const text = { fontFamily: font.wordmark, fontSize: size, lineHeight: size * 1.15, color: color.bay };
  return (
    <View style={styles.row} accessible accessibilityLabel="Domi">
      <Text style={text}>d</Text>
      <View style={{ marginHorizontal: size * 0.03, marginBottom: size * 0.17 }}>
        <CircleMark size={size * 0.58} />
      </View>
      <Text style={text}>mi</Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "flex-end" } });
