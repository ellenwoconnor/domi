import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PorchTag } from "../../src/ui/PorchTag";
import { color, radius, space, type } from "../../src/ui/theme";

/** Mock of the camera-first posting flow (real camera arrives in M3). */
export default function Give() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.title}>Give something away</Text>
      <Text style={[type.body, styles.sub]}>Start with a photo. You'll add a title and pick circles next.</Text>

      <View style={styles.viewfinder}>
        <View style={styles.tagSpot}>
          <PorchTag size="lg" label="Free" />
        </View>
        <Ionicons name="camera-outline" size={44} color={color.inkFaint} />
        <Text style={[type.meta, { textAlign: "center" }]}>Camera preview appears here</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.side} accessibilityLabel="Choose from library">
          <Ionicons name="images-outline" size={24} color={color.ink} />
        </Pressable>
        <Pressable style={styles.shutter} accessibilityLabel="Take photo">
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.sideSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.lg },
  title: { ...type.display, fontSize: 32, lineHeight: 38, color: color.ink, paddingTop: space.sm },
  sub: { color: color.inkSoft, marginTop: space.xs, marginBottom: space.lg },
  viewfinder: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  tagSpot: { position: "absolute", top: space.lg, left: space.lg },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.xl,
    paddingHorizontal: space.xl,
  },
  side: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: color.surface },
  sideSpacer: { width: 48, height: 48 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.tag },
});
