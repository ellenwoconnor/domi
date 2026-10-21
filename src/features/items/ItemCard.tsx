import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FreeDot, PhotoTile } from "../../ui/PhotoTile";
import { color, font, radius, space, type } from "../../ui/theme";
import type { Item } from "./mockData";

/** One object, one label: photo, title in the curator's italic, then where it is. */
export function ItemCard({ item }: { item: Item }) {
  const pending = item.status === "pending";
  return (
    <Link href={{ pathname: "/item/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        <View>
          <PhotoTile emoji={item.emoji} dimmed={pending} style={styles.photo} />
          {pending ? (
            <View style={styles.pending}>
              <Text style={styles.pendingText}>Pending pickup</Text>
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
          {item.area}, {item.distanceMi} mi
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 3 },
  photo: { aspectRatio: 4 / 5, width: "100%", marginBottom: space.sm },
  dot: { position: "absolute", top: 10, right: 10 },
  pending: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pendingText: { fontFamily: font.uiSemi, fontSize: 12, color: color.bay },
});
