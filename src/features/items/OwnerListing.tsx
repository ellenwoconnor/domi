import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { Avatar } from "../../ui/Avatar";
import { useConfirmSheet } from "../../ui/ConfirmSheet";
import { IconButton, ThingActions } from "../../ui/IconButton";
import { PoppyMark } from "../../ui/Logo";
import { Sheet, SheetAction, sheetStyles } from "../../ui/Sheet";
import { color, font, radius, space, type } from "../../ui/theme";
import { BlockSheet, type BlockTarget } from "../safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../safety/ReportSheet";
import { circleLabel, lowerFirst, postedLabel, type ItemView } from "./format";
import { useShareListing } from "./shareListing";

// Your own listing (docs/m4-requirements.md R1, R2, R5; canvas "R1 v2b").
// Kept quiet: one heading, the people who asked, and one action at a time.

export type AskRow = FunctionReturnType<typeof api.requests.forItem>[number];

const DAY = 24 * 60 * 60 * 1000;

function daysLeft(expiresAt: number) {
  const d = Math.ceil((expiresAt - Date.now()) / DAY);
  return d <= 1 ? "last day" : `${d} days left`;
}

function shortAgo(at: number) {
  const hours = Math.floor((Date.now() - at) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function namesInLine(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} stays in line in case it falls through.`;
  if (names.length === 2) return `${names[0]} and ${names[1]} stay in line in case it falls through.`;
  return `The ${names.length} others stay in line in case it falls through.`;
}

/** Share, edit and remove: the round icons on the photo, in that order (src/ui/IconButton.tsx). */
export function OwnerPhotoActions({ item, top }: { item: ItemView; top: number }) {
  const { share, sheet } = useShareListing();
  const remove = useMutation(api.items.remove);
  const { confirm, confirmSheet } = useConfirmSheet();
  const canEdit = item.status === "available" || item.status === "pending" || item.status === "expired";
  const canShare = item.status === "available" && item.visibility === "public";
  const canRemove = item.status !== "gone" && item.status !== "removed";
  const askRemove = () =>
    confirm({
      title: "Remove this listing?",
      message: item.wish
        ? `${item.wish.wisher.displayName} won't see your offer anymore.`
        : item.requestCount > 0
          ? "Everyone who asked will be told it's no longer available."
          : "Nobody else will see it anymore.",
      action: "Remove listing",
      run: async () => {
        await remove({ itemId: item.id });
        router.back();
      },
    });
  return (
    <>
      <ThingActions
        style={[styles.photoActions, { top }]}
        onShare={canShare ? () => share(item.id, item.title) : undefined}
        onEdit={canEdit ? () => router.push({ pathname: "/listing/edit/[id]", params: { id: item.id } }) : undefined}
        onRemove={canRemove ? askRemove : undefined}
        removeLabel="Remove listing"
      />
      {sheet}
      {confirmSheet}
    </>
  );
}

/** One line under the title: where it is (or whose wish it answers) and when. */
export function OwnerMeta({ item }: { item: ItemView }) {
  const live = item.status === "available" || item.status === "pending";
  if (item.wish) {
    const who = item.wish.wisher.displayName;
    return (
      <Text style={type.meta}>
        {item.status === "available" ? `For ${who}'s wish · sent ${postedLabel(item.createdAt)}` : `For ${who}'s wish`}
      </Text>
    );
  }
  const first = item.circles[0];
  const where = !first ? null : item.circles.length === 1 ? `In ${circleLabel(first)}` : `In ${circleLabel(first)} and ${item.circles.length - 1} more`;
  const when = live ? daysLeft(item.expiresAt) : `posted ${postedLabel(item.createdAt)}`;
  const line = [where, when].filter(Boolean).join(" · ");
  return <Text style={type.meta}>{line.charAt(0).toUpperCase() + line.slice(1)}</Text>;
}

/** The heart of your listing: who asked, who it's going to, and your chats. */
export function OwnerSection({
  item,
  chosen,
  onChoose,
}: {
  item: ItemView;
  chosen: AskRow | null;
  onChoose: (row: AskRow | null) => void;
}) {
  const live = item.status === "available" || item.status === "pending";
  const asksQ = useQuery({ ...convexQuery(api.requests.forItem, { itemId: item.id }), enabled: live });
  const asks = asksQ.data ?? [];

  const going = item.chat?.other.displayName;

  // If the person you chose withdraws (or the listing changes), clear the choice.
  const stillThere = !chosen || (item.status === "available" && asks.some((a) => a.id === chosen.id && a.status === "open"));
  useEffect(() => {
    if (asksQ.data && !stillThere) onChoose(null);
  }, [asksQ.data, stillThere, onChoose]);

  // One status card per state: what's happening, and the next step (canvas "Your own listing", O2–O7).
  let body: ReactNode = null;
  if (item.wish && item.status === "available" && item.onHold) {
    const who = item.wish.wisher.displayName;
    body = <Card head={`${who}'s set for now`} text="Yours is ready if plans change. Only they see it." />;
  } else if (item.wish && item.status === "available") {
    const who = item.wish.wisher.displayName;
    body = <Card head={`Waiting for ${who} to choose`} text={`Only ${who} sees your offer. You'll get a push when they pick.`} />;
  } else if (item.wish && item.status === "removed" && item.offerEnding) {
    const ending = item.offerEnding;
    body = ending.note ? (
      <View style={[styles.card, { backgroundColor: color.blush, gap: space.sm, padding: space.lg }]}>
        <Text style={styles.noteQuote}>“{ending.note}”</Text>
        <Text style={type.meta}>{ending.who}</Text>
      </View>
    ) : (
      <Card head={`${ending.who}'s all set`} text="Thanks for offering!" warm />
    );
  } else if (item.wish && item.status === "removed") {
    const who = item.wish.wisher.displayName;
    body =
      item.wish.status === "fulfilled" ? (
        <Card head={`${who}'s wish came true`} text={`${who} went with another offer this time. Thanks for offering.`} />
      ) : (
        <Card head={`${who} removed the wish`} text="Thanks for offering." />
      );
  } else if (item.status === "available" && asks.length === 0) {
    body = <Card head="No requests yet" text="When people ask, they'll show up here and you pick one." />;
  } else if (item.status === "available") {
    body = (
      <View>
        <Text style={styles.sectionHead}>
          {asks.length} {asks.length === 1 ? "person" : "people"} asked
        </Text>
        <Text style={[type.meta, { fontSize: 14, marginTop: 2, marginBottom: space.xs }]}>Pick one to give it to.</Text>
        <View accessibilityRole="radiogroup">
          {asks.map((a, i) => {
            const on = chosen?.id === a.id;
            return (
              <View key={a.id} style={[styles.askRow, i < asks.length - 1 && styles.line]}>
                <Pressable
                  onPress={() => onChoose(on ? null : a)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flex: 1, flexDirection: "row", gap: space.md, alignItems: "flex-start" }}
                >
                  <Avatar name={a.requester.displayName} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.askName}>
                      {a.requester.displayName}{" "}
                      <Text style={type.meta}>
                        · {shortAgo(a.createdAt)}
                        {a.viaLink ? " · via your link" : ""}
                      </Text>
                    </Text>
                    {a.note ? <Text style={styles.askNote}>{a.note}</Text> : null}
                  </View>
                  <Ionicons
                    name={on ? "radio-button-on" : "radio-button-off"}
                    size={26}
                    color={on ? color.bay : color.inkFaint}
                    style={{ marginTop: 9 }}
                  />
                </Pressable>
                <PersonMore
                  userId={a.requester.userId}
                  name={a.requester.displayName}
                  onBlocked={() => {
                    if (chosen?.id === a.id) onChoose(null);
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  } else if (item.status === "pending") {
    body = <PendingCard item={item} name={going ?? "them"} />;
  } else if (item.status === "gone") {
    body = (
      <View style={{ gap: space.lg }}>
        <Card
          head={going ? `Picked up by ${going}` : "Picked up"}
          text="It found a new home. Thanks for giving it."
          warm
          icon={<PoppyMark size={30} />}
          link={item.chat ? { label: `Your chat with ${item.chat.other.displayName}`, chatId: item.chat.id } : undefined}
        />
        <CircleNudge item={item} />
      </View>
    );
  } else if (item.status === "expired") {
    body = <ExpiredCard item={item} />;
  } else if (item.status === "removed") {
    body = <Card head="Removed" text="Nobody else can see this listing anymore." />;
  }
  // An offer the wisher passed on: it can still go to everyone.
  if (item.status === "removed" && item.offerEnding?.canShareAgain) {
    body = (
      <View style={{ gap: space.md }}>
        {body}
        <Pressable
          onPress={() => router.push({ pathname: "/listing/again/[id]", params: { id: item.id } })}
          style={sheetStyles.give}
          accessibilityRole="button"
        >
          <Text style={sheetStyles.giveText}>Share with others</Text>
        </Pressable>
      </View>
    );
  }

  return body;
}

/**
 * The bottom of your listing: history folded into rows that open in place, so the
 * screen leads with the status. Pending: the people still in line. Any state: earlier chats.
 */
export function OwnerHistory({ item }: { item: ItemView }) {
  const pending = item.status === "pending";
  const asksQ = useQuery({ ...convexQuery(api.requests.forItem, { itemId: item.id }), enabled: pending });
  const inLine = pending ? (asksQ.data ?? []).filter((a) => a.status === "open") : [];
  const [open, setOpen] = useState<"line" | "chats" | null>(null);
  const going = item.chat?.other.displayName ?? "them";
  const chats = item.pastChats;
  const people = [...new Set(chats.map((c) => c.other.displayName))];
  if (inLine.length === 0 && chats.length === 0) return null;
  return (
    <View>
      {inLine.length > 0 ? (
        <Fold
          title={`${inLine.length} ${inLine.length === 1 ? "other" : "others"} in line`}
          detail={`${listNames(inLine.map((a) => a.requester.displayName))}, in case it falls through with ${going}`}
          open={open === "line"}
          onToggle={() => setOpen(open === "line" ? null : "line")}
        >
          {inLine.map((a, i) => (
            <View key={a.id} style={[styles.askRow, i < inLine.length - 1 && styles.line]}>
              <Avatar name={a.requester.displayName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.askName}>
                  {a.requester.displayName} <Text style={type.meta}>· {shortAgo(a.createdAt)}</Text>
                </Text>
                {a.note ? <Text style={styles.askNote}>{a.note}</Text> : null}
              </View>
              <PersonMore userId={a.requester.userId} name={a.requester.displayName} />
            </View>
          ))}
        </Fold>
      ) : null}
      {chats.length > 0 ? (
        <Fold
          title={people.length === 1 ? `Earlier chats with ${people[0]} (${chats.length})` : `Earlier chats (${chats.length})`}
          detail={chats.length === 1 ? "A pickup that didn't happen" : `${chats.length} pickups that didn't happen`}
          open={open === "chats"}
          onToggle={() => setOpen(open === "chats" ? null : "chats")}
        >
          <PastChats item={item} header={false} />
        </Fold>
      ) : null}
    </View>
  );
}

function listNames(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

/** A row that opens in place: a title, one line under it, and a chevron that turns. */
function Fold({
  title,
  detail,
  open,
  onToggle,
  children,
}: {
  title: string;
  detail: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.fold}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.foldHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.askName}>{title}</Text>
          <Text style={type.meta}>{detail}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={color.inkSoft} />
      </Pressable>
      {open ? <View style={{ paddingBottom: space.sm }}>{children}</View> : null}
    </View>
  );
}

/** ⋯ on a person's row: report or block them (no hidden long-press). */
function PersonMore({ userId, name, onBlocked }: { userId: AskRow["requester"]["userId"]; name: string; onBlocked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  return (
    <>
      <IconButton icon="ellipsis-horizontal" label={`Report or block ${name}`} tone="fog" onPress={() => setOpen(true)} style={{ marginTop: 2 }} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={name}>
        <View>
          <SheetAction
            icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
            label={`Report ${name}`}
            onPress={() => {
              setReport({ type: "user", id: userId, label: name });
              setOpen(false);
            }}
          />
          <SheetAction
            icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
            label={`Block ${name}`}
            last
            onPress={() => {
              setBlock({ userId, displayName: name });
              setOpen(false);
            }}
          />
        </View>
        <Pressable onPress={() => setOpen(false)} style={sheetStyles.secondary} accessibilityRole="button">
          <Text style={sheetStyles.secondaryText}>Cancel</Text>
        </Pressable>
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} />
      <BlockSheet target={block} onClose={() => setBlock(null)} onBlocked={onBlocked} />
    </>
  );
}

/** Going to someone: the chat, then picked up, with a quiet way to un-pick. */
function PendingCard({ item, name }: { item: ItemView; name: string }) {
  const markPickedUp = useMutation(api.items.markPickedUp);
  const thing = lowerFirst(item.title);
  const confirmPickedUp = () =>
    Alert.alert(`Mark the ${thing} picked up?`, "The listing ends and everyone in line is told. Your chat stays open.", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Picked up",
        onPress: async () => {
          try {
            await markPickedUp({ itemId: item.id });
          } catch (e) {
            Alert.alert("Couldn't mark it picked up", errorMessage(e));
          }
        },
      },
    ]);
  return (
    <Card head={`Going to ${name}`} text="Plan pickup in your chat, then mark it picked up." warm>
      {item.chat ? (
        <Pressable
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.chat!.id } })}
          style={[styles.cardButton, { backgroundColor: color.bay }]}
          accessibilityRole="button"
        >
          <Text style={[type.button, { fontSize: 16 }]} numberOfLines={1}>
            Message {name}
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={confirmPickedUp} style={[styles.cardButton, { backgroundColor: color.white }]} accessibilityRole="button">
        <Text style={[styles.secondaryText, { color: color.bay }]}>Mark picked up</Text>
      </Pressable>
      <UnpickLink item={item} name={name} />
    </Card>
  );
}

/** Expired: nobody sees it; post it again, and anyone who asked is still in line. */
function ExpiredCard({ item }: { item: ItemView }) {
  const repost = useMutation(api.items.repost);
  const [busy, setBusy] = useState(false);
  const waiting = item.requestCount;
  return (
    <Card
      head="Expired"
      text={
        waiting > 0
          ? `Nobody can see it right now. ${waiting === 1 ? "1 person is" : `${waiting} people are`} still in line if you post it again.`
          : "Nobody can see it right now."
      }
    >
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
        style={[styles.cardButton, { backgroundColor: color.bay }, busy && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Text style={[type.button, { fontSize: 16 }]}>Post again for 30 days</Text>
      </Pressable>
    </Card>
  );
}

/** Ended chats about this item, readable for good. */
export function PastChats({ item, header = true }: { item: ItemView; header?: boolean }) {
  if (item.pastChats.length === 0) return null;
  return (
    <View>
      {header ? (
        <>
          <Text style={type.label}>Past chats</Text>
          <Text style={[type.meta, { marginBottom: space.xs }]}>Kept so you can look back at what you arranged.</Text>
        </>
      ) : null}
      {item.pastChats.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: c.id } })}
          accessibilityRole="button"
          style={[styles.askRow, { alignItems: "center" }, i < item.pastChats.length - 1 && styles.line]}
        >
          <Avatar name={c.other.displayName} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.askName}>
              {c.other.displayName} <Text style={type.meta}>· ended {postedLabel(c.endedAt)}</Text>
            </Text>
            {c.lastMessage ? (
              <Text style={type.meta} numberOfLines={1}>
                {c.lastMessage.mine ? "You" : c.other.displayName}: {c.lastMessage.body}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
        </Pressable>
      ))}
    </View>
  );
}


function UnpickLink({ item, name }: { item: ItemView; name: string }) {
  const unpick = useMutation(api.items.unpick);
  const thing = lowerFirst(item.title);
  const run = (noShow: boolean) => async () => {
    try {
      await unpick({ itemId: item.id, noShow });
    } catch (e) {
      Alert.alert("Couldn't un-pick", errorMessage(e));
    }
  };
  const confirm = () =>
    Alert.alert(`Un-pick ${name}?`, `Your chat with ${name} closes and the ${thing} is available again. Anyone in line can still be picked.`, [
      { text: "Keep", style: "cancel" },
      { text: "Un-pick", onPress: run(false) },
      // Missed pickups stay private; repeat ones pause requests (convex/lib/noShows.ts).
      { text: `${name} didn't show`, onPress: run(true) },
    ]);
  return (
    <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "center", paddingTop: space.xs }}>
      <Text style={styles.quiet}>Un-pick {name}</Text>
    </Pressable>
  );
}

/**
 * After pickup, when the item went to someone through a share link and you share
 * no custom circle with them: offer to bring them into one (shares.circleNudge).
 */
function CircleNudge({ item }: { item: ItemView }) {
  const nudge = useQuery(convexQuery(api.shares.circleNudge, { itemId: item.id })).data;
  const [dismissed, setDismissed] = useState(false);
  if (!nudge || dismissed) return null;
  return (
    <View style={[styles.card, styles.cardBody, { gap: 4 }]}>
      <Text style={styles.cardHead}>Swap with {nudge.name} often?</Text>
      <Text style={type.meta}>
        {nudge.hasCustomCircle
          ? "You're not in a domi together yet. A domi can include people outside your zip."
          : "Start a domi for friends and family. It can include people outside your zip."}
      </Text>
      <View style={[styles.row, { marginTop: space.sm, alignItems: "center" }]}>
        <Pressable
          onPress={() => router.push(nudge.hasCustomCircle ? "/(tabs)/circles" : "/circle/form")}
          accessibilityRole="button"
          style={[styles.button, styles.primaryFlex]}
        >
          <Text style={type.button}>{nudge.hasCustomCircle ? "Invite to a domi" : "Start a domi"}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} accessibilityRole="button" hitSlop={8} style={{ padding: space.sm }}>
          <Text style={styles.quiet}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The status card: a head, one line, then any actions; optionally a row linking to a chat. */
function Card({
  head,
  text,
  warm = false,
  icon,
  link,
  children,
}: {
  head: string;
  text: string;
  warm?: boolean;
  icon?: ReactNode;
  link?: { label: string; chatId: string };
  children?: ReactNode;
}) {
  return (
    <View style={[styles.card, warm && { backgroundColor: color.blush }]}>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
          {icon}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.cardHead}>{head}</Text>
            <Text style={[type.meta, { fontSize: 14, lineHeight: 20 }]}>{text}</Text>
          </View>
        </View>
        {children}
      </View>
      {link ? (
        <Pressable
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: link.chatId } })}
          accessibilityRole="button"
          style={styles.cardLink}
        >
          <Text style={[styles.askName, { color: color.bay, fontSize: 15 }]}>{link.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={color.bay} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The bar at the bottom: only "Give to …" once you've picked someone. Every other action lives in the status card. */
export function OwnerBar({ item, chosen, onGive }: { item: ItemView; chosen: AskRow | null; onGive: () => void }) {
  if (item.status !== "available" || !chosen) return null;
  return (
    <Pressable onPress={onGive} style={sheetStyles.give} accessibilityRole="button">
      <Text style={sheetStyles.giveText}>Give to {chosen.requester.displayName}</Text>
    </Pressable>
  );
}

/** "Give the crib to Maya?": the step that explains the private chat. */
export function GiveSheet({
  item,
  chosen,
  onClose,
}: {
  item: ItemView;
  chosen: AskRow | null;
  onClose: (given: boolean) => void;
}) {
  const select = useMutation(api.items.selectRecipient);
  const asksQ = useQuery(convexQuery(api.requests.forItem, { itemId: item.id }));
  const [busy, setBusy] = useState(false);
  const name = chosen?.requester.displayName ?? "";
  const others = (asksQ.data ?? []).filter((a) => a.id !== chosen?.id).map((a) => a.requester.displayName);

  const give = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      const conversationId = await select({ requestId: chosen.id });
      onClose(true);
      router.push({ pathname: "/chat/[id]", params: { id: conversationId } });
    } catch (e) {
      Alert.alert("Couldn't give it", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!chosen} onClose={() => onClose(false)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Avatar name={name || "?"} size={48} />
        <Text style={[type.title, { fontSize: 24, lineHeight: 30, flex: 1 }]}>
          Give the {lowerFirst(item.title)} to {name}?
        </Text>
      </View>
      <Text style={type.body}>
        A private chat opens with {name} to plan pickup. {namesInLine(others)}
      </Text>
      {chosen?.note ? (
        <View style={styles.noteBox}>
          <Text style={type.caption}>“{chosen.note}”</Text>
        </View>
      ) : null}
      <View style={{ gap: space.sm, marginTop: space.xs }}>
        <Pressable onPress={give} disabled={busy} style={[sheetStyles.give, busy && { opacity: 0.6 }]} accessibilityRole="button">
          <Text style={sheetStyles.giveText}>{busy ? "Giving…" : `Give to ${name}`}</Text>
        </Pressable>
        <Pressable onPress={() => onClose(false)} style={sheetStyles.secondary} accessibilityRole="button">
          <Text style={sheetStyles.secondaryText}>Not yet</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  photoActions: { position: "absolute", right: space.lg },
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  askRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingVertical: space.md },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  wishRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  askName: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  askNote: { fontFamily: font.ui, fontSize: 14.5, lineHeight: 20, color: color.inkSoft, marginTop: 2 },
  chatLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.thing,
    padding: 14,
  },
  card: { backgroundColor: color.fog, borderRadius: radius.thing, overflow: "hidden" },
  cardBody: { padding: space.md + 4, gap: 14 },
  cardHead: { fontFamily: font.uiSemi, fontSize: 17, lineHeight: 22, color: color.ink },
  cardButton: { height: 50, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm },
  cardLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md + 4,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(24,34,46,0.08)",
  },
  sectionHead: { fontFamily: font.uiSemi, fontSize: 17, lineHeight: 22, color: color.ink },
  fold: { borderTopWidth: 1, borderTopColor: color.line },
  foldHead: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14 },
  noteQuote: { fontFamily: font.curatorLight, fontSize: 19, lineHeight: 27, color: color.ink },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft, textDecorationLine: "underline" },
  noteBox: { backgroundColor: color.fog, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: space.md },
  row: { flexDirection: "row", gap: 10 },
  button: { flex: 1, height: 50, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm },
  secondary: { borderWidth: 1, borderColor: color.line },
  secondaryText: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  primaryFlex: { backgroundColor: color.bay },
});
