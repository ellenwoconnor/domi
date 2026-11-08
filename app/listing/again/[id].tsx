import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadListingPhotos } from "../../../src/features/give/photos";
import { ListingEditor, type ListingValues } from "../../../src/features/items/ListingEditor";
import { errorMessage } from "../../../src/lib/errors";
import { color } from "../../../src/ui/theme";

/**
 * "Share with others": an offer that ended (the wisher said no thanks, or their
 * wish came true with another offer) posted as an ordinary listing, starting
 * from its photos and words. The photos move over (items.create fromOfferId).
 */
export default function ShareAgain() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offerId = id as Id<"items">;
  const offer = useQuery(convexQuery(api.items.get, { itemId: offerId })).data;
  const circles = useQuery(convexQuery(api.communities.mine, {})).data;
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const create = useMutation(api.items.create);

  if (!offer || !circles || !me) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.white }}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }
  const home = circles.find((c) => c.kind === "zip") ?? circles[0];

  const close = (dirty: boolean) => {
    if (!dirty) return router.back();
    Alert.alert("Discard this listing?", "Your offer stays as it was.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const post = async (v: ListingValues) => {
    try {
      const uploaded = await uploadListingPhotos(v.photos, () => generateUploadUrl());
      const itemId = await create({
        title: v.title,
        description: v.description,
        ...uploaded,
        communityIds: v.circleIds,
        fromOfferId: offerId,
      });
      router.replace({ pathname: "/listing/posted", params: { id: itemId } });
    } catch (e) {
      Alert.alert("Couldn't post it", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      initial={{
        photos: (offer.ownerPhotos ?? []).map((p) => ({ uri: p.url, storageId: p.storageId, thumbId: p.thumbId })),
        title: offer.title,
        description: offer.description,
        circleIds: home ? [home.id] : [],
      }}
      circles={circles}
      ownerName={me.displayName}
      submitLabel="Post it"
      busyLabel="Posting…"
      onClose={close}
      onSubmit={post}
    />
  );
}
