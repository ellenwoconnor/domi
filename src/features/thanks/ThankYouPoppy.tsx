import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeamedPetals } from "../../ui/Logo";
import { color } from "../../ui/theme";
import {
  THANKS_AREA,
  THANKS_ASPECT,
  THANKS_CALYX,
  THANKS_ORIGIN,
  THANKS_PETALS,
  THANKS_STEM,
  THANKS_VIEWBOX,
} from "./thanksPaths";

/**
 * The domi flower (the thank-you poppy). With `bloom`, the petals open from a bud when it first
 * appears (under a second, once). The stem and calyx stay still.
 */
export function ThankYouPoppy({ height, bloom = false }: { height: number; bloom?: boolean }) {
  const width = height * THANKS_ASPECT;
  const open = useRef(new Animated.Value(bloom ? 0 : 1)).current;

  useEffect(() => {
    if (!bloom) return;
    Animated.timing(open, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();
  }, [bloom, open]);

  const petals = {
    opacity: open.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 1, 1],
    }),
    transform: [
      {
        scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
      },
      {
        rotate: open.interpolate({
          inputRange: [0, 1],
          outputRange: ["-18deg", "0deg"],
        }),
      },
    ],
    transformOrigin: THANKS_ORIGIN,
  };

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel="A domi flower">
      <Svg width={width} height={height} viewBox={THANKS_VIEWBOX} style={StyleSheet.absoluteFill}>
        <Path d={THANKS_STEM} stroke={color.bay} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, petals]}>
        <Svg width={width} height={height} viewBox={THANKS_VIEWBOX}>
          <SeamedPetals petals={THANKS_PETALS} fill={color.poppy} area={THANKS_AREA} />
        </Svg>
      </Animated.View>
      <Svg width={width} height={height} viewBox={THANKS_VIEWBOX} style={StyleSheet.absoluteFill}>
        {THANKS_CALYX.map((d) => (
          <Path key={d} d={d} fill={color.bay} />
        ))}
      </Svg>
    </View>
  );
}
