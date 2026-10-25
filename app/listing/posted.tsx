import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useAskForPush } from "../../src/features/push/useAskForPush";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useShareListing } from "../../src/features/items/shareListing";
import { FreeDot, PhotoTile } from "../../src/ui/PhotoTile";
import { color, font, radius, space, type } from "../../src/ui/theme";

/** Right after posting: a giving moment, and where to look when people ask. */
export default function Posted() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = id as Id<"items">;
  const item = useQuery(convexQuery(api.items.get, { itemId })).data;
  const share = useShareListing();
  const insets = useSafeAreaInsets();
  const askForPush = useAskForPush();

  // The listing is up: a good moment to offer notifications (shown over this screen).
  useEffect(() => {
    const t = setTimeout(() => askForPush("post").catch(() => {}), 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const names = item?.circles.map((c) => c.name) ?? [];
  const where =
    names.length === 0 ? "Your circles" : names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const shortTitle = item ? item.title.charAt(0).toLowerCase() + item.title.slice(1) : "listing";

  // Leave this modal, then go somewhere in the app.
  const go = (to: () => void) => {
    router.dismissAll();
    to();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.card}>
        <View>
          <PhotoTile uri={item?.photoUrls[0]} style={styles.photo} />
          <View style={styles.dot}>
            <FreeDot />
          </View>
        </View>
        <Text style={[type.objectLabel, { paddingHorizontal: 4 }]} numberOfLines={2}>
          {item?.title ?? " "}
        </Text>
      </View>

      <Text style={styles.headline}>Your {shortTitle} is out there.</Text>
      <Text style={styles.sub}>{where} can see it now.</Text>

      <Pressable
        onPress={() => go(() => router.navigate("/mystuff"))}
        accessibilityRole="button"
        style={styles.track}
      >
        <Ionicons name="cube-outline" size={22} color={color.bay} />
        <Text style={[type.body, { flex: 1 }]}>
          Requests show up in the <Text style={{ fontFamily: font.uiSemi }}>My stuff</Text> tab. You'll pick who gets it
          there.
        </Text>
        <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={() => go(() => router.navigate("/post"))} style={styles.primary} accessibilityRole="button">
          <Text style={type.button}>Give something else</Text>
        </Pressable>
        <Pressable
          onPress={() => go(() => router.push({ pathname: "/item/[id]", params: { id: itemId } }))}
          style={styles.secondary}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>See your listing</Text>
        </Pressable>
        {item ? (
          <Pressable onPress={() => share(item.id, item.title)} style={styles.link} accessibilityRole="button">
            <Ionicons name="share-outline" size={18} color={color.bay} />
            <Text style={styles.linkText}>Share outside Domi</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.blush, alignItems: "center", paddingHorizontal: space.lg },
  card: {
    width: 200,
    padding: 10,
    paddingBottom: 14,
    gap: 10,
    backgroundColor: color.white,
    borderRadius: 18,
    transform: [{ rotate: "-3deg" }],
    shadowColor: color.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  photo: { height: 210, borderRadius: 12 },
  dot: { position: "absolute", top: 9, right: 9 },
  headline: { ...type.display, textAlign: "center", marginTop: space.xxl },
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
  actions: { marginTop: "auto", alignSelf: "stretch", gap: space.sm },
  primary: { height: 54, borderRadius: radius.control, backgroundColor: color.bay, alignItems: "center", justifyContent: "center" },
  secondary: {
    height: 50,
    borderRadius: radius.control,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: "rgba(24,34,46,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  link: { height: 44, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  linkText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
});
