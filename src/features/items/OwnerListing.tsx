import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { color, font, radius, space, type } from "../../ui/theme";
import { postedLabel, type ItemView } from "./format";
import { useShareListing } from "./shareListing";

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(expiresAt: number) {
  const d = Math.ceil((expiresAt - Date.now()) / DAY);
  return d <= 1 ? "last day" : `${d} days left`;
}

/** Under the title on your own listing: where it stands, and what happens next. */
export function OwnerStatus({ item }: { item: ItemView }) {
  const live = item.status === "available" || item.status === "pending";
  const n = item.requestCount;
  const [head, body] =
    item.status === "expired"
      ? ["Expired", "Post it again for another 30 days. Anyone who asked is still in line."]
      : item.status === "pending"
        ? ["Going to someone", "You picked someone. Plan pickup in your chat, then mark it picked up."]
        : item.status === "gone"
          ? ["Picked up", "It found a new home."]
          : item.status === "removed"
            ? ["Removed", "Neighbors can't see this listing anymore."]
            : n === 0
              ? [
                  "No requests yet",
                  "When neighbors ask, you'll see their notes and pick one person to give it to. Then a private chat opens to plan pickup.",
                ]
              : [
                  `${n} ${n === 1 ? "neighbor" : "neighbors"} asked`,
                  "Pick one person to give it to. A private chat opens with them to plan pickup.",
                ];
  return (
    <View style={{ gap: space.md }}>
      <Text style={type.meta}>
        Your listing · posted {postedLabel(item.createdAt)}
        {live ? ` · ${daysLeft(item.expiresAt)}` : ""}
      </Text>
      <View style={[styles.card, live && n > 0 && styles.cardNeeds]}>
        <Text style={styles.cardHead}>{head}</Text>
        <Text style={type.meta}>{body}</Text>
      </View>
    </View>
  );
}

/** "Remove listing", quiet, at the end of your own listing. */
export function RemoveListingLink({ item }: { item: ItemView }) {
  const remove = useMutation(api.items.remove);
  if (item.status === "gone" || item.status === "removed") return null;
  const confirm = () =>
    Alert.alert(
      "Remove this listing?",
      item.requestCount > 0 ? "Everyone who asked will be told it's no longer available." : "Neighbors won't see it anymore.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await remove({ itemId: item.id });
              router.back();
            } catch (e) {
              Alert.alert("Couldn't remove it", errorMessage(e));
            }
          },
        },
      ],
    );
  return (
    <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
      <Text style={styles.remove}>Remove listing</Text>
    </Pressable>
  );
}

/** The action bar on your own listing: Edit and Share, or Post again once it expired. */
export function OwnerBar({ item }: { item: ItemView }) {
  const share = useShareListing();
  const repost = useMutation(api.items.repost);
  const [busy, setBusy] = useState(false);

  if (item.status === "expired") {
    return (
      <Pressable
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await repost({ itemId: item.id });
          } catch (e) {
            Alert.alert("Couldn't post it again", errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
        style={[styles.primary, busy && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Text style={type.button}>Post it again</Text>
      </Pressable>
    );
  }
  if (item.status !== "available" && item.status !== "pending") {
    return <Text style={type.meta}>This listing has ended.</Text>;
  }
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push({ pathname: "/listing/edit/[id]", params: { id: item.id } })}
        style={[styles.button, styles.secondary]}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={18} color={color.ink} />
        <Text style={styles.secondaryText}>Edit</Text>
      </Pressable>
      <Pressable onPress={() => share(item.id, item.title)} style={[styles.button, styles.primaryFlex]} accessibilityRole="button">
        <Ionicons name="share-outline" size={18} color={color.white} />
        <Text style={[type.button, { fontSize: 16 }]}>Share outside Domi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.fog, borderRadius: radius.thing, padding: 14, gap: 2 },
  cardNeeds: { backgroundColor: color.blush },
  cardHead: { fontFamily: font.uiSemi, fontSize: 15, color: color.ink },
  remove: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft, textDecorationLine: "underline" },
  row: { flexDirection: "row", gap: 10 },
  button: { height: 50, borderRadius: radius.control, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  secondary: { flex: 1, borderWidth: 1, borderColor: color.line },
  secondaryText: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  primaryFlex: { flex: 2, backgroundColor: color.bay },
  primary: { height: 54, borderRadius: radius.control, backgroundColor: color.bay, alignItems: "center", justifyContent: "center" },
});
