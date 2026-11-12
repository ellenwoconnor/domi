import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./Avatar";
import { IconButton } from "./IconButton";
import { PoppyMark } from "./Logo";
import { PhotoTile } from "./PhotoTile";
import { color, font, radius, space, type } from "./theme";

/**
 * The top of a listing or a wish (docs: "Domi design principles", Screen patterns; canvas
 * "Domi: listing screens, yours vs. theirs"). One Blush band for every listing and wish, yours
 * or someone else's: back on the left, the thing's round actions on the right (white on Blush),
 * then the thing itself — a square photo print for a listing, a line like "Timothy is looking
 * for" for a wish — its title, and a byline.
 */
export function DetailHeader({
  actions,
  photoUrls,
  dimmed = false,
  sticker = null,
  kicker,
  title,
  byline,
  ended = null,
}: {
  actions?: ReactNode;
  photoUrls?: string[];
  dimmed?: boolean;
  /** On the photo's corner: "free" for someone else's free listing, "poppy" once it's yours. */
  sticker?: "free" | "poppy" | null;
  kicker?: string;
  title: string;
  byline: ReactNode;
  /** It's over ("Expired", "Removed", "Closed"): Fog instead of Blush, a black-and-white photo, this word as a tag. */
  ended?: string | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, ended ? { backgroundColor: color.fog } : null, { paddingTop: insets.top + space.sm }]}>
      <View style={styles.topRow}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        {actions}
      </View>
      {photoUrls ? <PhotoPrint urls={photoUrls} dimmed={dimmed && !ended} ended={ended} sticker={ended ? null : sticker} /> : null}
      {ended && !photoUrls ? (
        <View style={[styles.endedTag, styles.endedAlone]}>
          <Text style={styles.endedText}>{ended}</Text>
        </View>
      ) : kicker ? (
        <Text style={[styles.kicker, !photoUrls && { marginTop: space.md }]}>{kicker}</Text>
      ) : null}
      <Text
        style={[
          type.display,
          styles.title,
          { marginTop: kicker || (ended && !photoUrls) ? 6 : photoUrls ? 22 : space.md },
          !photoUrls && { fontSize: 36, lineHeight: 42 },
          ended ? { color: color.inkSoft } : null,
        ]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {byline}
    </View>
  );
}

const PRINT = 264;

/** Every listing photo is the same square, cropped to fill, shown as a print tilted a touch. Swipe for more. */
function PhotoPrint({
  urls,
  dimmed,
  ended,
  sticker,
}: {
  urls: string[];
  dimmed: boolean;
  ended: string | null;
  sticker: "free" | "poppy" | null;
}) {
  const [page, setPage] = useState(0);
  return (
    <View style={styles.printWrap}>
      <View style={styles.print}>
        {urls.length <= 1 ? (
          <PhotoTile uri={urls[0]} dimmed={dimmed || !!ended} grayscale={!!ended} style={styles.photo} />
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.photo}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / PRINT))}
            accessibilityLabel={`Photo ${page + 1} of ${urls.length}`}
          >
            {urls.map((uri) => (
              <PhotoTile key={uri} uri={uri} dimmed={dimmed || !!ended} grayscale={!!ended} rounded={false} style={{ width: PRINT, height: PRINT }} />
            ))}
          </ScrollView>
        )}
        {ended ? (
          <View style={[styles.endedTag, styles.endedOnPrint]}>
            <Text style={styles.endedText}>{ended}</Text>
          </View>
        ) : sticker === "free" ? (
          <View style={styles.free} accessibilityLabel="Free">
            <View style={styles.freeDot} />
            <Text style={styles.freeText}>Free</Text>
          </View>
        ) : sticker === "poppy" ? (
          <View style={styles.poppy}>
            <PoppyMark size={60} />
          </View>
        ) : null}
      </View>
      {urls.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {urls.map((uri, i) => (
            <View key={uri} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** A person under a title: their initial, their name (or "You"), then where and when. */
export function Byline({ name, meta, center = true }: { name: string; meta?: string | null; center?: boolean }) {
  return (
    <View style={[styles.byline, center && { justifyContent: "center" }]}>
      <Avatar name={name} size={28} onFog />
      <Text style={styles.bylineText} numberOfLines={2}>
        <Text style={styles.bylineName}>{name}</Text>
        {meta ? ` · ${meta}` : ""}
      </Text>
    </View>
  );
}

/** The domis something is shared in, as Fog pills: every one of them, never "and 1 more". */
export function DomiPills({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <View style={styles.pills} accessibilityLabel={`Shared with ${labels.join(", ")}`}>
      {labels.map((l) => (
        <View key={l} style={styles.pill}>
          <Text style={styles.pillText}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

/** The bottom of a listing or wish: description, then the pills. */
export function About({ description, pills, extra }: { description?: string | null; pills?: string[]; extra?: ReactNode }) {
  if (!description && !pills?.length && !extra) return null;
  return (
    <View style={{ gap: 14 }}>
      {description ? <Text style={type.body}>{description}</Text> : null}
      {extra}
      {pills?.length ? <DomiPills labels={pills} /> : null}
    </View>
  );
}

/** One line of context over a bottom bar's button. */
export function BarNote({ children }: { children: ReactNode }) {
  return <Text style={[type.meta, { textAlign: "center" }]}>{children}</Text>;
}


const styles = StyleSheet.create({
  band: {
    backgroundColor: color.blush,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: space.lg,
    paddingBottom: 26,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  printWrap: { alignItems: "center", marginTop: space.md },
  print: {
    width: PRINT + 12,
    height: PRINT + 12,
    padding: 6,
    backgroundColor: color.white,
    borderRadius: radius.thing,
    transform: [{ rotate: "-2deg" }],
    shadowColor: color.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: { width: PRINT, height: PRINT, borderRadius: 11, overflow: "hidden" },
  free: {
    position: "absolute",
    top: -12,
    left: -12,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: color.poppy,
    transform: [{ rotate: "-4deg" }],
  },
  freeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.white },
  freeText: { fontFamily: font.uiBold, fontSize: 15, color: color.ink },
  poppy: { position: "absolute", top: -26, left: -22, transform: [{ rotate: "-4deg" }] },
  endedTag: {
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.line,
  },
  endedOnPrint: { position: "absolute", top: -12, left: -12, transform: [{ rotate: "-4deg" }] },
  endedAlone: { alignSelf: "center", marginTop: space.md },
  endedText: { fontFamily: font.uiBold, fontSize: 13, letterSpacing: 0.3, color: color.inkSoft },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(31,78,121,0.3)" },
  dotOn: { width: 18, backgroundColor: color.bay },
  kicker: { fontFamily: font.uiSemi, fontSize: 14, lineHeight: 18, color: color.inkSoft, textAlign: "center", marginTop: 22 },
  title: { fontSize: 32, lineHeight: 38, textAlign: "center", marginTop: 6, marginBottom: 10 },
  byline: { flexDirection: "row", alignItems: "center", gap: space.sm },
  bylineText: { fontFamily: font.ui, fontSize: 14, lineHeight: 19, color: color.inkSoft, flexShrink: 1 },
  bylineName: { fontFamily: font.uiSemi, color: color.ink },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pill: { height: 32, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.fog },
  pillText: { fontFamily: font.uiMedium, fontSize: 14, color: color.ink },
});
