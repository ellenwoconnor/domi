import { type ColorValue, View } from "react-native";

/** The Circles tab icon: the logo's ring and dot, drawn in the tab's tint. */
export function CirclesTabIcon({ color, focused, size = 21 }: { color: ColorValue; focused: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: focused ? 2.6 : 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: size * 0.28, height: size * 0.28, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}
