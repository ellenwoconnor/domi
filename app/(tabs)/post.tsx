import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, radius, space, type } from "../../src/ui/theme";

/** Mock of the camera-first posting flow (the real camera arrives in M3). */
export default function Give() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={type.display}>What's moving on?</Text>
      <Text style={[type.body, styles.sub]}>
        Start with a photo. Good light, the whole thing, a little room around it.
      </Text>

      <View style={styles.viewfinder}>
        {/* framing guide corners */}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <Ionicons name="camera-outline" size={40} color={color.inkFaint} />
        <Text style={[type.meta, { textAlign: "center" }]}>Camera preview</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.side} accessibilityLabel="Choose from your photos">
          <Ionicons name="images-outline" size={22} color={color.bay} />
        </Pressable>
        <Pressable style={styles.shutter} accessibilityLabel="Take photo">
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.sideSpacer} />
      </View>
    </SafeAreaView>
  );
}

const C = 26;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white, paddingHorizontal: space.lg, paddingTop: space.lg },
  sub: { color: color.inkSoft, marginTop: space.xs, marginBottom: space.lg },
  viewfinder: {
    flex: 1,
    borderRadius: radius.thing,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  corner: { position: "absolute", width: C, height: C, borderColor: color.bay },
  tl: { top: space.lg, left: space.lg, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: space.lg, right: space.lg, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: space.lg, left: space.lg, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: space.lg, right: space.lg, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.xl,
    paddingHorizontal: space.xl,
  },
  side: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: color.fog },
  sideSpacer: { width: 48, height: 48 },
  // Bay Blue ring, Poppy center: the logo, and a giving moment
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.poppy },
});
