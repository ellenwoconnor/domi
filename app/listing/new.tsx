import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, View } from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { draft, useDraftPhotos } from "../../src/features/give/draft";
import { uploadPhoto } from "../../src/features/give/photos";
import { ListingEditor, type ListingValues } from "../../src/features/items/ListingEditor";
import { errorMessage } from "../../src/lib/errors";
import { color } from "../../src/ui/theme";

/** New listing: the placard, starting from the photos taken on Give. */
export default function NewListing() {
  const photos = useDraftPhotos();
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const circlesQ = useQuery(convexQuery(api.communities.mine, {}));
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const create = useMutation(api.items.create);

  if (!circlesQ.data || !me) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.white }}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }
  const circles = circlesQ.data;
  // Default: your home circle. You can add others with Change.
  const home = circles.find((c) => c.kind === "zip") ?? circles[0];

  const close = (dirty: boolean) => {
    const leave = () => {
      draft.clear();
      router.back();
    };
    if (!dirty && photos.length === 0) return leave();
    Alert.alert("Discard this listing?", "Your photo and words won't be saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: leave },
    ]);
  };

  const post = async (v: ListingValues) => {
    try {
      const storageIds: Id<"_storage">[] = [];
      for (const p of v.photos) {
        storageIds.push((p.storageId ?? (await uploadPhoto(await generateUploadUrl(), p.uri))) as Id<"_storage">);
      }
      const itemId = await create({
        title: v.title,
        description: v.description,
        photos: storageIds,
        communityIds: v.circleIds,
      });
      draft.clear();
      router.replace({ pathname: "/listing/posted", params: { id: itemId } });
    } catch (e) {
      Alert.alert("Couldn't post it", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      initial={{ photos: photos.map((uri) => ({ uri })), title: "", description: "", circleIds: home ? [home.id] : [] }}
      circles={circles}
      ownerName={me.displayName}
      submitLabel="Post it"
      busyLabel="Posting…"
      onClose={close}
      onSubmit={post}
    />
  );
}
