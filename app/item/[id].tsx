import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
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
import { circleById, getItem, postedLabel } from "../../src/features/items/mockData";
import { PhotoTile } from "../../src/ui/PhotoTile";
import { PorchTag } from "../../src/ui/PorchTag";
import { color, radius, space, type } from "../../src/ui/theme";

const NOTE_MAX = 140;

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = getItem(id);
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [requested, setRequested] = useState(false);

  if (!item) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + space.xl }]}>
        <Text style={styles.title}>This listing is gone</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back to browsing</Text>
        </Pressable>
      </View>
    );
  }

  const pending = item.status === "pending";
  const lowerTitle = item.title.charAt(0).toLowerCase() + item.title.slice(1);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <PhotoTile emoji={item.emoji} seed={item.id} emojiSize={120} rounded={false} style={styles.photo} />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Back"
            style={[styles.back, { top: insets.top + space.sm }]}
          >
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          <View style={styles.tagSpot}>
            <PorchTag size="lg" label={`About ${item.distanceMi} mi away`} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>

          <View style={styles.owner}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.owner.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>{item.owner}</Text>
              <Text style={type.meta}>
                {item.area}, posted {postedLabel(item.postedHoursAgo)}
              </Text>
            </View>
          </View>

          <Text style={type.body}>{item.description}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Posted in</Text>
            <View style={styles.circleRow}>
              {item.circleIds.map((cid) => {
                const c = circleById(cid);
                return c ? (
                  <View key={cid} style={styles.circleChip}>
                    <Text style={styles.circleChipText}>
                      {c.emoji} {c.name}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>

          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={16} color={color.inkSoft} />
            <Text style={[type.meta, { flex: 1 }]}>
              {item.owner} shares the pickup address in a private chat with the person they pick.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        {pending ? (
          <>
            <Text style={styles.barNote}>
              {item.owner} picked someone. You'll get a notification if it becomes available again.
            </Text>
            <View style={[styles.primary, styles.primaryDisabled]}>
              <Text style={[styles.primaryText, { color: color.pending }]}>Pending pickup</Text>
            </View>
          </>
        ) : requested ? (
          <>
            <Text style={styles.barNote}>
              {item.owner} will pick from everyone who asked. If it's you, a chat opens to arrange pickup.
            </Text>
            <View style={styles.requestedRow}>
              <View style={[styles.primary, styles.primaryDone, { flex: 1 }]}>
                <Ionicons name="checkmark" size={18} color={color.circle} />
                <Text style={[styles.primaryText, { color: color.circle }]}>Requested</Text>
              </View>
              <Pressable
                onPress={() => {
                  setRequested(false);
                  setNote("");
                }}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Withdraw</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={() => setSheetOpen(true)} style={styles.primary}>
            <Text style={styles.primaryText}>Request</Text>
          </Pressable>
        )}
      </View>

      {/* Request sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetWrap}>
          <Pressable style={styles.scrim} onPress={() => setSheetOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>
              Ask {item.owner} for the {lowerTitle}
            </Text>
            <Text style={type.meta}>Add a note if you like. Only {item.owner} sees it.</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX}
              multiline
              autoFocus
              placeholder="e.g. Baby due in March, can pick up any evening"
              placeholderTextColor={color.inkFaint}
              style={styles.noteInput}
            />
            <Text style={[type.meta, styles.counter]}>
              {note.length}/{NOTE_MAX}
            </Text>
            <Pressable
              onPress={() => {
                setSheetOpen(false);
                setRequested(true);
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Send request</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  missing: { flex: 1, padding: space.lg, gap: space.md, backgroundColor: color.paper },
  link: { color: color.circle, fontSize: 16, fontWeight: "600" },
  photo: { width: "100%", height: 340 },
  back: {
    position: "absolute",
    left: space.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagSpot: { position: "absolute", bottom: -16, left: space.lg },
  body: { padding: space.lg, paddingTop: space.xxl, gap: space.lg },
  title: { ...type.display, fontSize: 28, lineHeight: 34, color: color.ink },
  owner: { flexDirection: "row", alignItems: "center", gap: space.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...type.heading, fontSize: 17, color: color.ink },
  ownerName: { fontSize: 16, fontWeight: "600", color: color.ink },
  section: { gap: space.sm },
  sectionLabel: { ...type.heading, fontSize: 15, color: color.ink },
  circleRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  circleChip: {
    backgroundColor: color.circleSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  circleChipText: { color: color.circle, fontWeight: "600", fontSize: 14 },
  privacy: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "flex-start",
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
  },
  barNote: { ...type.meta },
  primary: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryDisabled: { backgroundColor: color.pendingSoft },
  primaryDone: { backgroundColor: color.circleSoft },
  primaryText: { color: color.paper, fontSize: 17, fontWeight: "600" },
  requestedRow: { flexDirection: "row", gap: space.sm },
  secondary: {
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: color.ink, fontSize: 16, fontWeight: "600" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(23,32,51,0.35)" },
  sheet: {
    backgroundColor: color.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
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
  sheetTitle: { ...type.heading, fontSize: 21, lineHeight: 27, color: color.ink },
  noteInput: {
    minHeight: 96,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    paddingTop: space.md,
    fontSize: 16,
    color: color.ink,
    textAlignVertical: "top",
    marginTop: space.sm,
  },
  counter: { alignSelf: "flex-end", marginBottom: space.sm },
});
