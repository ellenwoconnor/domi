import { StyleSheet, Text, View } from "react-native";
import { color, font } from "./theme";

/** A person's initial on a Fog disc. (Circles mean people.) */
export function Avatar({ name, size = 36, onFog = false }: { name: string; size?: number; onFog?: boolean }) {
  return (
    <View
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, onFog && { backgroundColor: color.white }]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.4) }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: color.fog, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: font.uiBold, color: color.bay },
});
