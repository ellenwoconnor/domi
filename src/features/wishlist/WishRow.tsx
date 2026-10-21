import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { circleById, circleLabel, postedLabel } from "../items/mockData";
import { GiveButton } from "../../ui/GiveButton";
import { color, font, radius, space, type } from "../../ui/theme";
import { removeWish, type Wish } from "./store";

/** A wish, set like a placard on the wall: no photo, just the thing and who wants it. */
export function WishRow({ wish }: { wish: Wish }) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{wish.who.charAt(0)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={type.objectLabel}>{wish.title}</Text>
        <Text style={type.meta}>
          {wish.who}, {wish.area}, {postedLabel(wish.postedHoursAgo)}
        </Text>
        {wish.note ? <Text style={styles.note}>“{wish.note}”</Text> : null}
        <View style={{ marginTop: space.sm }}>
          <GiveButton onPress={() => router.push({ pathname: "/fulfill/[wishId]", params: { wishId: wish.id } })} />
        </View>
      </View>
    </View>
  );
}

/** One of your own wishes: where it's posted, and a way to take it down. */
export function MyWishRow({ wish }: { wish: Wish }) {
  const circles = wish.circleIds
    .map(circleById)
    .filter((c) => c !== undefined)
    .map(circleLabel)
    .join(", ");
  return (
    <View style={styles.mine}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.objectLabel}>{wish.title}</Text>
        <Text style={type.meta} numberOfLines={1}>
          In {circles}
        </Text>
      </View>
      <Pressable onPress={() => removeWish(wish.id)} hitSlop={10} accessibilityLabel={`Remove ${wish.title}`}>
        <Text style={styles.remove}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md, paddingVertical: space.lg },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 16, color: color.bay },
  body: { flex: 1, gap: 3, alignItems: "flex-start" },
  note: { ...type.body, fontSize: 15, lineHeight: 22, color: color.ink, marginTop: space.xs },
  mine: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.fog,
    borderRadius: radius.thing,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  remove: { fontFamily: font.uiSemi, fontSize: 14, color: color.bay },
});
