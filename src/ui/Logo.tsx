import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, G, Mask, Path, Rect } from "react-native-svg";
import { color, font } from "./theme";

// The leaning poppy, 26°, from docs/brand/domi-mark.svg (see docs/brand-strategy.md, "Logo").
// Paths are pre-rotated so the app draws exactly the brand file.
// Style A: all three petals in one color, with thin seams between them. The
// seams are cut out with a mask, so they show whatever is behind the mark.
const PETALS = [
  "M100,170C129.9,133.69 121.24,81.59 98.98,61.75C83.5,55.22 60.68,60.91 50.08,73.94C39.74,101.92 56.55,151.98 100,170Z",
  "M100,170C148.5,152.53 173.85,95.74 167.25,62.43C158.08,46.45 134.92,38.03 117.63,44.37C91.16,65.64 74.07,125.45 100,170Z",
  "M100,170C146.01,184.56 195.11,156.51 207.61,127.81C209.05,110.63 195.89,91.13 179.42,86.03C148.14,86.87 103.73,121.89 100,170Z",
] as const;
const STUB = "M98.25,173.6 C92.99,184.38 87.68,190.69 80.58,196.13";
const CALYX_CUP = "M87.37,159.39 Q94.74,180.79 116.13,173.42 Q98.25,173.6 87.37,159.39Z";
const CALYX_BASE = "M113.04,177.47C111.59,180.45 104.38,179.92 96.93,176.29C89.49,172.66 84.63,167.3 86.08,164.32C87.53,161.34 94.75,161.87 102.19,165.51C109.64,169.14 114.5,174.5 113.04,177.47Z";
const VIEWBOX = "45.4 37.2 164 164";

/**
 * Petals in one color with real gaps between them. `seam` is the gap width in
 * viewBox units (the brand art uses 6). Use inside an <Svg>.
 */
export function SeamedPetals({
  petals,
  fill,
  seam = 6,
  area,
}: {
  petals: readonly string[];
  fill: string;
  seam?: number;
  area: { x: number; y: number; width: number; height: number };
}) {
  const id = `seams${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" {...area}>
          <Rect {...area} fill="black" />
          {petals.map((d) => (
            <Path key={d} d={d} fill="white" stroke="black" strokeWidth={seam} strokeLinejoin="round" />
          ))}
        </Mask>
      </Defs>
      <G mask={`url(#${id})`}>
        {petals.map((d) => (
          <Path key={d} d={d} fill={fill} />
        ))}
      </G>
    </>
  );
}

const AREA = { x: 45.4, y: 37.2, width: 164, height: 164 };

/**
 * The Domi poppy. `size` is the side of the square it sits in.
 * The stem and calyx are Bay Blue on light backgrounds; use tone="white" on Bay Blue.
 */
export function PoppyMark({ size = 16, tone = "bay" }: { size?: number; tone?: "bay" | "white" }) {
  const stem = tone === "white" ? color.white : color.bay;
  return (
    <Svg width={size} height={size} viewBox={VIEWBOX} accessibilityElementsHidden importantForAccessibility="no">
      <SeamedPetals petals={PETALS} fill={color.poppy} area={AREA} />
      <Path d={STUB} stroke={stem} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Path d={CALYX_CUP} fill={stem} />
      <Path d={CALYX_BASE} fill={stem} />
    </Svg>
  );
}

/** The Domis tab icon: the poppy in one color (the tab's tint), with its seams. */
export function PoppyTabIcon({ color: tint, size = 24 }: { color: string; focused: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={VIEWBOX}>
      <SeamedPetals petals={PETALS} fill={tint} seam={9} area={AREA} />
      <Path d={STUB} stroke={tint} strokeWidth={10} strokeLinecap="round" fill="none" />
      <Path d={CALYX_CUP} fill={tint} />
      <Path d={CALYX_BASE} fill={tint} />
    </Svg>
  );
}

/** Wordmark: the poppy beside "domi" in Figtree ExtraBold. */
export function Logo({ size = 24, tone = "bay" }: { size?: number; tone?: "bay" | "white" }) {
  const text = {
    fontFamily: font.wordmark,
    fontSize: size,
    lineHeight: size * 1.15,
    letterSpacing: -size * 0.02,
    color: tone === "white" ? color.white : color.bay,
  };
  return (
    <View style={[styles.row, { gap: size * 0.2 }]} accessible accessibilityRole="image" accessibilityLabel="Domi">
      <PoppyMark size={size * 1.2} tone={tone} />
      <Text style={text}>domi</Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center" } });
