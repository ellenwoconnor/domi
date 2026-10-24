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
import { Sheet, SheetAction, sheetStyles } from "../../ui/Sheet";
import { color, font, radius, space, type } from "../../ui/theme";
import { BlockSheet, type BlockTarget } from "../safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../safety/ReportSheet";
import { lowerFirst, postedLabel, type ItemView } from "./format";
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

/** Edit and Share as small buttons on the photo. */
export function OwnerPhotoActions({ item, top }: { item: ItemView; top: number }) {
  const share = useShareListing();
  const canEdit = item.status === "available" || item.status === "pending" || item.status === "expired";
  const canShare = item.status === "available" && item.visibility === "public";
  if (!canEdit && !canShare) return null;
  return (
    <View style={[styles.photoActions, { top }]}>
      {canEdit ? (
        <Pressable
          onPress={() => router.push({ pathname: "/listing/edit/[id]", params: { id: item.id } })}
          accessibilityLabel="Edit listing"
          style={styles.photoButton}
        >
          <Ionicons name="create-outline" size={19} color={color.ink} />
        </Pressable>
      ) : null}
      {canShare ? (
        <Pressable onPress={() => share(item.id, item.title)} accessibilityLabel="Share outside Domi" style={styles.photoButton}>
          <Ionicons name="share-outline" size={19} color={color.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function OwnerMeta({ item }: { item: ItemView }) {
  const live = item.status === "available" || item.status === "pending";
  return (
    <Text style={type.meta}>
      Posted {postedLabel(item.createdAt)}
      {live ? ` · ${daysLeft(item.expiresAt)}` : ""}
    </Text>
  );
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
  const inLine = asks.filter((a) => a.status === "open");
  const [person, setPerson] = useState<AskRow | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);

  const going = item.chat?.other.displayName;

  // If the person you chose withdraws (or the listing changes), clear the choice.
  const stillThere = !chosen || (item.status === "available" && asks.some((a) => a.id === chosen.id && a.status === "open"));
  useEffect(() => {
    if (asksQ.data && !stillThere) onChoose(null);
  }, [asksQ.data, stillThere, onChoose]);

  let body: ReactNode = null;
  if (item.status === "available" && item.visibility === "private") {
    body = <Card head="Offered for a wish" text="They'll pick from the offers. If it's yours, a chat opens." />;
  } else if (item.status === "available" && asks.length === 0) {
    body = (
      <View style={{ gap: 2 }}>
        <Text style={type.title}>No requests yet</Text>
        <Text style={type.meta}>When neighbors ask, you'll pick one person to give it to.</Text>
      </View>
    );
  } else if (item.status === "available") {
    body = (
      <View>
        <Text style={type.title}>
          {asks.length} {asks.length === 1 ? "neighbor" : "neighbors"} asked
        </Text>
        <Text style={[type.meta, { fontSize: 15, marginTop: 2, marginBottom: space.sm }]}>Pick one to give it to.</Text>
        <View accessibilityRole="radiogroup">
          {asks.map((a, i) => {
            const on = chosen?.id === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => onChoose(on ? null : a)}
                onLongPress={() => setPerson(a)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityHint="Long press to report or block"
                style={[styles.askRow, i < asks.length - 1 && styles.line]}
              >
                <Avatar name={a.requester.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.askName}>
                    {a.requester.displayName} <Text style={type.meta}>· {shortAgo(a.createdAt)}</Text>
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
            );
          })}
        </View>
      </View>
    );
  } else if (item.status === "pending") {
    body = (
      <View style={{ gap: space.lg }}>
        <Card head={`Going to ${going ?? "someone"}`} text="Plan pickup in your chat, then mark it picked up." />
        {item.chat ? <ChatLink id={item.chat.id} name={item.chat.other.displayName} /> : null}
        <UnpickLink item={item} name={going ?? "them"} />
        {inLine.length > 0 ? (
          <View>
            <Text style={type.label}>In line ({inLine.length})</Text>
            <Text style={[type.meta, { marginBottom: space.xs }]}>
              If it falls through with {going ?? "them"}, you can pick one of them.
            </Text>
            {inLine.map((a, i) => (
              <Pressable
                key={a.id}
                onLongPress={() => setPerson(a)}
                accessibilityHint="Long press to report or block"
                style={[styles.askRow, i < inLine.length - 1 && styles.line]}
              >
                <Avatar name={a.requester.displayName} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.askName}>
                    {a.requester.displayName} <Text style={type.meta}>· {shortAgo(a.createdAt)}</Text>
                  </Text>
                  {a.note ? <Text style={styles.askNote}>{a.note}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  } else if (item.status === "gone") {
    body = (
      <View style={{ gap: space.lg }}>
        <Card
          head={going ? `Picked up by ${going}` : "Picked up"}
          text="It found a new home. Thanks for giving it."
          warm
        />
        {item.chat ? <ChatLink id={item.chat.id} name={item.chat.other.displayName} /> : null}
      </View>
    );
  } else if (item.status === "expired") {
    body = <Card head="Expired" text="Post it again for another 30 days. Anyone who asked is still in line." />;
  } else if (item.status === "removed") {
    body = <Card head="Removed" text="Neighbors can't see this listing anymore." />;
  }

  return (
    <View style={{ gap: space.xl }}>
      {body}
      <PastChats item={item} />
      <Sheet visible={!!person} onClose={() => setPerson(null)} title={person?.requester.displayName}>
        <View>
          <SheetAction
            icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
            label={`Report ${person?.requester.displayName ?? ""}`}
            onPress={() => {
              if (person) setReport({ type: "user", id: person.requester.userId, label: person.requester.displayName });
              setPerson(null);
            }}
          />
          <SheetAction
            icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
            label={`Block ${person?.requester.displayName ?? ""}`}
            last
            onPress={() => {
              if (person) setBlock({ userId: person.requester.userId, displayName: person.requester.displayName });
              if (person && chosen?.id === person.id) onChoose(null);
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

/** Ended chats about this item, readable for good. */
export function PastChats({ item }: { item: ItemView }) {
  if (item.pastChats.length === 0) return null;
  return (
    <View>
      <Text style={type.label}>Past chats</Text>
      <Text style={[type.meta, { marginBottom: space.xs }]}>Kept so you can look back at what you arranged.</Text>
      {item.pastChats.map((c, i) => (
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: c.id } })}
          accessibilityRole="button"
          style={[styles.askRow, { alignItems: "center" }, i < item.pastChats.length - 1 && styles.line]}
        >
          <Avatar name={c.other.displayName} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.askName}>{c.other.displayName}</Text>
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

function ChatLink({ id, name }: { id: string; name: string }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id } })}
      accessibilityRole="button"
      style={styles.chatLink}
    >
      <Avatar name={name} size={42} />
      <Text style={[styles.askName, { flex: 1 }]}>Your chat with {name}</Text>
      <Ionicons name="chevron-forward" size={18} color={color.inkSoft} />
    </Pressable>
  );
}

function UnpickLink({ item, name }: { item: ItemView; name: string }) {
  const unpick = useMutation(api.items.unpick);
  const thing = lowerFirst(item.title);
  const confirm = () =>
    Alert.alert(`Un-pick ${name}?`, `Your chat with ${name} closes and the ${thing} is available again. Anyone in line can still be picked.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Un-pick",
        onPress: async () => {
          try {
            await unpick({ itemId: item.id });
          } catch (e) {
            Alert.alert("Couldn't un-pick", errorMessage(e));
          }
        },
      },
    ]);
  return (
    <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start", marginTop: -space.sm }}>
      <Text style={styles.quiet}>Un-pick {name}</Text>
    </Pressable>
  );
}

function Card({ head, text, warm = false }: { head: string; text: string; warm?: boolean }) {
  return (
    <View style={[styles.card, warm && { backgroundColor: color.blush }]}>
      <Text style={styles.cardHead}>{head}</Text>
      <Text style={type.meta}>{text}</Text>
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
      <Text style={styles.quiet}>Remove listing</Text>
    </Pressable>
  );
}

/** The bar at the bottom: one action at a time, or nothing. */
export function OwnerBar({ item, chosen, onGive }: { item: ItemView; chosen: AskRow | null; onGive: () => void }) {
  const repost = useMutation(api.items.repost);
  const markPickedUp = useMutation(api.items.markPickedUp);
  const [busy, setBusy] = useState(false);
  const thing = lowerFirst(item.title);

  if (item.status === "available") {
    if (!chosen) return null;
    return (
      <Pressable onPress={onGive} style={sheetStyles.give} accessibilityRole="button">
        <Text style={sheetStyles.giveText}>Give to {chosen.requester.displayName}</Text>
      </Pressable>
    );
  }
  if (item.status === "pending") {
    const name = item.chat?.other.displayName;
    const confirm = () =>
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
      <View style={styles.row}>
        <Pressable onPress={confirm} style={[styles.button, styles.secondary]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Mark picked up</Text>
        </Pressable>
        {item.chat ? (
          <Pressable
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.chat!.id } })}
            style={[styles.button, styles.primaryFlex]}
            accessibilityRole="button"
          >
            <Text style={[type.button, { fontSize: 16 }]} numberOfLines={1}>
              Message {name}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
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
        style={[sheetStyles.primary, busy && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Text style={type.button}>Post it again</Text>
      </Pressable>
    );
  }
  return <Text style={type.meta}>This listing has ended.</Text>;
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
  photoActions: { position: "absolute", right: space.lg, flexDirection: "row", gap: space.sm },
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
  card: { backgroundColor: color.fog, borderRadius: radius.thing, padding: 14, gap: 2 },
  cardHead: { fontFamily: font.uiSemi, fontSize: 15, color: color.ink },
  quiet: { fontFamily: font.uiSemi, fontSize: 15, color: color.inkSoft, textDecorationLine: "underline" },
  noteBox: { backgroundColor: color.fog, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: space.md },
  row: { flexDirection: "row", gap: 10 },
  button: { flex: 1, height: 50, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm },
  secondary: { borderWidth: 1, borderColor: color.line },
  secondaryText: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  primaryFlex: { backgroundColor: color.bay },
});
