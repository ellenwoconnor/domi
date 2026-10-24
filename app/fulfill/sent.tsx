import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FreeDot, PhotoTile } from "../../src/ui/PhotoTile";
import { color, font, radius, space, type } from "../../src/ui/theme";

/**
 * After offering on a wish: a giving moment. Your item pinned over the wish it
 * answers, and a thank-you. (Canvas "You answered Sam's wish".)
 */
export default function OfferSent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = id as Id<"items">;
  const item = useQuery(convexQuery(api.items.get, { itemId })).data;
  const insets = useSafeAreaInsets();
  const name = item?.wish?.wisher.displayName ?? "them";

  // Leave this modal, then go somewhere in the app.
  const go = (to?: () => void) => {
    router.dismissAll();
    to?.();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      <View aria-hidden style={[styles.ring, { left: 34, top: insets.top + 30 }]} />
      <View aria-hidden style={[styles.dot, { right: 44, top: insets.top + 60 }]} />
      <View aria-hidden style={[styles.dot, { left: 58, top: insets.top + 270, width: 8, height: 8 }]} />
      <View aria-hidden style={[styles.ring, { right: 30, top: insets.top + 240, width: 18, height: 18 }]} />

      <View style={styles.stack}>
        <View style={styles.wishCard}>
          <Text style={styles.kicker}>{name} wished for</Text>
          <Text style={[type.objectLabel, { fontSize: 20, lineHeight: 25 }]} numberOfLines={3}>
            {item?.wish?.title ?? " "}
          </Text>
          {item?.wish?.description ? (
            <Text style={[type.caption, { fontSize: 14, lineHeight: 20 }]} numberOfLines={3}>
              “{item.wish.description}”
            </Text>
          ) : null}
        </View>
        <View style={styles.offerCard}>
          <View>
            <PhotoTile uri={item?.photoUrls[0]} style={styles.photo} />
            <View style={styles.freeDot}>
              <FreeDot />
            </View>
          </View>
          <Text style={[type.objectLabel, { fontSize: 14, lineHeight: 18, paddingHorizontal: 3 }]} numberOfLines={2}>
            {item?.title ?? " "}
          </Text>
        </View>
      </View>

      <Text style={styles.headline}>You answered{"\n"}{name}'s wish.</Text>
      <Text style={styles.sub}>
        That's a kind thing to do. {name} will see it with any other offers and pick one. If it's yours, a chat opens.
      </Text>

      <Pressable onPress={() => go(() => router.navigate("/mystuff"))} accessibilityRole="button" style={styles.track}>
        <Ionicons name="cube-outline" size={22} color={color.bay} />
        <Text style={[type.body, { flex: 1, fontSize: 15 }]}>
          You'll find your offer in <Text style={{ fontFamily: font.uiSemi }}>My stuff</Text>.
        </Text>
        <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={() => go()} style={styles.primary} accessibilityRole="button">
          <Text style={type.button}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.blush, alignItems: "center", paddingHorizontal: space.lg },
  ring: { position: "absolute", width: 14, height: 14, borderRadius: 9, borderWidth: 3.5, borderColor: color.bay, opacity: 0.35 },
  dot: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: color.poppy },
  stack: { width: 250, height: 290 },
  wishCard: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 190,
    height: 220,
    backgroundColor: color.white,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    overflow: "hidden",
    transform: [{ rotate: "-6deg" }],
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  kicker: { fontFamily: font.uiSemi, fontSize: 12.5, color: color.inkSoft },
  offerCard: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 160,
    padding: 9,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: color.white,
    borderRadius: 16,
    transform: [{ rotate: "5deg" }],
    shadowColor: color.ink,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  photo: { height: 150, borderRadius: 11 },
  freeDot: { position: "absolute", top: 8, right: 8 },
  headline: { ...type.display, textAlign: "center", marginTop: space.xl },
  sub: { ...type.body, color: color.inkSoft, textAlign: "center", marginTop: space.sm },
  track: {
    marginTop: space.xl,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.white,
    borderRadius: radius.thing,
    padding: space.md,
  },
  actions: { marginTop: "auto", alignSelf: "stretch" },
  primary: { height: 54, borderRadius: radius.control, backgroundColor: color.bay, alignItems: "center", justifyContent: "center" },
});
