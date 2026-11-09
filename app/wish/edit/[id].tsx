import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ListingEditor, type ListingValues } from "../../../src/features/items/ListingEditor";
import { errorMessage } from "../../../src/lib/errors";
import { color } from "../../../src/ui/theme";

/** Edit your wish: the same editor as adding one, filled in (like editing a listing). */
export default function EditWish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wishId = id as Id<"wishlistItems">;
  const wish = useQuery(convexQuery(api.wishlist.get, { wishId })).data;
  const circles = useQuery(convexQuery(api.communities.mine, {})).data;
  const update = useMutation(api.wishlist.update);

  if (!wish || !circles) {
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
      await update({ wishId, title: v.title, description: v.description, communityIds: v.circleIds });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      kind="wish"
      initial={{ photos: [], title: wish.title, description: wish.description ?? "", circleIds: wish.circles.map((c) => c.id) }}
      circles={circles}
      submitLabel="Save"
      busyLabel="Saving…"
      onClose={close}
      onSubmit={save}
    />
  );
}
