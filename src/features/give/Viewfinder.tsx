import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color, radius, space, type } from "../../ui/theme";

/** Mock camera: Fog viewfinder with framing-guide corners. */
export function Viewfinder({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.viewfinder, style]}>
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
      <Ionicons name="camera-outline" size={40} color={color.inkFaint} />
      <Text style={[type.meta, { textAlign: "center" }]}>Camera preview</Text>
    </View>
  );
}

/** Bay Blue ring, Poppy center: the logo, and a giving moment. */
export function ShutterRow({ onShutter }: { onShutter?: () => void }) {
  return (
    <View style={styles.controls}>
      <Pressable style={styles.side} accessibilityLabel="Choose from your photos" onPress={onShutter}>
        <Ionicons name="images-outline" size={22} color={color.bay} />
      </Pressable>
      <Pressable style={styles.shutter} accessibilityLabel="Take photo" onPress={onShutter}>
        <View style={styles.shutterInner} />
      </Pressable>
      <View style={styles.sideSpacer} />
    </View>
  );
}

const C = 26;
const styles = StyleSheet.create({
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
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
  },
  side: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: color.fog },
  sideSpacer: { width: 48, height: 48 },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.poppy },
});
