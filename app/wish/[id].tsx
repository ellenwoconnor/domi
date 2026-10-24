import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { circleLabel, lowerFirst, postedLabel } from "../../src/features/items/format";
import { BlockSheet, type BlockTarget } from "../../src/features/safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../../src/features/safety/ReportSheet";
import { WishSafetySheet, type WishSafetyTarget } from "../../src/features/wishlist/WishSafetySheet";
import { errorMessage } from "../../src/lib/errors";
import { Avatar } from "../../src/ui/Avatar";
import { CircleMark } from "../../src/ui/Logo";
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

function BackButton({ top, tone = "white" }: { top: number; tone?: "white" | "fog" }) {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityLabel="Back"
      style={[styles.round, { top, left: space.lg, backgroundColor: tone === "white" ? color.white : color.fog }]}
    >
      <Ionicons name="chevron-back" size={22} color={color.ink} />
    </Pressable>
  );
}

/** Someone else's wish: everything they wrote, and "I have this". */
function TheirWish({ wish }: { wish: Wish }) {
  const insets = useSafeAreaInsets();
  const [safety, setSafety] = useState<WishSafetyTarget | null>(null);
  const name = wish.user.displayName;
  const circles = wish.circles.map(circleLabel).join(", ");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 64 }]}>
          <Text style={styles.kicker}>{name} is looking for</Text>
          <Text style={type.display}>{wish.title}</Text>
          {wish.pending ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Pending pickup</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          {wish.description ? <Text style={styles.note}>“{wish.description}”</Text> : null}
          <View style={[styles.person, wish.description ? styles.topLine : null]}>
            <Avatar name={name} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={type.label}>{name}</Text>
              <Text style={type.meta}>
                {circles ? `In ${circles} · ` : ""}wished {postedLabel(wish.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <BackButton top={insets.top + space.sm} />
      <Pressable
        onPress={() => setSafety({ wishId: wish.id, userId: wish.user.userId, displayName: name })}
        accessibilityLabel="Report or block"
        style={[styles.round, { top: insets.top + space.sm, right: space.lg }]}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={color.ink} />
      </Pressable>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
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
              style={({ pressed }) => [styles.haveThis, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              <View style={styles.haveDot} />
              <Text style={styles.haveText}>I have this</Text>
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
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  const circles = wish.circles.map(circleLabel).join(", ");

  // If the offer you chose goes away (withdrawn, blocked), clear the choice.
  useEffect(() => {
    if (chosen && offersQ.data && !waiting.some((o) => o.id === chosen.id)) setChosen(null);
  }, [offersQ.data, chosen, waiting]);

  const showBar = !picked && !!chosen;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: showBar ? 150 : 60 }}>
        {picked ? <PickedHero offer={picked} top={insets.top} /> : null}

        <View style={[styles.body, { paddingTop: picked ? space.xl : insets.top + 64 }]}>
          <View style={{ gap: space.sm }}>
            {picked ? <Text style={type.label}>Your wish</Text> : null}
            <Text style={picked ? type.title : type.display}>{wish.title}</Text>
            <Text style={type.meta}>
              {picked
                ? "Shows as pending in your circles until you've picked it up."
                : `Your wish${circles ? ` · in ${circles}` : ""}`}
            </Text>
            {wish.description && !picked ? <Text style={type.body}>“{wish.description}”</Text> : null}
          </View>

          {wish.status !== "open" ? (
            <View style={styles.card}>
              <Text style={type.label}>{wish.status === "fulfilled" ? "Your wish came true." : "You removed this wish."}</Text>
            </View>
          ) : picked ? (
            waiting.length > 0 ? (
              <View style={styles.topLine}>
                <Text style={[type.label, { marginTop: space.lg }]}>Other offers ({waiting.length})</Text>
                <Text style={[type.meta, { marginBottom: space.xs }]}>
                  If it falls through with {picked.owner.displayName}, you can pick another.
                </Text>
                {waiting.map((o) => (
                  <Pressable key={o.id} onLongPress={() => setPerson(o)} accessibilityHint="Long press to report or block" style={styles.smallOffer}>
                    <PhotoTile uri={o.photoUrls[0]} style={styles.smallPhoto} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.objectLabel} numberOfLines={2}>
                        {o.title}
                      </Text>
                      <Text style={type.meta}>From {o.owner.displayName}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null
          ) : offersQ.isPending ? (
            <ActivityIndicator color={color.bay} />
          ) : waiting.length === 0 ? (
            <View style={[styles.card, { backgroundColor: color.fog }]}>
              <Text style={type.label}>No offers yet</Text>
              <Text style={type.meta}>When a neighbor offers one, it shows up here and in My stuff.</Text>
            </View>
          ) : (
            <View style={[styles.topLine, { paddingTop: space.xl, gap: space.md }]}>
              <View style={{ gap: 2 }}>
                <Text style={type.title}>
                  {waiting.length === 1 ? "A neighbor has one for you" : `${waiting.length} neighbors have one for you`}
                </Text>
                <Text style={[type.meta, { fontSize: 15 }]}>Pick the one you'd like.</Text>
              </View>
              <View accessibilityRole="radiogroup" style={{ gap: space.md }}>
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
                      <PhotoTile uri={o.photoUrls[0]} style={styles.offerPhoto} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={type.objectLabel} numberOfLines={3}>
                          {o.title}
                        </Text>
                        {o.description ? (
                          <Text style={styles.offerText} numberOfLines={4}>
                            {o.description}
                          </Text>
                        ) : null}
                        <Text style={type.meta}>
                          From {o.owner.displayName} · {postedLabel(o.createdAt)}
                        </Text>
                      </View>
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

          {wish.status === "open" ? (
            <View style={styles.links}>
              {picked ? <CantTakeIt offer={picked} /> : null}
              <RemoveWish wish={wish} offers={offers} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {picked ? null : <BackButton top={insets.top + space.sm} tone="fog" />}

      {showBar && chosen ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          <Pressable onPress={() => setConfirming(true)} style={sheetStyles.give} accessibilityRole="button">
            <Text style={sheetStyles.giveText} numberOfLines={1}>
              {takeLabel(chosen)}
            </Text>
          </Pressable>
        </View>
      ) : null}

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

/** "Take Jun's helmet": the offer's name when it's short, otherwise "offer". */
function takeLabel(o: Offer) {
  const thing = o.title.length <= 22 ? lowerFirst(o.title) : "offer";
  return `Take ${o.owner.displayName}'s ${thing}`;
}

/** The moment: the offer you picked is yours. */
function PickedHero({ offer, top }: { offer: Offer; top: number }) {
  const name = offer.owner.displayName;
  return (
    <View style={[styles.picked, { paddingTop: top + space.sm }]}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={[styles.roundStatic]}>
        <Ionicons name="chevron-back" size={22} color={color.ink} />
      </Pressable>
      <View style={{ alignItems: "center", gap: space.md }}>
        <View style={styles.pickedPhotoWrap}>
          <PhotoTile uri={offer.photoUrls[0]} style={styles.pickedPhoto} />
          <View style={styles.pickedMark}>
            <CircleMark size={30} />
          </View>
        </View>
        <Text style={[type.display, { fontSize: 30, lineHeight: 36, textAlign: "center" }]}>
          The {lowerFirst(offer.title)} is yours!
        </Text>
        <Text style={[type.body, { textAlign: "center", color: color.inkSoft }]}>
          From {name}. Say thanks and agree on a time.
        </Text>
      </View>
      {offer.chat ? (
        <Pressable
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: offer.chat!.id } })}
          style={sheetStyles.primary}
          accessibilityRole="button"
        >
          <Text style={type.button}>Message {name}</Text>
        </Pressable>
      ) : null}
    </View>
  );
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
        <PhotoTile uri={offer?.photoUrls[0]} style={{ width: 64, height: 76 }} />
        <Text style={[type.title, { fontSize: 24, lineHeight: 30, flex: 1 }]}>{offer ? `${takeLabel(offer)}?` : ""}</Text>
      </View>
      <Text style={type.body}>A private chat opens with {name} to plan pickup.{wait}</Text>
      <Pressable onPress={take} disabled={busy} style={[sheetStyles.give, busy && { opacity: 0.6 }]} accessibilityRole="button">
        <Text style={sheetStyles.giveText} numberOfLines={1}>
          {busy ? "Taking it…" : offer ? takeLabel(offer) : ""}
        </Text>
      </Pressable>
      <Pressable onPress={onClose} style={sheetStyles.secondary} accessibilityRole="button">
        <Text style={sheetStyles.secondaryText}>Not yet</Text>
      </Pressable>
    </Sheet>
  );
}

function CantTakeIt({ offer }: { offer: Offer }) {
  const withdraw = useMutation(api.requests.withdraw);
  const name = offer.owner.displayName;
  const confirm = () => {
    if (!offer.myRequest) return;
    const requestId = offer.myRequest.id;
    Alert.alert("Can't take it?", `${name} will be told, and you can pick another offer.`, [
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

function RemoveWish({ wish, offers }: { wish: Wish; offers: Offer[] }) {
  const remove = useMutation(api.wishlist.remove);
  const names = [...new Set(offers.map((o) => o.owner.displayName))];
  const who =
    names.length === 0
      ? null
      : names.length === 1
        ? `${names[0]} offered one.`
        : names.length === 2
          ? `${names[0]} and ${names[1]} offered.`
          : `${names.length} neighbors offered.`;
  const confirm = () =>
    Alert.alert("Remove your wish?", who ? `${who} We'll let them know you don't need one anymore.` : "Your circles won't see it anymore.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Remove wish",
        style: "destructive",
        onPress: async () => {
          try {
            await remove({ wishId: wish.id });
            router.back();
          } catch (e) {
            Alert.alert("Couldn't remove it", errorMessage(e));
          }
        },
      },
    ]);
  return (
    <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button">
      <Text style={styles.quiet}>Remove wish</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
  round: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  roundStatic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { backgroundColor: color.blush, paddingHorizontal: space.lg, paddingBottom: space.xl, gap: 6 },
  kicker: { fontFamily: font.uiSemi, fontSize: 13.5, color: color.inkSoft },
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
  note: { fontFamily: font.curatorLight, fontSize: 18, lineHeight: 27, color: color.ink },
  person: { flexDirection: "row", alignItems: "center", gap: space.md },
  topLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, paddingTop: space.lg },
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
  haveThis: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.blush,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  haveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.poppy },
  haveText: { fontFamily: font.uiBold, fontSize: 17, color: color.ink },
  card: { backgroundColor: color.blush, borderRadius: radius.thing, padding: space.md, gap: 2 },
  offer: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    padding: space.md,
    borderRadius: radius.thing,
    borderWidth: 1,
    borderColor: color.line,
  },
  offerOn: { borderWidth: 2, borderColor: color.bay, padding: space.md - 1 },
  offerPhoto: { width: 96, height: 116 },
  offerText: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.ink },
  smallOffer: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  smallPhoto: { width: 56, height: 64, borderRadius: 12 },
  links: { flexDirection: "row", gap: space.xl, paddingBottom: space.lg },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft },
  picked: { backgroundColor: color.blush, paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.lg },
  pickedPhotoWrap: { width: 150, height: 180, transform: [{ rotate: "3deg" }] },
  pickedPhoto: { width: 150, height: 180, borderWidth: 6, borderColor: color.white },
  pickedMark: { position: "absolute", left: -16, top: -12 },
});
