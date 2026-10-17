import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PhotoTile } from "../../ui/PhotoTile";
import { PorchTag } from "../../ui/PorchTag";
import { color, radius, type } from "../../ui/theme";
import { postedLabel, type Item } from "./mockData";

export function ItemCard({ item }: { item: Item }) {
  const pending = item.status === "pending";
  return (
    <Link href={{ pathname: "/item/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View>
          <PhotoTile emoji={item.emoji} seed={item.id} style={[styles.photo, pending && { opacity: 0.55 }]} />
          <View style={styles.tagSpot}>
            <PorchTag label={`${item.distanceMi} mi`} />
          </View>
          {pending && (
            <View style={styles.pending}>
              <Text style={styles.pendingText}>Pending pickup</Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={type.meta} numberOfLines={1}>
          {item.owner}, {postedLabel(item.postedHoursAgo)}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 4 },
  photo: { aspectRatio: 1, width: "100%", marginBottom: 6 },
  tagSpot: { position: "absolute", top: 10, left: 8 },
  pending: {
    position: "absolute",
    bottom: 16,
    left: 8,
    backgroundColor: color.pendingSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pendingText: { fontSize: 12, fontWeight: "600", color: color.pending },
  title: { ...type.heading, fontSize: 16, lineHeight: 20, color: color.ink },
});
