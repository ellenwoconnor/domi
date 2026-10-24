import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadPhoto } from "../../../src/features/give/photos";
import { ListingEditor, type ListingValues } from "../../../src/features/items/ListingEditor";
import { errorMessage } from "../../../src/lib/errors";
import { color } from "../../../src/ui/theme";

/** Edit your listing: the same placard as posting, filled in. */
export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = id as Id<"items">;
  const item = useQuery(convexQuery(api.items.get, { itemId })).data;
  const circles = useQuery(convexQuery(api.communities.mine, {})).data;
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const update = useMutation(api.items.update);

  if (!item || !circles || !me) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.white }}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }

  const close = (dirty: boolean) => {
    if (!dirty) return router.back();
    Alert.alert("Discard your changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const save = async (v: ListingValues) => {
    try {
      const photos: Id<"_storage">[] = [];
      for (const p of v.photos) {
        photos.push((p.storageId ?? (await uploadPhoto(await generateUploadUrl(), p.uri))) as Id<"_storage">);
      }
      await update({ itemId, title: v.title, description: v.description, photos, communityIds: v.circleIds });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      initial={{
        photos: (item.ownerPhotos ?? []).map((p) => ({ uri: p.url, storageId: p.storageId })),
        title: item.title,
        description: item.description,
        circleIds: item.circles.map((c) => c.id),
      }}
      circles={circles}
      ownerName={me.displayName}
      submitLabel="Save"
      busyLabel="Saving…"
      onClose={close}
      onSubmit={save}
    />
  );
}
