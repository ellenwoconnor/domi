import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FreeDot, PhotoTile } from "../../ui/PhotoTile";
import { color, font, radius, space, type } from "../../ui/theme";
import { distanceLabel, postedLabel, type ItemView } from "./format";

/** One object, one label: photo, title in the curator's italic, then who and how far. */
export function ItemCard({ item, me }: { item: ItemView; me?: { approxLat: number; approxLng: number } | null }) {
  const pending = item.status === "pending";
  const away = distanceLabel(me, item);
  const meta = item.isOwner
    ? `Yours · posted ${postedLabel(item.createdAt)}`
    : away
      ? `${item.owner.displayName}, ${away}`
      : item.owner.displayName;
  return (
    <Link href={{ pathname: "/item/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        <View>
          <PhotoTile uri={item.thumbUrls[0]} dimmed={pending} style={styles.photo} />
          {item.isOwner || pending ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.isOwner ? "Yours" : "Pending pickup"}</Text>
            </View>
          ) : (
            <View style={styles.dot}>
              <FreeDot />
            </View>
          )}
        </View>
        <Text style={type.objectLabel} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={type.meta} numberOfLines={1}>
          {meta}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 3 },
  photo: { aspectRatio: 4 / 5, width: "100%", marginBottom: space.sm },
  dot: { position: "absolute", top: 10, right: 10 },
  tag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: { fontFamily: font.uiSemi, fontSize: 12, color: color.bay },
});
