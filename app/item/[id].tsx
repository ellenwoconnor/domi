import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useAskForPush } from "../../src/features/push/useAskForPush";
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
  ownerByline,
  OwnerPhotoActions,
  OwnerSection,
  PastChats,
  OwnerHistory,
  type AskRow,
} from "../../src/features/items/OwnerListing";
import { About, BarNote, Byline, DetailHeader } from "../../src/ui/DetailHeader";
import { BlockSheet, type BlockTarget } from "../../src/features/safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../../src/features/safety/ReportSheet";
import { errorMessage } from "../../src/lib/errors";
import { Sheet, SheetAction, sheetStyles } from "../../src/ui/Sheet";
import { ThingActions } from "../../src/ui/IconButton";
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
  const askForPush = useAskForPush();
  const withdrawRequest = useMutation(api.requests.withdraw);
  const [chosen, setChosen] = useState<AskRow | null>(null);
  const [giving, setGiving] = useState<AskRow | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  const [barHeight, setBarHeight] = useState(170);
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
  // Their byline: whose wish it answers, how far, when. Where it's shared shows as pills.
  const theirMeta = [
    item.wish ? "for your wish" : null,
    !away ? null : away === "nearby" ? "nearby" : `${away} away`,
    postedLabel(item.createdAt),
  ]
    .filter(Boolean)
    .join(" · ");
  const yours = !item.isOwner && item.myRequest?.status === "selected" && (pending || item.status === "gone");
  // Un-picked: the owner cancelled the exchange, and the listing is closed for this person (they can't ask again).
  const cancelled = !item.isOwner && item.myRequest?.status === "cancelled";
  // Your own listing keeps every action in its status card; the bar is only for "Give to …".
  const ownerBarHidden = (item.isOwner && !(item.status === "available" && chosen)) || cancelled;
  const asked = item.myRequest && (item.myRequest.status === "open" || item.myRequest.status === "selected") ? item.myRequest : null;

  const send = async () => {
    setBusy(true);
    try {
      await createRequest({ itemId: item.id, note: note.trim() || undefined });
      setSheetOpen(false);
      setNote("");
      // After the sheet has slid away (iOS can't present a screen mid-dismiss).
      setTimeout(() => askForPush("request").catch(() => {}), 500);
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
      <ScrollView contentContainerStyle={{ paddingBottom: (ownerBarHidden ? insets.bottom : barHeight) + space.xl }}>
        <DetailHeader
          actions={
            item.isOwner ? (
              <OwnerPhotoActions item={item} />
            ) : (
              // Someone else's listing: ⋯ for report or block, in the same spot as your own listing's actions.
              <ThingActions onMore={() => setSafetyOpen(true)} />
            )
          }
          photoUrls={item.photoUrls}
          dimmed={(pending && !yours) || cancelled || (item.isOwner && (item.status === "expired" || item.status === "removed"))}
          sticker={yours ? "poppy" : item.status === "available" && !item.isOwner && !cancelled ? "free" : null}
          kicker={yours ? (item.status === "gone" ? `${owner} gave you` : `${owner} picked you for`) : undefined}
          title={item.title}
          byline={item.isOwner ? <Byline name="You" meta={ownerByline(item)} /> : <Byline name={owner} meta={theirMeta} />}
        />

        <View style={styles.body}>
          {/* Closed for you (design 2d, 2026-11-10): one card says why, with the way back to the chat. Nothing else to read. */}
          {cancelled ? (
            <View style={styles.closedCard}>
              <View style={{ padding: space.md, gap: 4 }}>
                <Text style={[type.label, { fontSize: 16, lineHeight: 21 }]}>{owner} cancelled this exchange.</Text>
                <Text style={type.meta}>This listing is closed for you.</Text>
              </View>
              {item.pastChats[0] ? (
                <Pressable
                  onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.pastChats[0].id } })}
                  accessibilityRole="button"
                  style={styles.closedChatRow}
                >
                  <Text style={[type.label, { color: color.bay, fontSize: 15 }]}>See your chat</Text>
                  <Ionicons name="chevron-forward" size={18} color={color.bay} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            // Offers for a wish go to one person, not to domis, so they have no pills.
            <About description={item.description} pills={item.circles.map(circleLabel)} />
          )}

          {item.isOwner ? <OwnerSection item={item} chosen={chosen} onChoose={setChosen} /> : null}
          {!item.isOwner && !cancelled ? <PastChats item={item} /> : null}
          {/* Your own listing: history folded at the bottom (people in line, earlier chats). */}
          {item.isOwner ? <OwnerHistory item={item} /> : null}
        </View>
      </ScrollView>

      {/* Action bar */}
      {ownerBarHidden ? null : <View
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}
      >
        {item.isOwner ? (
          <OwnerBar item={item} chosen={chosen} onGive={() => setGiving(chosen)} />
        ) : yours && item.chat ? (
          <>
            <BarNote>
              {item.status === "gone"
                ? `Picked up. Your chat with ${owner} stays open if you want to say thanks.`
                : `Say thanks and agree on a time. ${owner} shares where in your chat.`}
            </BarNote>
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
            <BarNote>
              {pending ? `${owner} has picked someone. You can still ask and wait in line.` : `Only ${owner} sees your request.`}
            </BarNote>
            <Pressable onPress={() => setSheetOpen(true)} style={styles.primary}>
              <Text style={type.button}>{pending ? "Get in line" : "Ask for it"}</Text>
            </Pressable>
          </>
        )}
      </View>}

      {item.isOwner ? <GiveSheet item={item} chosen={giving} onClose={(given) => { setGiving(null); if (given) setChosen(null); }} /> : null}

      {item.isOwner ? null : (
        <Sheet visible={safetyOpen} onClose={() => setSafetyOpen(false)}>
          <View>
            <SheetAction
              icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
              label="Report this listing"
              onPress={() => {
                setSafetyOpen(false);
                setReport({ type: "item", id: item.id, label: "this listing" });
              }}
            />
            <SheetAction
              icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
              label={`Block ${owner}`}
              last
              onPress={() => {
                setSafetyOpen(false);
                setBlock({ userId: item.owner.userId, displayName: owner });
              }}
            />
          </View>
          <Pressable onPress={() => setSafetyOpen(false)} style={sheetStyles.secondary} accessibilityRole="button">
            <Text style={sheetStyles.secondaryText}>Cancel</Text>
          </Pressable>
        </Sheet>
      )}
      <ReportSheet target={report} onClose={() => setReport(null)} />
      <BlockSheet target={block} onClose={() => setBlock(null)} onBlocked={() => router.back()} />

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
              placeholder="Thank you for posting this! Due in March, and I can pick up any evening."
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
  body: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.xl },
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
  closedCard: { backgroundColor: color.fog, borderRadius: radius.thing, overflow: "hidden" },
  closedChatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft, textDecorationLine: "underline" },
  requestedNote: { backgroundColor: color.fog, borderRadius: radius.control, padding: space.md },
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
