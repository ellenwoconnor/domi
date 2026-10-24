import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { draft } from "../../src/features/give/draft";
import { MAX_PHOTOS, pickPhotos, takePhoto } from "../../src/features/give/photos";
import { ShutterRow, Viewfinder } from "../../src/features/give/Viewfinder";
import { useWishes } from "../../src/features/wishlist/store";
import { GiveButton } from "../../src/ui/GiveButton";
import { TabHeader } from "../../src/ui/TabHeader";
import { color, radius, space, type } from "../../src/ui/theme";

/**
 * Give: camera first. One tap takes the photo and goes straight to the new
 * listing, where up to two more can be added. The library is one tap away.
 */
export default function Give() {
  const wanted = useWishes().filter((w) => !w.mine && w.status === "open");
  const [busy, setBusy] = useState(false);

  const start = async (get: () => Promise<string[]>) => {
    if (busy) return;
    setBusy(true);
    try {
      const photos = await get();
      if (photos.length === 0) return;
      draft.set(photos);
      router.push("/listing/new");
    } catch {
      Alert.alert("Couldn't use that photo", "Try again, or pick a different one.");
    } finally {
      setBusy(false);
    }
  };
  const camera = () => start(async () => {
    const p = await takePhoto();
    return p ? [p] : [];
  });
  const library = () => start(() => pickPhotos(MAX_PHOTOS));

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.head}>
        <TabHeader title="What's moving on?" subtitle="Start with a photo. Good light, the whole thing, a little room around it." />
      </View>

      <Viewfinder style={styles.viewfinder} onPress={camera} busy={busy} />
      <ShutterRow onShutter={camera} onLibrary={library} busy={busy} />

      {wanted.length > 0 && (
        <View style={styles.strip}>
          <Text style={[type.label, styles.pad]}>Your circles are looking for</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {wanted.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => router.push({ pathname: "/fulfill/[wishId]", params: { wishId: w.id } })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <Text style={type.objectLabel} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={type.meta} numberOfLines={1}>
                  {w.who}, {w.area}
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <GiveButton small />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  head: { marginBottom: space.lg },
  pad: { paddingHorizontal: space.lg },
  viewfinder: { marginHorizontal: space.lg },
  strip: { gap: space.sm, paddingBottom: space.md },
  cards: { gap: space.sm, paddingHorizontal: space.lg },
  card: {
    width: 220,
    gap: 2,
    padding: space.md,
    borderRadius: radius.thing,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "flex-start",
  },
});
