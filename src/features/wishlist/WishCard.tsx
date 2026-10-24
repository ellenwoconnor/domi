import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { FunctionReturnType } from "convex/server";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { GiveButton } from "../../ui/GiveButton";
import { color, font, radius, space } from "../../ui/theme";
import { postedLabel } from "../items/format";

export type WishView = FunctionReturnType<typeof api.wishlist.browse>[number];

// Long text is cut off, never allowed to run: titles at 3 lines, notes at 5.
// The wish screen shows everything.
const TITLE_LINES = 3;
const NOTE_LINES = 5;

/**
 * One wish on the board (Browse › Wishes, canvas "Wishes B"): a card that
 * grows with its words, like a note pinned up. Yours are Fog; others are Blush;
 * a pending one is quiet and has no button.
 */
export function WishCard({ wish, onLongPress }: { wish: WishView; onLongPress?: (w: WishView) => void }) {
  const note = wish.description?.trim() || null;
  const open = () =>
    wish.myOfferId
      ? router.push({ pathname: "/item/[id]", params: { id: wish.myOfferId } })
      : router.push({ pathname: "/wish/[id]", params: { id: wish.id } });
  const quiet = wish.pending && !wish.isMine;

  return (
    <Pressable
      onPress={open}
      onLongPress={wish.isMine || !onLongPress ? undefined : () => onLongPress(wish)}
      accessibilityRole="button"
      accessibilityHint={wish.isMine ? undefined : "Long press to report or block"}
      style={({ pressed }) => [
        styles.card,
        wish.isMine ? styles.mine : quiet ? styles.quiet : styles.theirs,
        pressed && { opacity: 0.8 },
      ]}
    >
      {wish.isMine ? <Text style={styles.label}>Your wish</Text> : null}
      {quiet ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>Pending pickup</Text>
        </View>
      ) : null}

      <Text style={[styles.title, quiet && { color: color.inkSoft }]} numberOfLines={TITLE_LINES}>
        {wish.title}
      </Text>
      {note && !quiet ? (
        <Text style={styles.note} numberOfLines={NOTE_LINES}>
          {wish.isMine ? note : `“${note}”`}
        </Text>
      ) : null}
      {wish.isMine ? null : (
        <Text style={styles.meta} numberOfLines={1}>
          {wish.user.displayName} · {postedLabel(wish.createdAt)}
        </Text>
      )}

      <Footer wish={wish} />
    </Pressable>
  );
}

function Footer({ wish }: { wish: WishView }) {
  if (wish.isMine) {
    if (wish.pending) return <Text style={styles.meta}>Pickup being arranged</Text>;
    const n = wish.offerCount ?? 0;
    if (n === 0) return <Text style={styles.meta}>No offers yet</Text>;
    return (
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.pillText}>{n === 1 ? "1 offer" : `${n} offers`}</Text>
      </View>
    );
  }
  if (wish.pending) return null;
  if (wish.myOfferId) {
    return (
      <View style={styles.offered}>
        <Ionicons name="checkmark" size={17} color={color.bay} />
        <Text style={styles.offeredText}>You offered</Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: space.xs }}>
      <GiveButton small onBlush onPress={() => router.push({ pathname: "/fulfill/[wishId]", params: { wishId: wish.id } })} />
    </View>
  );
}

/**
 * Two columns, each card in the shorter one so far. Heights are estimated from
 * the text so the columns stay roughly even without measuring.
 */
export function masonry(wishes: WishView[]): [WishView[], WishView[]] {
  const cols: [WishView[], WishView[]] = [[], []];
  const heights = [0, 0];
  for (const w of wishes) {
    const titleLines = Math.min(TITLE_LINES, Math.ceil(w.title.length / 14));
    const note = w.description?.trim() ?? "";
    const noteLines = w.pending && !w.isMine ? 0 : Math.min(NOTE_LINES, Math.ceil(note.length / 18));
    const h = 70 + titleLines * 23 + noteLines * 20 + (w.isMine ? 18 : 0);
    const i = heights[0] <= heights[1] ? 0 : 1;
    cols[i].push(w);
    heights[i] += h + space.md;
  }
  return cols;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.thing, padding: 14, gap: 6, alignItems: "flex-start" },
  mine: { backgroundColor: color.fog },
  theirs: { backgroundColor: color.blush },
  quiet: { backgroundColor: "#F4F6F8" },
  label: { fontFamily: font.uiSemi, fontSize: 12.5, color: color.bay },
  tag: { backgroundColor: color.white, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: font.uiSemi, fontSize: 12, color: color.bay },
  title: { fontFamily: font.curator, fontSize: 18, lineHeight: 23, color: color.ink, alignSelf: "stretch" },
  note: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.ink, alignSelf: "stretch" },
  meta: { fontFamily: font.ui, fontSize: 13, lineHeight: 18, color: color.inkSoft },
  pill: {
    marginTop: space.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: color.white,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.poppy },
  pillText: { fontFamily: font.uiSemi, fontSize: 13.5, color: color.ink },
  offered: { marginTop: space.xs, flexDirection: "row", alignItems: "center", gap: 5, height: 30 },
  offeredText: { fontFamily: font.uiSemi, fontSize: 13.5, color: color.bay },
});
