import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { circleLabel, distanceLabel, postedLabel } from "../../src/features/items/format";
import {
  GiveSheet,
  OwnerBar,
  OwnerMeta,
  OwnerPhotoActions,
  OwnerSection,
  PastChats,
  RemoveListingLink,
  type AskRow,
} from "../../src/features/items/OwnerListing";
import { PhotoPager } from "../../src/features/items/PhotoPager";
import { errorMessage } from "../../src/lib/errors";
import { CircleMark } from "../../src/ui/Logo";
import { color, font, radius, space, type } from "../../src/ui/theme";

const NOTE_MAX = 140;

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemQ = useQuery(convexQuery(api.items.get, { itemId: id as Id<"items"> }));
  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const createRequest = useMutation(api.requests.create);
  const withdrawRequest = useMutation(api.requests.withdraw);
  const [chosen, setChosen] = useState<AskRow | null>(null);
  const [giving, setGiving] = useState<AskRow | null>(null);
  const item = itemQ.data;

  if (itemQ.isPending) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + space.xl, alignItems: "center" }]}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }

  if (!item || (item.status !== "available" && item.status !== "pending" && !item.isOwner && !item.myRequest)) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + space.xl }]}>
        <Text style={type.title}>This one has already found a home.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back to browsing</Text>
        </Pressable>
      </View>
    );
  }

  const pending = item.status === "pending";
  const live = pending || item.status === "available";
  const shortTitle = item.title.charAt(0).toLowerCase() + item.title.slice(1);
  const owner = item.owner.displayName;
  const away = distanceLabel(me, item);
  const yours = !item.isOwner && item.myRequest?.status === "selected" && (pending || item.status === "gone");
  const ownerBarHidden = item.isOwner && item.status === "available" && !chosen;
  const asked = item.myRequest && (item.myRequest.status === "open" || item.myRequest.status === "selected") ? item.myRequest : null;

  const send = async () => {
    setBusy(true);
    try {
      await createRequest({ itemId: item.id, note: note.trim() || undefined });
      setSheetOpen(false);
      setNote("");
    } catch (e) {
      Alert.alert("Couldn't send your request", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const cantTakeIt = () => {
    if (!item.myRequest) return;
    const requestId = item.myRequest.id;
    Alert.alert("Can't take it?", `${owner} will be told and can give the ${shortTitle} to someone else.`, [
      { text: "Not now", style: "cancel" },
      {
        text: "I can't take it",
        onPress: async () => {
          try {
            await withdrawRequest({ requestId });
          } catch (e) {
            Alert.alert("Couldn't withdraw", errorMessage(e));
          }
        },
      },
    ]);
  };
  const withdraw = async () => {
    if (!asked) return;
    setBusy(true);
    try {
      await withdrawRequest({ requestId: asked.id });
    } catch (e) {
      Alert.alert("Couldn't withdraw", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 170 }}>
        <View>
          <PhotoPager urls={item.photoUrls} dimmed={pending} />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={[styles.back, { top: insets.top + space.sm }]}
          >
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          {item.isOwner ? <OwnerPhotoActions item={item} top={insets.top + space.sm} /> : null}
          {item.status === "available" && !item.isOwner && (
            <View style={[styles.freeSticker, { top: insets.top + space.sm }]}>
              <View style={styles.freeDot} />
              <Text style={styles.freeText}>Free</Text>
            </View>
          )}
        </View>

        {/* The placard */}
        <View style={styles.body}>
          <Text style={[type.display, { fontSize: 32, lineHeight: 38 }]}>{item.title}</Text>

          {item.isOwner ? (
            <>
              <View style={{ marginTop: -space.lg }}>
                <OwnerMeta item={item} />
              </View>
              <OwnerSection item={item} chosen={chosen} onChoose={setChosen} />
            </>
          ) : null}

          {item.isOwner ? null : <View style={styles.owner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{owner.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.label}>From {owner}</Text>
              <Text style={type.meta}>
                {away ? `About ${away} away. ` : ""}Posted {postedLabel(item.createdAt)}.
              </Text>
            </View>
          </View>}

          {yours ? (
            <View style={styles.yours}>
              <CircleMark size={40} />
              <Text style={[type.display, { fontSize: 28, lineHeight: 34, textAlign: "center" }]}>
                {item.status === "gone" ? `Enjoy the ${shortTitle}!` : `The ${shortTitle} is yours!`}
              </Text>
              <Text style={[type.body, { textAlign: "center", color: color.inkSoft }]}>
                {item.status === "gone"
                  ? `Picked up from ${owner}. Your chat stays open if you want to say thanks.`
                  : `Plan pickup with ${owner} in your private chat. ${owner} will share where.`}
              </Text>
            </View>
          ) : null}

          {!item.isOwner ? <PastChats item={item} /> : null}

          {item.description ? <Text style={type.body}>{item.description}</Text> : null}

          <View style={{ gap: space.sm }}>
            <Text style={type.label}>{item.isOwner ? "Posted in" : "In your circles"}</Text>
            <View style={styles.circleRow}>
              {item.circles.map((c) => (
                <View key={c.id} style={styles.circleChip}>
                  {c.emoji ? null : <CircleMark size={13} />}
                  <Text style={styles.circleChipText}>{circleLabel(c)}</Text>
                </View>
              ))}
            </View>
          </View>

          {item.isOwner ? null : <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={16} color={color.inkSoft} />
            <Text style={[type.meta, { flex: 1 }]}>
              {item.isOwner
                ? "You'll share the pickup spot in a private chat with the person you pick. No public comments."
                : `${owner} shares the pickup spot in a private chat with whoever they pick. No public comments.`}
            </Text>
          </View>}

          {item.isOwner ? <RemoveListingLink item={item} /> : null}
        </View>
      </ScrollView>

      {/* Action bar */}
      {ownerBarHidden ? null : <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        {item.isOwner ? (
          <OwnerBar item={item} chosen={chosen} onGive={() => setGiving(chosen)} />
        ) : yours && item.chat ? (
          <>
            <Pressable
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.chat!.id } })}
              style={styles.primary}
              accessibilityRole="button"
            >
              <Text style={type.button}>Message {owner}</Text>
            </Pressable>
            {pending ? (
              <Pressable onPress={cantTakeIt} disabled={busy} hitSlop={8} style={{ alignSelf: "center", padding: space.sm }}>
                <Text style={styles.quiet}>I can't take it</Text>
              </Pressable>
            ) : null}
          </>
        ) : !live ? (
          <Text style={type.meta}>This one is no longer available.</Text>
        ) : asked ? (
          <>
            <View style={styles.requestedNote}>
              <Text style={[type.label, { marginBottom: 2 }]}>Request sent.</Text>
              <Text style={type.meta}>
                {pending
                  ? `It's on hold for someone else for now. You're in line if it falls through.`
                  : `${owner} picks one person from everyone who asked. If it's you, a chat opens to set up pickup.`}
              </Text>
            </View>
            <Pressable onPress={withdraw} disabled={busy} style={styles.secondary}>
              <Text style={styles.secondaryText}>Withdraw request</Text>
            </Pressable>
          </>
        ) : (
          <>
            {pending ? (
              <Text style={type.meta}>{owner} has picked someone. You can still ask and wait in line.</Text>
            ) : null}
            <Pressable onPress={() => setSheetOpen(true)} style={styles.primary}>
              <Text style={type.button}>{pending ? "Get in line" : "Request"}</Text>
            </Pressable>
          </>
        )}
      </View>}

      {item.isOwner ? <GiveSheet item={item} chosen={giving} onClose={(given) => { setGiving(null); if (given) setChosen(null); }} /> : null}

      {/* Request sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetWrap}>
          <Pressable style={styles.scrim} onPress={() => setSheetOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.grabber} />
            <Text style={type.title}>
              Ask {owner} for the {shortTitle}
            </Text>
            <Text style={type.meta}>A short note helps. Only {owner} sees it.</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX}
              multiline
              autoFocus
              placeholder="Due in March, and I can pick up any evening."
              placeholderTextColor={color.inkFaint}
              style={styles.noteInput}
            />
            <Text style={[type.meta, styles.counter]}>
              {note.length}/{NOTE_MAX}
            </Text>
            <Pressable onPress={send} disabled={busy} style={[styles.primary, busy && { opacity: 0.6 }]}>
              <Text style={type.button}>{busy ? "Sending…" : "Send request"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  missing: { flex: 1, padding: space.lg, gap: space.md, backgroundColor: color.white },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
  back: {
    position: "absolute",
    left: space.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  // A giving moment: Poppy, with Ink text for contrast
  freeSticker: {
    position: "absolute",
    right: space.lg,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: color.poppy,
  },
  freeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.white },
  freeText: { fontFamily: font.uiBold, fontSize: 15, color: color.ink },
  body: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.xl },
  owner: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 17, color: color.bay },
  circleRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  circleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.fog,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 32,
  },
  circleChipText: { fontFamily: font.uiMedium, color: color.ink, fontSize: 14 },
  privacy: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingTop: space.lg,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
  },
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  yours: { backgroundColor: color.blush, borderRadius: radius.sheet, padding: space.xl, alignItems: "center", gap: space.md },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft, textDecorationLine: "underline" },
  requestedNote: { backgroundColor: color.blush, borderRadius: radius.control, padding: space.md },
  secondary: {
    height: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: font.uiSemi, color: color.ink, fontSize: 16 },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(24,34,46,0.35)" },
  sheet: {
    backgroundColor: color.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.line,
    marginBottom: space.sm,
  },
  noteInput: {
    minHeight: 100,
    backgroundColor: color.fog,
    borderRadius: radius.control,
    padding: space.md,
    paddingTop: space.md,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
    textAlignVertical: "top",
    marginTop: space.sm,
  },
  counter: { alignSelf: "flex-end", marginBottom: space.sm },
});
