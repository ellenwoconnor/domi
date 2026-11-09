import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { ListingEditor, type ListingValues } from "../../src/features/items/ListingEditor";
import { markWishAdded } from "../../src/features/wishlist/justAdded";
import { errorMessage } from "../../src/lib/errors";
import { color } from "../../src/ui/theme";

/** New wish: the listing editor in wish mode. `title` prefills it (from a Browse search). */
export default function NewWish() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  const circles = useQuery(convexQuery(api.communities.mine, {})).data;
  const create = useMutation(api.wishlist.create);

  if (!circles) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.white }}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }

  const close = (dirty: boolean) => {
    if (!dirty) return router.back();
    Alert.alert("Discard this wish?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const add = async (v: ListingValues) => {
    try {
      await create({ title: v.title, description: v.description || undefined, communityIds: v.circleIds });
      markWishAdded();
      router.back();
    } catch (e) {
      Alert.alert("Couldn't add your wish", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      kind="wish"
      // A wish shows in all your domis to start (the most people who might have one).
      initial={{ photos: [], title: title ?? "", description: "", circleIds: circles.map((c) => c.id) }}
      circles={circles}
      submitLabel="Add to my wishes"
      busyLabel="Adding…"
      onClose={close}
      onSubmit={add}
    />
  );
}
