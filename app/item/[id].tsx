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
import { errorMessage } from "../../src/lib/errors";
import { CircleMark } from "../../src/ui/Logo";
import { PhotoTile } from "../../src/ui/PhotoTile";
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
  const shortTitle = item.title.charAt(0).toLowerCase() + item.title.slice(1);
  const owner = item.owner.displayName;
  const away = distanceLabel(me, item);
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
          <PhotoTile uri={item.photoUrls[0]} rounded={false} dimmed={pending} style={styles.photo} />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={[styles.back, { top: insets.top + space.sm }]}
          >
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          {!pending && (
            <View style={[styles.freeSticker, { top: insets.top + space.sm }]}>
              <View style={styles.freeDot} />
              <Text style={styles.freeText}>Free</Text>
            </View>
          )}
        </View>

        {/* The placard */}
        <View style={styles.body}>
          <Text style={[type.display, { fontSize: 32, lineHeight: 38 }]}>{item.title}</Text>

          <View style={styles.owner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{owner.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.label}>{item.isOwner ? "From you" : `From ${owner}`}</Text>
              <Text style={type.meta}>
                {away && !item.isOwner ? `About ${away} away. ` : ""}Posted {postedLabel(item.createdAt)}.
              </Text>
            </View>
          </View>

          {item.description ? <Text style={type.body}>{item.description}</Text> : null}

          <View style={{ gap: space.sm }}>
            <Text style={type.label}>In your circles</Text>
            <View style={styles.circleRow}>
              {item.circles.map((c) => (
                <View key={c.id} style={styles.circleChip}>
                  {c.emoji ? null : <CircleMark size={13} />}
                  <Text style={styles.circleChipText}>{circleLabel(c)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={16} color={color.inkSoft} />
            <Text style={[type.meta, { flex: 1 }]}>
              {item.isOwner ? "You share" : `${owner} shares`} the pickup spot in a private chat with whoever they pick. No public comments.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        {item.isOwner ? (
          <Text style={type.meta}>This is your listing.</Text>
        ) : asked ? (
          <>
            <View style={styles.requestedNote}>
              <Text style={[type.label, { marginBottom: 2 }]}>
                {asked.status === "selected" ? `${owner} chose you.` : "Request sent."}
              </Text>
              <Text style={type.meta}>
                {asked.status === "selected"
                  ? "A private chat is open to plan pickup."
                  : pending
                    ? `${owner} picked someone else for now. You're in line if it falls through.`
                    : `${owner} picks from everyone who asked. If it's you, a chat opens to set up pickup.`}
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
      </View>

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
  photo: { width: "100%", aspectRatio: 1 },
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
