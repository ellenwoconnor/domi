import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { circleLabel, lowerFirst, postedLabel } from "../../src/features/items/format";
import { BlockSheet, type BlockTarget } from "../../src/features/safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../../src/features/safety/ReportSheet";
import { WishSafetySheet, type WishSafetyTarget } from "../../src/features/wishlist/WishSafetySheet";
import { errorMessage } from "../../src/lib/errors";
import { useConfirmSheet } from "../../src/ui/ConfirmSheet";
import { IconButton, ThingActions } from "../../src/ui/IconButton";
import { About, BarNote, Byline, DetailHeader } from "../../src/ui/DetailHeader";
import { PhotoTile } from "../../src/ui/PhotoTile";
import { Sheet, SheetAction, sheetStyles } from "../../src/ui/Sheet";
import { color, font, radius, space, type } from "../../src/ui/theme";

type Wish = FunctionReturnType<typeof api.wishlist.get>;
type Offer = FunctionReturnType<typeof api.wishlist.offers>[number];

/**
 * A wish (docs/m4-requirements.md, M4b W2). Neighbors see the whole wish and
 * "I have this"; the wisher sees the offers, picks one, and plans pickup.
 */
export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wishQ = useQuery(convexQuery(api.wishlist.get, { wishId: id as Id<"wishlistItems"> }));
  const insets = useSafeAreaInsets();
  const wish = wishQ.data;

  if (wishQ.isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.xl, alignItems: "center" }]}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }
  if (!wish || (!wish.isMine && wish.status !== "open")) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.xl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Text style={type.title}>This wish has been taken care of.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }
  return wish.isMine ? <YourWish wish={wish} /> : <TheirWish wish={wish} />;
}


/** Someone else's wish: everything they wrote, and "I have this". */
function TheirWish({ wish }: { wish: Wish }) {
  const insets = useSafeAreaInsets();
  const [safety, setSafety] = useState<WishSafetyTarget | null>(null);
  const [barHeight, setBarHeight] = useState(150);
  const name = wish.user.displayName;
  const circles = wish.circles.map(circleLabel).join(", ");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: barHeight + space.xl }}>
        <DetailHeader
          actions={<ThingActions onMore={() => setSafety({ wishId: wish.id, userId: wish.user.userId, displayName: name })} />}
          kicker={`${name} is looking for`}
          title={wish.title}
          byline={<Byline name={name} meta={`wished ${postedLabel(wish.createdAt)}`} />}
        />
        <View style={styles.body}>
          <About
            description={wish.description}
            pills={wish.circles.map(circleLabel)}
            extra={
              wish.pending ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Pending pickup</Text>
                </View>
              ) : null
            }
          />
        </View>
      </ScrollView>
      <View onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)} style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        {wish.pending ? (
          <Text style={[type.meta, { textAlign: "center" }]}>
            {name} is arranging pickup for an offer. If it falls through, the wish opens up again.
          </Text>
        ) : wish.myOfferId ? (
          <>
            <Text style={[type.meta, { textAlign: "center" }]}>You offered. {name} picks from the offers.</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/item/[id]", params: { id: wish.myOfferId! } })}
              style={sheetStyles.primary}
              accessibilityRole="button"
            >
              <Text style={type.button}>See your offer</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[type.meta, { textAlign: "center" }]}>Only {name} sees your offer, and picks from any offers.</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/fulfill/[wishId]", params: { wishId: wish.id } })}
              style={({ pressed }) => [sheetStyles.primary, styles.haveThis, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <View style={styles.haveDot} />
              <Text style={type.button}>I have this</Text>
            </Pressable>
          </>
        )}
      </View>

      <WishSafetySheet target={safety} onClose={() => setSafety(null)} />
    </View>
  );
}

/** Your wish: the offers, choosing one, and pickup once you have. */
function YourWish({ wish }: { wish: Wish }) {
  const insets = useSafeAreaInsets();
  const offersQ = useQuery({ ...convexQuery(api.wishlist.offers, { wishId: wish.id }), enabled: wish.status === "open" });
  const offers = offersQ.data ?? [];
  const picked = offers.find((o) => o.status === "pending" && o.myRequest?.status === "selected") ?? null;
  const waiting = offers.filter((o) => o.id !== picked?.id && o.status === "available");
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [person, setPerson] = useState<Offer | null>(null);
  // "No thanks": the note sheet for one offer, and the sheet for an offer under "Other offers".
  const [declining, setDeclining] = useState<Offer | null>(null);
  const [other, setOther] = useState<Offer | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  const [barHeight, setBarHeight] = useState(150);
  const { askRemove, removeSheet } = useRemoveWish(wish, offers);

  // If the offer you chose goes away (withdrawn, blocked), clear the choice.
  useEffect(() => {
    if (chosen && offersQ.data && !waiting.some((o) => o.id === chosen.id)) setChosen(null);
  }, [offersQ.data, chosen, waiting]);

  const showBar = !picked && !!chosen;
  // The same edit and remove icons as on your listings, white on the Blush header.
  const actions =
    wish.status === "open" ? (
      <ThingActions
        onEdit={() => router.push({ pathname: "/wish/edit/[id]", params: { id: wish.id } })}
        onRemove={askRemove}
        removeLabel="Remove wish"
      />
    ) : undefined;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: (showBar || picked ? barHeight : insets.bottom) + space.xl }}>
        {picked ? (
          // The moment it's yours: their photo with the poppy, and what it's for.
          <DetailHeader
            actions={actions}
            photoUrls={picked.thumbUrls}
            sticker="poppy"
            kicker={`${picked.owner.displayName} is giving you`}
            title={picked.title}
            byline={<Byline name={picked.owner.displayName} meta={postedLabel(picked.createdAt)} />}
          />
        ) : (
          <DetailHeader
            actions={actions}
            kicker="You're looking for"
            title={wish.title}
            byline={<Byline name="You" meta={`wished ${postedLabel(wish.createdAt)}`} />}
          />
        )}
        <View style={styles.body}>
          {picked ? (
            <About
              description={picked.description}
              extra={
                <Text style={type.meta}>
                  For your wish: <Text style={styles.strong}>{wish.title}</Text>
                </Text>
              }
            />
          ) : (
            <About description={wish.description} pills={wish.circles.map(circleLabel)} />
          )}
          {wish.status !== "open" ? (
            <View style={styles.card}>
              <Text style={styles.cardHead}>{wish.status === "fulfilled" ? "Your wish came true." : "You removed this wish."}</Text>
            </View>
          ) : picked ? (
            waiting.length > 0 ? (
              <View style={styles.offersCard}>
                <Text style={styles.cardHead}>Other offers ({waiting.length})</Text>
                <Text style={[type.meta, { marginBottom: space.xs }]}>
                  If it falls through with {picked.owner.displayName}, you can pick another.
                </Text>
                {waiting.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => setOther(o)}
                    onLongPress={() => setPerson(o)}
                    accessibilityRole="button"
                    accessibilityHint="Long press to report or block"
                    style={styles.smallOffer}
                  >
                    <PhotoTile uri={o.thumbUrls[0]} style={styles.smallPhoto} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={type.objectLabel} numberOfLines={2}>
                        {o.title}
                      </Text>
                      <Byline name={o.owner.displayName} meta={postedLabel(o.createdAt)} center={false} />
                    </View>
                    <IconButton icon="ellipsis-horizontal" label={`Report or block ${o.owner.displayName}`} onPress={() => setPerson(o)} />
                  </Pressable>
                ))}
              </View>
            ) : null
          ) : offersQ.isPending ? (
            <ActivityIndicator color={color.bay} />
          ) : waiting.length === 0 ? (
            <View style={styles.offersCard}>
              <Text style={styles.cardHead}>No offers yet</Text>
              <Text style={type.meta}>When someone offers one, it shows up here and in My stuff.</Text>
            </View>
          ) : (
            <View style={[styles.offersCard, { gap: space.md }]}>
              <View style={{ gap: 2 }}>
                <Text style={styles.cardHead}>
                  {waiting.length === 1 ? "Someone has one for you" : `${waiting.length} people have one for you`}
                </Text>
                <Text style={type.meta}>Pick the one you'd like.</Text>
              </View>
              <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
                {waiting.map((o) => {
                  const on = chosen?.id === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setChosen(on ? null : o)}
                      onLongPress={() => setPerson(o)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityHint="Long press to report or block"
                      style={[styles.offer, on && styles.offerOn]}
                    >
                      <PhotoTile uri={o.thumbUrls[0]} style={styles.offerPhoto} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={type.objectLabel} numberOfLines={3}>
                          {o.title}
                        </Text>
                        {o.description ? (
                          <Text style={styles.offerText} numberOfLines={4}>
                            {o.description}
                          </Text>
                        ) : null}
                        <Byline name={o.owner.displayName} meta={postedLabel(o.createdAt)} center={false} />
                      </View>
                      <IconButton icon="ellipsis-horizontal" label={`Report or block ${o.owner.displayName}`} tone="fog" onPress={() => setPerson(o)} />
                      <Ionicons
                        name={on ? "radio-button-on" : "radio-button-off"}
                        size={24}
                        color={on ? color.bay : color.inkFaint}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {picked ? (
        <View onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)} style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          <BarNote>Say thanks and agree on a time. {picked.owner.displayName} shares where in your chat.</BarNote>
          {picked.chat ? (
            <Pressable
              onPress={() => router.push({ pathname: "/chat/[id]", params: { id: picked.chat!.id } })}
              style={sheetStyles.primary}
              accessibilityRole="button"
            >
              <Text style={type.button}>Message {picked.owner.displayName}</Text>
            </Pressable>
          ) : null}
          <View style={{ alignItems: "center", paddingVertical: space.xs }}>
            <CantTakeIt offer={picked} />
          </View>
        </View>
      ) : null}
      {removeSheet}

      {showBar && chosen ? (
        <View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[styles.bar, styles.barRow, { paddingBottom: insets.bottom + space.md }]}
        >
          <Pressable onPress={() => setDeclining(chosen)} style={styles.noThanks} accessibilityRole="button">
            <Text style={styles.noThanksText}>No thanks</Text>
          </Pressable>
          <Pressable onPress={() => setConfirming(true)} style={[sheetStyles.give, { flex: 1 }]} accessibilityRole="button">
            <Text style={sheetStyles.giveText} numberOfLines={1}>
              Take it
            </Text>
          </Pressable>
        </View>
      ) : null}

      <NoThanksSheet
        offer={declining}
        onClose={() => setDeclining(null)}
        onDone={() => {
          setDeclining(null);
          setChosen(null);
        }}
      />
      <OtherOfferSheet
        offer={other}
        waitingFor={picked?.owner.displayName ?? null}
        onClose={() => setOther(null)}
        onNoThanks={() => {
          const o = other;
          setOther(null);
          setDeclining(o);
        }}
      />

      <TakeSheet
        offer={confirming ? chosen : null}
        others={waiting.filter((o) => o.id !== chosen?.id).map((o) => o.owner.displayName)}
        onClose={() => setConfirming(false)}
      />

      <Sheet visible={!!person} onClose={() => setPerson(null)} title={person?.owner.displayName}>
        <View>
          <SheetAction
            icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
            label="Report this offer"
            onPress={() => {
              if (person) setReport({ type: "item", id: person.id, label: "this offer" });
              setPerson(null);
            }}
          />
          <SheetAction
            icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
            label={`Block ${person?.owner.displayName ?? ""}`}
            last
            onPress={() => {
              if (person) setBlock({ userId: person.owner.userId, displayName: person.owner.displayName });
              setPerson(null);
            }}
          />
        </View>
        <Pressable onPress={() => setPerson(null)} style={sheetStyles.secondary} accessibilityRole="button">
          <Text style={sheetStyles.secondaryText}>Cancel</Text>
        </Pressable>
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} />
      <BlockSheet target={block} onClose={() => setBlock(null)} />
    </View>
  );
}

/** "Take Jun's helmet": the confirm sheet's title (buttons just say "Take it"). The offer's name when it's short, otherwise "offer". */
function takeLabel(o: Offer) {
  const thing = o.title.length <= 22 ? lowerFirst(o.title) : "offer";
  return `Take ${o.owner.displayName}'s ${thing}`;
}


/** "Take Jun's helmet?": the step that explains the private chat. */
function TakeSheet({ offer, others, onClose }: { offer: Offer | null; others: string[]; onClose: () => void }) {
  const pick = useMutation(api.wishlist.pickOffer);
  const [busy, setBusy] = useState(false);
  const name = offer?.owner.displayName ?? "";
  const wait =
    others.length === 0
      ? ""
      : others.length === 1
        ? ` ${others[0]}'s offer waits in case it falls through.`
        : " The other offers wait in case it falls through.";
  const take = async () => {
    if (!offer) return;
    setBusy(true);
    try {
      const conversationId = await pick({ itemId: offer.id });
      onClose();
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
    } catch (e) {
      Alert.alert("Couldn't take it", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={!!offer} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <PhotoTile uri={offer?.thumbUrls[0]} style={{ width: 64, height: 76 }} />
        <Text style={[type.title, { fontSize: 24, lineHeight: 30, flex: 1 }]}>{offer ? `${takeLabel(offer)}?` : ""}</Text>
      </View>
      <Text style={type.body}>A private chat opens with {name} to plan pickup.{wait}</Text>
      <Pressable onPress={take} disabled={busy} style={[sheetStyles.give, busy && { opacity: 0.6 }]} accessibilityRole="button">
        <Text style={sheetStyles.giveText} numberOfLines={1}>
          {busy ? "Taking it…" : "Take it"}
        </Text>
      </Pressable>
      <Pressable onPress={onClose} style={sheetStyles.secondary} accessibilityRole="button">
        <Text style={sheetStyles.secondaryText}>Not yet</Text>
      </Pressable>
    </Sheet>
  );
}

/** "No thanks to Jun's sugar?": the offer comes off the wish, with an optional note for its giver. */
function NoThanksSheet({ offer, onClose, onDone }: { offer: Offer | null; onClose: () => void; onDone: () => void }) {
  const decline = useMutation(api.wishlist.declineOffer);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const name = offer?.owner.displayName ?? "";
  // A fresh note each time the sheet opens.
  useEffect(() => {
    if (offer) setNote("");
  }, [offer]);
  const send = async () => {
    if (!offer || busy) return;
    setBusy(true);
    try {
      const text = note.trim();
      await decline({ itemId: offer.id, ...(text ? { note: text } : {}) });
      onDone();
    } catch (e) {
      Alert.alert("Couldn't send it", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible={!!offer} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <PhotoTile uri={offer?.thumbUrls[0]} style={{ width: 56, height: 66 }} />
        <Text style={[type.title, { fontSize: 24, lineHeight: 30, flex: 1 }]}>
          {offer ? `No thanks to ${name}'s ${offerThing(offer)}?` : ""}
        </Text>
      </View>
      <Text style={[type.meta, { fontSize: 15, lineHeight: 21 }]}>The offer comes off your wish.</Text>
      <View style={{ gap: space.xs }}>
        <Text style={type.label} nativeID="noThanksNote">
          Note for {name} <Text style={{ fontFamily: font.ui, color: color.inkSoft }}>(optional)</Text>
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={NOTE_MAX}
          placeholder="Thanks so much for offering!"
          placeholderTextColor={color.inkFaint}
          accessibilityLabelledBy="noThanksNote"
          style={styles.noteInput}
        />
        <Text style={[type.meta, { alignSelf: "flex-end", fontSize: 12.5 }]}>
          {note.length}/{NOTE_MAX}
        </Text>
      </View>
      <Pressable onPress={send} disabled={busy} style={[sheetStyles.primary, busy && { opacity: 0.6 }]} accessibilityRole="button">
        <Text style={type.button}>{busy ? "Sending…" : "Send no thanks"}</Text>
      </Pressable>
      <Pressable onPress={onClose} style={sheetStyles.secondary} accessibilityRole="button">
        <Text style={sheetStyles.secondaryText}>Cancel</Text>
      </Pressable>
    </Sheet>
  );
}

/** An offer under "Other offers", while you're picking up another: keep it, or say no thanks. */
function OtherOfferSheet({
  offer,
  waitingFor,
  onClose,
  onNoThanks,
}: {
  offer: Offer | null;
  waitingFor: string | null;
  onClose: () => void;
  onNoThanks: () => void;
}) {
  const name = offer?.owner.displayName ?? "";
  return (
    <Sheet visible={!!offer} onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <PhotoTile uri={offer?.thumbUrls[0]} style={{ width: 72, height: 84 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.title} numberOfLines={2}>
            {offer?.title ?? ""}
          </Text>
          <Text style={type.meta}>
            From {name}
            {offer ? ` · ${postedLabel(offer.createdAt)}` : ""}
          </Text>
        </View>
      </View>
      <Text style={[type.meta, { fontSize: 15, lineHeight: 21 }]}>
        {waitingFor ? `It's waiting in case it falls through with ${waitingFor}. ` : ""}If you won't need it, let {name} know.
      </Text>
      <Pressable onPress={onNoThanks} style={sheetStyles.secondary} accessibilityRole="button">
        <Text style={sheetStyles.secondaryText}>No thanks</Text>
      </Pressable>
      <Pressable onPress={onClose} style={styles.keepIt} accessibilityRole="button">
        <Text style={styles.quiet}>Keep it for now</Text>
      </Pressable>
    </Sheet>
  );
}

const NOTE_MAX = 140;

/** "sugar" in "No thanks to Jun's sugar?": the offer's name when it's short, otherwise "offer". */
function offerThing(o: Offer) {
  return o.title.length <= 22 ? lowerFirst(o.title) : "offer";
}

function CantTakeIt({ offer }: { offer: Offer }) {
  const withdraw = useMutation(api.requests.withdraw);
  const name = offer.owner.displayName;
  const confirm = () => {
    if (!offer.myRequest) return;
    const requestId = offer.myRequest.id;
    Alert.alert("Can't take it?", `${name} will be told, and this offer comes off your wish. You can still pick another one.`, [
      { text: "Not now", style: "cancel" },
      {
        text: "I can't take it",
        onPress: async () => {
          try {
            await withdraw({ requestId });
          } catch (e) {
            Alert.alert("Couldn't withdraw", errorMessage(e));
          }
        },
      },
    ]);
  };
  return (
    <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button">
      <Text style={styles.quiet}>I can't take it</Text>
    </Pressable>
  );
}

/** Remove your wish: the trash icon's confirm, in the Domi sheet. */
function useRemoveWish(wish: Wish, offers: Offer[]) {
  const remove = useMutation(api.wishlist.remove);
  const { confirm, confirmSheet } = useConfirmSheet();
  const names = [...new Set(offers.map((o) => o.owner.displayName))];
  const who =
    names.length === 0
      ? null
      : names.length === 1
        ? `${names[0]} offered one.`
        : names.length === 2
          ? `${names[0]} and ${names[1]} offered.`
          : `${names.length} people offered.`;
  const askRemove = () =>
    confirm({
      title: "Remove your wish?",
      message: who ? `${who} We'll let them know you don't need one anymore.` : "Nobody else will see it anymore.",
      action: "Remove wish",
      run: async () => {
        await remove({ wishId: wish.id });
        router.back();
      },
    });
  return { askRemove, removeSheet: confirmSheet };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
  tag: {
    alignSelf: "flex-start",
    marginTop: space.xs,
    backgroundColor: color.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontFamily: font.uiSemi, fontSize: 12, color: color.bay },
  body: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.xl },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    backgroundColor: color.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  // "I have this" is the screen's main action: solid Bay, with the Poppy dot as the giving cue.
  haveThis: { flexDirection: "row", gap: 10 },
  haveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.poppy, borderWidth: 2, borderColor: color.white },
  card: { backgroundColor: color.blush, borderRadius: radius.thing, padding: space.md + 4, gap: 2 },
  // The offers: a Fog card like "N people asked" on your listing, each offer a white row inside it.
  offersCard: { backgroundColor: color.fog, borderRadius: radius.thing, padding: space.md + 4, gap: 2 },
  cardHead: { fontFamily: font.curator, fontSize: 22, lineHeight: 28, color: color.ink },
  strong: { fontFamily: font.uiSemi, color: color.ink },
  offer: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.thing,
    backgroundColor: color.white,
    borderWidth: 2,
    borderColor: color.white,
  },
  offerOn: { borderColor: color.bay },
  offerPhoto: { width: 72, height: 72, borderRadius: 12 },
  offerText: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.ink },
  smallOffer: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  smallPhoto: { width: 56, height: 56, borderRadius: 12 },
  barRow: { flexDirection: "row", alignItems: "center" },
  // Borderless, like Cancel: "Take" stays the clear choice.
  noThanks: { height: 54, paddingHorizontal: space.md, alignItems: "center", justifyContent: "center" },
  noThanksText: { fontFamily: font.uiSemi, fontSize: 17, color: color.ink },
  noteInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: font.ui,
    fontSize: 16,
    lineHeight: 22,
    color: color.ink,
    textAlignVertical: "top",
  },
  keepIt: { height: 44, alignItems: "center", justifyContent: "center" },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft },
});
