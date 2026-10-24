import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useDraftPhotos } from "../../src/features/give/draft";
import { PhotoTile } from "../../src/ui/PhotoTile";
import { color, space, type } from "../../src/ui/theme";

/** Placeholder until the placard (M3 row 3): shows the photos that came from Give. */
export default function NewListing() {
  const photos = useDraftPhotos();
  return (
    <View style={{ flex: 1, padding: space.lg, paddingTop: 80, gap: space.md, backgroundColor: color.white }}>
      <Text style={type.title}>{photos.length} photo{photos.length === 1 ? "" : "s"}</Text>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {photos.map((uri) => (
          <PhotoTile key={uri} uri={uri} style={{ width: 96, height: 120 }} />
        ))}
      </View>
      <Pressable onPress={() => router.back()}>
        <Text style={type.label}>Back</Text>
      </Pressable>
    </View>
  );
}
