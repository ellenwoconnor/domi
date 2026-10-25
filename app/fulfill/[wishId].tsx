import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { uploadListingPhotos } from "../../src/features/give/photos";
import { ListingEditor, type ListingValues } from "../../src/features/items/ListingEditor";
import { errorMessage } from "../../src/lib/errors";
import { color, font, space, type } from "../../src/ui/theme";

/**
 * "I have this": an offer for someone's wish, written on the same placard as
 * any listing, but it goes only to the wisher (spec "Wish offers").
 */
export default function Fulfill() {
  const { wishId } = useLocalSearchParams<{ wishId: string }>();
  const insets = useSafeAreaInsets();
  const wishQ = useQuery(convexQuery(api.wishlist.get, { wishId: wishId as Id<"wishlistItems"> }));
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const offer = useMutation(api.wishlist.offer);
  const wish = wishQ.data;

  if (wishQ.isPending || !me) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }

  if (!wish || wish.status !== "open" || wish.pending || wish.myOfferId || wish.isMine) {
    const why = !wish || wish.status !== "open"
      ? "This wish has been taken care of."
      : wish.myOfferId
        ? "You've already offered something for this wish."
        : wish.isMine
          ? "This is your own wish."
          : "Pickup is being arranged for another offer.";
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.xl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Text style={type.title}>{why}</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const name = wish.user.displayName;

  const close = (dirty: boolean) => {
    if (!dirty) return router.back();
    Alert.alert("Discard this offer?", "Your photo and words won't be saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const send = async (v: ListingValues) => {
    try {
      const uploaded = await uploadListingPhotos(v.photos, () => generateUploadUrl());
      const itemId = await offer({ wishId: wish.id, title: v.title, description: v.description, ...uploaded });
      router.replace({ pathname: "/fulfill/sent", params: { id: itemId } });
    } catch (e) {
      Alert.alert("Couldn't send your offer", errorMessage(e, "Check your connection and try again."));
    }
  };

  return (
    <ListingEditor
      initial={{ photos: [], title: wish.title, description: "", circleIds: [] }}
      circles={[]}
      ownerName={me.displayName}
      submitLabel={`Send to ${name}`}
      busyLabel="Sending…"
      sendTo={{ name }}
      onClose={close}
      onSubmit={send}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
});
