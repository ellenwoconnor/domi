import { useWindowDimensions } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { color } from "../../ui/theme";
import { THANKS_CALYX, THANKS_PETALS, THANKS_STEM } from "./thanksPaths";

// The scene is drawn on a 390 × 330 board and scaled to the screen width.
const W = 390;
const H = 330;
const HILL_BACK = "#D6E2EB"; // Fog, one step darker, for the far hill

/**
 * Where flowers come up, newest first: big ones on the front hill, then
 * smaller ones further back. A garden, not a tally: it shows at most this many,
 * and no number is ever shown (docs/spec.md, "Domi flower").
 */
const SPOTS = [
  { x: 300, y: 300, s: 0.46, r: -14 },
  { x: 360, y: 296, s: 0.36, r: -24 },
  { x: 196, y: 202, s: 0.22, r: -18 },
  { x: 64, y: 182, s: 0.17, r: -16 },
  { x: 150, y: 178, s: 0.15, r: -22 },
  { x: 112, y: 208, s: 0.2, r: -10 },
  { x: 252, y: 196, s: 0.19, r: -20 },
  { x: 352, y: 168, s: 0.15, r: -12 },
];
export const GARDEN_MAX = SPOTS.length;

/** One domi flower, planted with its stem foot at (x, y). Petal seams are cut with a white stroke. */
function Flower({ x, y, s, r }: (typeof SPOTS)[number]) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-52.5 -300)`}>
      <Path d={THANKS_STEM} stroke={color.bay} strokeWidth={7} strokeLinecap="round" fill="none" />
      {THANKS_PETALS.map((d) => (
        <Path key={d} d={d} fill={color.poppy} stroke={color.white} strokeWidth={5} />
      ))}
      <Path d={THANKS_CALYX[1]} fill={color.bay} />
    </G>
  );
}

/** A two-leaf seedling: a spot where a flower can still come up. */
function Sprout({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s * 2.6})`}>
      <Path d="M0 0 q1.5 -14 -1 -26" stroke={color.bay} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M-0.5 -17 q-12 -3 -16 -14 q12 0 16 14z" fill={color.bay} />
      <Path d="M0 -21 q11 -5 15 -15 q-12 1 -15 15z" fill={color.bay} />
    </G>
  );
}

/** Before the first thank-you: the front spot has a closed bud just showing Poppy, and a watering can. */
function BudAndCan() {
  return (
    <G>
      <G transform="translate(300 300)">
        <Path d="M0 0 q2 -30 -3 -62" stroke={color.bay} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <Path d="M-0.5 -22 q-15 -3 -20 -16 q15 0 20 16z" fill={color.bay} />
        <Path d="M0.5 -30 q14 -6 18 -18 q-14 1 -18 18z" fill={color.bay} />
        <Ellipse cx={-3} cy={-74} rx={7} ry={11} transform="rotate(-10 -3 -74)" fill={color.poppy} />
        <Path d="M-12 -66 q-1 -12 9 -18 q10 6 9 18 q-9 6 -18 0z" fill={color.bay} />
      </G>
      <G fill="none" stroke={color.bay} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        <Path d="M44 292 h30 l-3 -22 h-24 z" />
        <Path d="M71 278 l16 -10" />
        <Path d="M50 270 q9 -12 18 0" />
      </G>
      <Circle cx={90} cy={272} r={1.6} fill={color.bay} />
      <Circle cx={93} cy={278} r={1.6} fill={color.bay} />
      <Circle cx={96} cy={284} r={1.6} fill={color.bay} />
    </G>
  );
}

/**
 * The hillside across the top of You: a few houses on the far ridge and a
 * domi flower for each thank-you you've been sent (up to GARDEN_MAX), newest
 * on the front hill. Spots not yet flowering show seedlings. With none yet,
 * a closed bud and a watering can say it all, without words.
 */
export function Garden({ flowers }: { flowers: number }) {
  const { width } = useWindowDimensions();
  const height = (width / W) * H;
  const n = Math.min(flowers, GARDEN_MAX);
  const shown = SPOTS.slice(0, n);
  // With no flowers the front spot holds the bud (BudAndCan), not a seedling.
  const sprouts = SPOTS.slice(n === 0 ? 1 : n);
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${W} ${H}`}
      accessibilityRole="image"
      accessibilityLabel={
        flowers > 0 ? "Your garden of domi flowers from people you gave things to" : "Your garden: seedlings, and one bud about to open"
      }
    >
      <Rect width={W} height={H} fill={color.fog} />
      <G fill="none" stroke={color.bay} strokeWidth={2} strokeLinejoin="round">
        <Path d="M232 168 v-14 l10 -9 l10 9 v14 z" />
        <Path d="M258 168 v-18 l12 -10 l12 10 v18 z" />
        <Path d="M288 168 v-12 l8 -7 l8 7 v12 z" />
      </G>
      <Path d="M0 190 C 90 140, 180 178, 240 168 S 350 150, 390 160 V 330 H 0 Z" fill={HILL_BACK} />
      {/* Back-hill flowers sit behind the front hill. */}
      {sprouts.filter((f) => f.y < 230).map((f) => <Sprout key={`s${f.x}`} x={f.x} y={f.y} s={f.s} />)}
      {shown.filter((f) => f.y < 230).map((f) => <Flower key={`${f.x}`} {...f} />)}
      <Path d="M0 250 C 100 214, 200 240, 280 228 S 360 220, 390 224 V 330 H 0 Z" fill={color.white} />
      {sprouts.filter((f) => f.y >= 230).map((f) => <Sprout key={`s${f.x}`} x={f.x} y={f.y} s={f.s} />)}
      {shown.filter((f) => f.y >= 230).map((f) => <Flower key={`${f.x}`} {...f} />)}
      {n === 0 ? <BudAndCan /> : null}
    </Svg>
  );
}
