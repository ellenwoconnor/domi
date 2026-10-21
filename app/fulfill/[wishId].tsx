import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShutterRow, Viewfinder } from "../../src/features/give/Viewfinder";
import { claimWish, getWish } from "../../src/features/wishlist/store";
import { CircleMark } from "../../src/ui/Logo";
import { PhotoTile } from "../../src/ui/PhotoTile";
import { color, font, radius, space, type } from "../../src/ui/theme";

type Step = "photo" | "details" | "sent";

/**
 * Fulfilling a wish (spec: wishlist fulfillment). Creates a private listing,
 * picks the wisher automatically and opens a chat. No circle picker.
 */
export default function Fulfill() {
  const { wishId } = useLocalSearchParams<{ wishId: string }>();
  const wish = getWish(wishId);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("photo");
  const [title, setTitle] = useState(wish?.title ?? "");
  const [details, setDetails] = useState("");

  if (!wish) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + space.xl, paddingHorizontal: space.lg, gap: space.md }]}>
        <Text style={type.title}>Someone got there first.</Text>
        <Text style={type.body}>This wish is already being taken care of.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const thing = wish.title.charAt(0).toLowerCase() + wish.title.slice(1);

  if (step === "sent") {
    return (
      <View style={[styles.screen, styles.sent, { paddingTop: insets.top, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.sentCard}>
          <CircleMark size={44} />
          <Text style={[type.display, { textAlign: "center" }]}>Sent to {wish.who}.</Text>
          <Text style={[type.body, { textAlign: "center", color: color.inkSoft }]}>
            A private chat with {wish.who} is open to set up pickup. We'll let you know when they reply.
          </Text>
        </View>
        <View style={{ gap: space.sm, alignSelf: "stretch" }}>
          <Pressable style={styles.primary} onPress={() => router.back()}>
            <Text style={type.button}>Open chat</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { paddingTop: insets.top + space.sm }]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Cancel" hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={color.ink} />
        </Pressable>
        <Text style={type.label}>{step === "photo" ? "Take a photo" : "Add details"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Who this is for */}
      <View style={styles.forBanner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{wish.who.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>
            For {wish.who}'s wish: {thing}
          </Text>
          <Text style={type.meta}>Only {wish.who} will see this listing.</Text>
        </View>
      </View>

      {step === "photo" ? (
        <>
          <Viewfinder style={{ marginHorizontal: space.lg, marginTop: space.md }} />
          <View style={{ paddingBottom: insets.bottom }}>
            <ShutterRow onShutter={() => setStep("details")} />
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <PhotoTile emoji={wish.emoji} emojiSize={72} style={styles.photo} />
            <View style={{ gap: space.sm }}>
              <Text style={type.label}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} />
            </View>
            <View style={{ gap: space.sm }}>
              <Text style={type.label}>Anything {wish.who} should know?</Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                multiline
                placeholder="Worn once, laces a bit muddy."
                placeholderTextColor={color.inkFaint}
                style={[styles.input, styles.multiline]}
              />
            </View>
            <View style={styles.how}>
              <Ionicons name="lock-closed-outline" size={16} color={color.inkSoft} />
              <Text style={[type.meta, { flex: 1 }]}>
                This skips your circles. {wish.who} is picked automatically and a private chat opens for pickup.
              </Text>
            </View>
          </ScrollView>
          <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
            <Pressable
              disabled={!title.trim()}
              onPress={() => {
                claimWish(wish.id);
                setStep("sent");
              }}
              style={[styles.send, !title.trim() && { opacity: 0.4 }]}
            >
              <Text style={styles.sendText}>Send to {wish.who}</Text>
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  link: { fontFamily: font.uiSemi, color: color.bay, fontSize: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  forBanner: {
    marginTop: space.md,
    marginHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.blush,
    borderRadius: radius.thing,
    padding: space.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 16, color: color.bay },
  form: { padding: space.lg, gap: space.lg, paddingBottom: 120 },
  photo: { width: 140, aspectRatio: 4 / 5 },
  input: {
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    height: 48,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
  },
  multiline: { height: 96, paddingTop: space.md, textAlignVertical: "top" },
  how: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
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
  },
  // A giving moment: Poppy with Ink text
  send: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.poppy,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { fontFamily: font.uiBold, fontSize: 17, color: color.ink },
  sent: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, backgroundColor: color.blush },
  sentCard: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { height: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: font.uiSemi, fontSize: 16, color: color.bay },
});
