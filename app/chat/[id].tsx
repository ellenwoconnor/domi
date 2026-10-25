import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setOpenChat } from "../../src/features/push/push";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { chatRows, type ChatRow } from "../../src/features/chat/rows";
import { lowerFirst } from "../../src/features/items/format";
import { BlockSheet, type BlockTarget } from "../../src/features/safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../../src/features/safety/ReportSheet";
import { errorMessage } from "../../src/lib/errors";
import { CircleMark } from "../../src/ui/Logo";
import { Sheet, SheetAction, sheetStyles } from "../../src/ui/Sheet";
import { color, font, radius, space, type } from "../../src/ui/theme";

const MESSAGE_MAX = 2000;

/** The private pickup chat between an owner and the person they picked. */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;
  const insets = useSafeAreaInsets();
  const convQ = useQuery(convexQuery(api.conversations.get, { conversationId }));
  const msgsQ = useQuery(convexQuery(api.conversations.messages, { conversationId }));
  const send = useMutation(api.conversations.send);
  const markRead = useMutation(api.conversations.markRead);
  const markPickedUp = useMutation(api.items.markPickedUp);
  const unpick = useMutation(api.items.unpick);
  const withdraw = useMutation(api.requests.withdraw);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);

  const conv = convQ.data;
  const messages = msgsQ.data;

  // Pushes for this chat don't show a banner while it's on screen.
  useFocusEffect(
    useCallback(() => {
      setOpenChat(conversationId);
      return () => setOpenChat(null);
    }, [conversationId]),
  );

  // Their messages count as read while this screen is open.
  const unread = messages?.some((m) => !m.mine && !m.read) ?? false;
  useEffect(() => {
    if (unread) markRead({ conversationId }).catch(() => {});
  }, [unread, conversationId, markRead]);

  const rows = useMemo(() => (messages ? chatRows(messages).reverse() : []), [messages]);

  if (convQ.isPending) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.bay} />
      </View>
    );
  }
  if (!conv) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.xl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Text style={type.title}>This chat isn't available.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const other = conv.other.displayName;
  const owner = conv.role === "owner";
  const item = conv.item;
  const thing = item ? lowerFirst(item.title) : "item";
  const pending = item?.status === "pending" && !conv.closed;
  const subtitle = conv.closed
    ? "Chat ended"
    : item?.status === "gone"
      ? owner
        ? `Picked up by ${other}`
        : "Picked up"
      : owner
        ? `Going to ${other}`
        : "Going to you";

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      await send({ conversationId, body });
    } catch (e) {
      setDraft(body);
      Alert.alert("Couldn't send", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const confirm = (title: string, message: string, action: string, run: () => Promise<unknown>) => {
    setMenuOpen(false);
    Alert.alert(title, message, [
      { text: "Not now", style: "cancel" },
      {
        text: action,
        onPress: async () => {
          try {
            await run();
          } catch (e) {
            Alert.alert("Something went wrong", errorMessage(e));
          }
        },
      },
    ]);
  };

  const menu = (
    <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
      {item ? <Text style={type.meta}>{`${item.title} · ${subtitle.toLowerCase()}`}</Text> : null}
      <View>
        {owner && pending && item ? (
          <>
            <SheetAction
              icon={<Ionicons name="checkmark-circle-outline" size={22} color={color.bay} />}
              label="Mark picked up"
              onPress={() =>
                confirm(
                  `Mark the ${thing} picked up?`,
                  "The listing ends and everyone in line is told. Your chat stays open.",
                  "Picked up",
                  () => markPickedUp({ itemId: item.id }),
                )
              }
            />
            <SheetAction
              icon={<Ionicons name="arrow-undo-outline" size={22} color={color.bay} />}
              label={`Un-pick ${other}`}
              detail={`The ${thing} is available again. Anyone in line can still be picked.`}
              onPress={() =>
                confirm(
                  `Un-pick ${other}?`,
                  `Your chat with ${other} closes and the ${thing} is available again.`,
                  "Un-pick",
                  () => unpick({ itemId: item.id }),
                )
              }
            />
          </>
        ) : null}
        {!owner && pending ? (
          <SheetAction
            icon={<Ionicons name="arrow-undo-outline" size={22} color={color.bay} />}
            label="I can't take it"
            onPress={() =>
              confirm(
                "Can't take it?",
                `${other} will be told and can give the ${thing} to someone else.`,
                "I can't take it",
                () => withdraw({ requestId: conv.requestId }),
              )
            }
          />
        ) : null}
        <SheetAction
          icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
          label={`Report ${other}`}
          onPress={() => {
            setMenuOpen(false);
            setReport({ type: "user", id: conv.other.userId, label: other });
          }}
        />
        <SheetAction
          icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
          label={`Block ${other}`}
          last
          onPress={() => {
            setMenuOpen(false);
            setBlock({ userId: conv.other.userId, displayName: other });
          }}
        />
      </View>
      <Pressable onPress={() => setMenuOpen(false)} style={sheetStyles.secondary} accessibilityRole="button">
        <Text style={sheetStyles.secondaryText}>Cancel</Text>
      </Pressable>
    </Sheet>
  );

  const renderRow = ({ item: row }: { item: ChatRow }) => {
    if (row.kind === "day") return <Text style={styles.day}>{row.label}</Text>;
    const m = row.message;
    return (
      <View style={{ alignItems: m.mine ? "flex-end" : "flex-start", marginTop: row.firstInGroup ? space.sm : 2 }}>
        <Pressable
          onLongPress={m.mine ? undefined : () => setReport({ type: "message", id: m.id, label: "this message" })}
          delayLongPress={400}
          style={[
            styles.bubble,
            m.mine ? styles.mine : styles.theirs,
            row.lastInGroup && (m.mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
          ]}
        >
          <Text style={[styles.bubbleText, m.mine && { color: color.white }]}>{m.body}</Text>
        </Pressable>
        {row.lastInGroup ? <Text style={styles.time}>{row.time}</Text> : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header: who, and what it's about */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={8} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={color.ink} />
          </Pressable>
          <Text style={styles.name} numberOfLines={1}>
            {other}
          </Text>
          <Pressable onPress={() => setMenuOpen(true)} accessibilityLabel="More" hitSlop={8} style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={color.ink} />
          </Pressable>
        </View>
        {item ? (
          <Pressable
            onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
            accessibilityRole="button"
            style={styles.itemStrip}
          >
            {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.thumb} /> : <View style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={[type.objectLabel, { fontSize: 16, lineHeight: 20 }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[type.meta, { fontSize: 13 }]}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={color.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {/* Messages, newest at the bottom */}
      {messages && messages.length === 0 && !conv.closed ? (
        <View style={styles.emptyWrap}>
          {owner ? (
            <View style={[styles.prompt, { backgroundColor: color.fog }]}>
              <Text style={[type.title, { textAlign: "center" }]}>Say hi to {other}</Text>
              <Text style={[type.body, styles.promptText]}>
                Tell {other} where and when to pick up the {thing}. Share the exact address here, not in the listing.
              </Text>
            </View>
          ) : (
            <View style={[styles.prompt, { backgroundColor: color.blush }]}>
              <CircleMark size={44} />
              <Text style={[type.display, { fontSize: 28, lineHeight: 34, textAlign: "center" }]}>
                The {thing} is yours!
              </Text>
              <Text style={[type.body, styles.promptText]}>
                Say thanks and agree on a time. {other} will share the pickup spot here.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Composer, or the ended note */}
      {conv.closed ? (
        <View style={[styles.ended, { paddingBottom: insets.bottom + space.md }]}>
          <Ionicons name="lock-closed-outline" size={18} color={color.inkSoft} />
          <View style={{ flex: 1 }}>
            <Text style={type.label}>This chat has ended.</Text>
            <Text style={type.meta}>You can still read it here and from the listing.</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${other}`}
            placeholderTextColor={color.inkSoft}
            multiline
            maxLength={MESSAGE_MAX}
            style={styles.input}
            accessibilityLabel="Message"
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim() || sending}
            accessibilityLabel="Send"
            style={[styles.send, (!draft.trim() || sending) && { opacity: 0.35 }]}
          >
            <Ionicons name="arrow-up" size={20} color={color.white} />
          </Pressable>
        </View>
      )}

      {menu}
      <ReportSheet target={report} onClose={() => setReport(null)} />
      <BlockSheet target={block} onClose={() => setBlock(null)} onBlocked={() => router.back()} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  center: { alignItems: "center", justifyContent: "center" },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line, paddingHorizontal: space.md },
  headerRow: { height: 44, flexDirection: "row", alignItems: "center", gap: space.xs },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: font.uiBold, fontSize: 17, color: color.ink },
  itemStrip: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.sm, paddingTop: space.xs, paddingBottom: space.md },
  thumb: { width: 36, height: 36, borderRadius: 10, backgroundColor: color.fog },
  list: { paddingHorizontal: space.lg - 4, paddingVertical: space.md },
  day: { textAlign: "center", fontFamily: font.uiSemi, fontSize: 12.5, color: color.inkSoft, marginTop: space.lg, marginBottom: space.xs },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: color.bay },
  theirs: { backgroundColor: color.fog },
  bubbleText: { fontFamily: font.ui, fontSize: 16, lineHeight: 22, color: color.ink },
  time: { fontFamily: font.ui, fontSize: 12.5, color: color.inkSoft, marginTop: 3, marginHorizontal: 4 },
  emptyWrap: { flex: 1, justifyContent: "center", padding: space.lg },
  prompt: { borderRadius: radius.sheet, padding: space.xl, alignItems: "center", gap: space.md },
  promptText: { textAlign: "center", color: color.inkSoft },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: color.fog,
    paddingHorizontal: space.lg - 4,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.bay, alignItems: "center", justifyContent: "center" },
  ended: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: color.fog,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
});
