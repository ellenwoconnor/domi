import { StyleSheet, Text, View } from "react-native";
import { GiveButton } from "../../ui/GiveButton";
import { CircleMark } from "../../ui/Logo";
import { color, font, radius, space } from "../../ui/theme";

// The pictures on the "How Domi works" cards, drawn from the app's own shapes
// (circles for people, rounded rectangles for things). Decorative: each one
// carries a single accessibility label and hides its parts.

type Size = { width: number; height: number };

const hide = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/** Card 1: you (the logo mark) in the middle of a ring of neighbors, plus two example circles. */
export function CirclesPicture({ width, height }: Size) {
  const chipsSpace = 56;
  const cx = width / 2;
  const cy = (height - chipsSpace) / 2 + 4;
  const orbit = Math.max(56, Math.min(100, cy - 22));
  const neighbors: { initial: string; angle: number; tone: "blush" | "bay" | "white" }[] = [
    { initial: "M", angle: -90, tone: "blush" },
    { initial: "J", angle: -20, tone: "bay" },
    { initial: "P", angle: 40, tone: "white" },
    { initial: "A", angle: 145, tone: "blush" },
    { initial: "R", angle: 205, tone: "white" },
  ];
  const ring = 80;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="You, in the middle of your circle of neighbors"
      style={[styles.panel, { width, height, backgroundColor: color.fog }]}
    >
      <View {...hide} style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.orbit,
            { left: cx - orbit, top: cy - orbit, width: orbit * 2, height: orbit * 2, borderRadius: orbit },
          ]}
        />
        <View style={{ position: "absolute", left: cx - ring / 2, top: cy - ring / 2, width: ring, height: ring }}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: ring / 2, backgroundColor: color.white }]} />
          <CircleMark size={ring} />
        </View>
        {neighbors.map((n) => {
          const a = (n.angle * Math.PI) / 180;
          const x = cx + orbit * Math.cos(a);
          const y = cy + orbit * Math.sin(a);
          const bg = n.tone === "bay" ? color.bay : n.tone === "blush" ? color.blush : color.white;
          const fg = n.tone === "bay" ? color.white : n.tone === "blush" ? color.ink : color.bay;
          return (
            <View key={n.initial} style={[styles.neighbor, { left: x - 21, top: y - 21, backgroundColor: bg }]}>
              <Text style={[styles.initial, { color: fg }]}>{n.initial}</Text>
            </View>
          );
        })}
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: color.bay }]}>
            <CircleMark size={12} tone="white" />
            <Text style={[styles.chipText, { color: color.white }]}>Kensington</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: color.white }]}>
            <Text style={styles.chipText}>Maya's baby shower</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Card 2: a free listing (a wooden high chair) that three neighbors have asked for. */
export function GivePicture({ width, height }: Size) {
  const photo = Math.max(84, Math.min(140, height - 160));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="A free wooden high chair that three neighbors have asked for"
      style={[styles.panel, styles.center, { width, height, backgroundColor: color.blush }]}
    >
      <View {...hide} style={[styles.center, { gap: space.md }]}>
        <View style={styles.tile}>
          <View style={[styles.photo, { height: photo }]}>
            <HighChair scale={Math.min(1, photo / 150)} />
            <View style={styles.freeTag}>
              <View style={styles.dot} />
              <Text style={styles.freeText}>Free</Text>
            </View>
          </View>
          <View style={styles.caption}>
            <Text style={styles.objectLabel}>Wooden high chair</Text>
            <Text style={styles.meta}>Kensington · near the Arlington</Text>
          </View>
        </View>
        <View style={styles.askedPill}>
          <View style={{ flexDirection: "row" }}>
            {(
              [
                ["M", color.bay, color.white],
                ["J", color.blush, color.ink],
                ["A", color.fog, color.bay],
              ] as const
            ).map(([i, bg, fg], n) => (
              <View key={i} style={[styles.smallFace, { backgroundColor: bg, marginLeft: n === 0 ? 0 : -8 }]}>
                <Text style={[styles.smallInitial, { color: fg }]}>{i}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chipText}>3 neighbors asked</Text>
        </View>
      </View>
    </View>
  );
}

/** A line drawing of a high chair, built from thin bars (no SVG library in the app). */
function HighChair({ scale }: { scale: number }) {
  const s = (n: number) => n * scale;
  const bar = (left: number, top: number, w: number, h: number, rotate = 0) => (
    <View
      style={{
        position: "absolute",
        left: s(left),
        top: s(top),
        width: s(w),
        height: s(h),
        borderRadius: 2,
        backgroundColor: color.bay,
        transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
      }}
    />
  );
  return (
    <View style={{ width: s(96), height: s(120) }}>
      {bar(26, 9, 44, 3)}
      {bar(27, 9, 3, 46)}
      {bar(66, 9, 3, 46)}
      {bar(18, 53, 60, 3)}
      {bar(14, 61, 68, 3)}
      {bar(20, 62, 3, 54, 12)}
      {bar(73, 62, 3, 54, -12)}
      {bar(20, 91, 56, 3)}
    </View>
  );
}

/** Card 3: the Wishes board, with an "I have this" button on a neighbor's wish. */
export function WishPicture({ width, height }: Size) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="The Wishes board, where neighbors post what they're looking for"
      style={[styles.panel, { width, height, backgroundColor: color.fog, padding: space.md + 4, gap: space.md }]}
    >
      <View {...hide} style={{ gap: space.md }}>
        <View style={styles.segmented}>
          <Text style={[styles.segment, { color: color.inkSoft }]}>Offers</Text>
          <Text style={[styles.segment, styles.segmentOn]}>Wishes</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={styles.column}>
            <Wish title="Toddler bike helmet" note="Ours finally outgrew the old one." who="Jordan · Kensington" give />
            <Wish title="A ladder for one weekend" who="Ravi · El Cerrito" />
          </View>
          <View style={styles.column}>
            <Wish title="Board games for rainy days" who="Priya · Kensington" />
            <Wish title="Moving boxes" note="Any size. Happy to pick up." who="Ana · Kensington" />
          </View>
        </View>
      </View>
    </View>
  );
}

function Wish({ title, note, who, give = false }: { title: string; note?: string; who: string; give?: boolean }) {
  return (
    <View style={styles.wish}>
      <Text style={styles.objectLabel}>{title}</Text>
      {note ? <Text style={styles.meta}>{note}</Text> : null}
      <Text style={[styles.meta, { fontSize: 12.5 }]}>{who}</Text>
      {give ? (
        <View style={{ alignSelf: "flex-start", marginTop: 2 }}>
          <GiveButton small />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.sheet, overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#9FB3C6" },
  neighbor: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: font.uiBold, fontSize: 15 },
  chips: { position: "absolute", left: 0, right: 0, bottom: 16, flexDirection: "row", justifyContent: "center", gap: space.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: font.uiSemi, fontSize: 14, color: color.ink },
  tile: {
    width: 216,
    borderRadius: radius.thing,
    backgroundColor: color.white,
    overflow: "hidden",
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: { backgroundColor: color.fog, alignItems: "center", justifyContent: "center" },
  freeTag: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: color.white,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.poppy },
  freeText: { fontFamily: font.uiSemi, fontSize: 13, color: color.ink },
  caption: { paddingHorizontal: space.md, paddingTop: 10, paddingBottom: space.md, gap: 2 },
  objectLabel: { fontFamily: font.curator, fontSize: 17, lineHeight: 22, color: color.ink },
  meta: { fontFamily: font.ui, fontSize: 13.5, lineHeight: 19, color: color.inkSoft },
  askedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    paddingLeft: space.sm,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: color.white,
  },
  smallFace: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  smallInitial: { fontFamily: font.uiBold, fontSize: 13 },
  segmented: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 2,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: color.white,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
    fontFamily: font.uiSemi,
    fontSize: 14,
  },
  segmentOn: { backgroundColor: color.bay, color: color.white },
  column: { flex: 1, gap: 10 },
  wish: { backgroundColor: color.white, borderRadius: radius.thing, padding: space.md, gap: 6 },
});
