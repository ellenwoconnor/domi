import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_PHOTOS, pickPhotos, takePhoto } from "../give/photos";
import { PhotoTile } from "../../ui/PhotoTile";
import { color, font, radius, space, type } from "../../ui/theme";
import { CirclePickerSheet } from "./CirclePickerSheet";
import { circleLabel, type CircleView } from "./format";

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 1000;

/** A photo on the listing: a local file still to upload, or one already stored. */
export type PhotoEntry = { uri: string; storageId?: string; thumbId?: string | null };

export type ListingValues = {
  photos: PhotoEntry[];
  title: string;
  description: string;
  circleIds: CircleView["id"][];
};

/** An offer for a wish goes to one person instead of to circles. */
export type SendTo = { name: string };

/**
 * Write the placard: the listing edited in place, looking the way neighbors
 * will see it (photo, italic title, the circles), with a small label on each
 * field so it's clear what's left to fill in. Opens with the keyboard down so
 * every field shows; while typing, the Post bar gives way to a Next/Done row.
 * Used for a new listing, for editing one, and for an offer on a wish
 * (`sendTo`: "Goes to Sam" replaces the circles, and the button is Poppy).
 */
export function ListingEditor({
  initial,
  circles,
  submitLabel,
  busyLabel,
  onClose,
  onSubmit,
  sendTo,
}: {
  sendTo?: SendTo;
  initial: ListingValues;
  circles: CircleView[];
  submitLabel: string;
  busyLabel: string;
  onClose: (dirty: boolean) => void;
  onSubmit: (values: ListingValues) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState(initial.photos);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [circleIds, setCircleIds] = useState(initial.circleIds);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState<"title" | "description" | null>(null);
  // What's missing, shown only after a tap on Post that couldn't go through.
  const [nudged, setNudged] = useState(false);
  const keyboard = useKeyboardHeight();
  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  const dirty =
    title !== initial.title ||
    description !== initial.description ||
    photos.length !== initial.photos.length ||
    circleIds.join() !== initial.circleIds.join();
  const chosen = circles.filter((c) => circleIds.includes(c.id));
  const missing = photos.length === 0 ? "Add a photo" : title.trim() === "" ? "Name it" : !sendTo && chosen.length === 0 ? "Pick who sees it" : null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const addPhotos = () => {
    const room = MAX_PHOTOS - photos.length;
    const add = async (get: () => Promise<string[]>) => {
      try {
        const uris = await get();
        if (uris.length) setPhotos((p) => [...p, ...uris.map((uri) => ({ uri }))].slice(0, MAX_PHOTOS));
      } catch {
        Alert.alert("Couldn't use that photo", "Try again, or pick a different one.");
      }
    };
    Alert.alert("Add a photo", undefined, [
      { text: "Take photo", onPress: () => add(async () => ((p) => (p ? [p] : []))(await takePhoto())) },
      { text: "Choose from library", onPress: () => add(() => pickPhotos(room)) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeCurrent = () => {
    setPhotos((p) => p.filter((_, i) => i !== page));
    setPage((n) => Math.max(0, Math.min(n, photos.length - 2)));
  };

  const submit = async () => {
    if (busy) return;
    if (missing) {
      setNudged(true);
      if (missing === "Name it") titleRef.current?.focus();
      else if (missing === "Pick who sees it") setPicking(true);
      else if (missing === "Add a photo") addPhotos();
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ photos, title: title.trim(), description: description.trim(), circleIds });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: 150 + keyboard }}
      >
        <View style={styles.photoArea}>
          {photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
              {photos.map((p) => (
                <PhotoTile key={p.uri} uri={p.uri} rounded={false} style={{ width, height: 250 }} />
              ))}
            </ScrollView>
          ) : (
            <Pressable onPress={addPhotos} style={styles.noPhoto} accessibilityRole="button">
              <Ionicons name="camera-outline" size={36} color={color.bay} />
              <Text style={type.label}>Add a photo</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onClose(dirty)}
            accessibilityLabel="Close"
            style={[styles.round, { top: insets.top + space.sm, left: space.lg }]}
          >
            <Ionicons name="close" size={22} color={color.ink} />
          </Pressable>
          <View style={[styles.freeSticker, { top: insets.top + space.sm }]}>
            <View style={styles.freeDot} />
            <Text style={styles.freeText}>Free</Text>
          </View>
          {photos.length > 0 ? (
            <View style={styles.photoBar}>
              {photos.length > 1 ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {page + 1} of {photos.length}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {photos.length > 1 ? (
                  <Pressable onPress={removeCurrent} style={styles.photoButton} accessibilityLabel="Remove this photo">
                    <Ionicons name="trash-outline" size={16} color={color.ink} />
                  </Pressable>
                ) : null}
                {photos.length < MAX_PHOTOS ? (
                  <Pressable onPress={addPhotos} style={styles.photoButton} accessibilityRole="button">
                    <Ionicons name="add" size={18} color={color.bay} />
                    <Text style={styles.photoButtonText}>Photo</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={[type.label, focused === "title" && styles.labelOn]}>What is it?</Text>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="Kids' bike helmet"
              placeholderTextColor={color.inkFaint}
              maxLength={TITLE_MAX}
              onFocus={() => setFocused("title")}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              accessibilityLabel="What is it?"
              style={[styles.title, focused === "title" && styles.inputOn]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[type.label, focused === "description" && styles.labelOn]}>
              Details <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              ref={descriptionRef}
              value={description}
              onChangeText={setDescription}
              placeholder="Condition, size, anything someone should know"
              placeholderTextColor={color.inkFaint}
              maxLength={DESCRIPTION_MAX}
              multiline
              onFocus={() => setFocused("description")}
              onBlur={() => setFocused(null)}
              accessibilityLabel="Details (optional)"
              style={[styles.description, focused === "description" && styles.inputOn]}
            />
          </View>

          {sendTo ? (
            <View style={[styles.owner, styles.sendTo]}>
              <View style={styles.sendAvatar}>
                <Text style={styles.sendInitial}>{sendTo.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.label}>Goes to {sendTo.name}</Text>
                <Text style={type.meta}>For their wish. Only {sendTo.name} sees it, and picks from any offers.</Text>
              </View>
            </View>
          ) : (
          <View style={{ gap: space.sm }}>
            <Text style={type.label}>Who sees it</Text>
            <View style={styles.circleRow}>
              {chosen.map((c) => (
                <View key={c.id} style={styles.circleChip}>
                  <Text style={styles.circleChipText}>{circleLabel(c)}</Text>
                </View>
              ))}
              <Pressable
                onPress={() => setPicking(true)}
                style={styles.changeChip}
                accessibilityRole="button"
                accessibilityLabel="Change who sees it"
              >
                <Text style={styles.changeText}>{chosen.length ? "Change" : "Choose who sees it"}</Text>
              </Pressable>
            </View>
          </View>
          )}
          <Text style={[type.meta, { marginTop: -space.sm }]}>
            From you. People see roughly how far away you are, never your address.
          </Text>
        </View>
      </ScrollView>

      {keyboard > 0 ? (
        // While typing: what's next instead of Post, riding on the keyboard.
        <View style={[styles.next, { bottom: keyboard }]}>
          <Text style={[type.meta, { flex: 1 }]} numberOfLines={1}>
            {focused === "title"
              ? sendTo
                ? "Next: details"
                : "Next: details, then who sees it"
              : sendTo
                ? "Details are optional"
                : "Details are optional. Then who sees it."}
          </Text>
          <Pressable
            onPress={() => (focused === "title" ? descriptionRef.current?.focus() : Keyboard.dismiss())}
            accessibilityRole="button"
            hitSlop={6}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>{focused === "title" ? "Next" : "Done"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          {nudged && missing ? <Text style={[type.meta, { textAlign: "center" }]}>{missing}</Text> : null}
          <Pressable
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!missing || busy }}
            style={[styles.primary, sendTo && styles.poppy, (!!missing || busy) && { opacity: 0.5 }]}
          >
            {busy ? (
              <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                <ActivityIndicator color={sendTo ? color.ink : color.white} />
                <Text style={[type.button, sendTo && styles.poppyText]}>{busyLabel}</Text>
              </View>
            ) : (
              <Text style={[type.button, sendTo && styles.poppyText]}>{submitLabel}</Text>
            )}
          </Pressable>
        </View>
      )}

      <CirclePickerSheet
        visible={picking}
        circles={circles}
        selected={circleIds}
        onClose={(next) => {
          setPicking(false);
          if (next) setCircleIds(next);
        }}
      />
    </View>
  );
}

/** Height of the on-screen keyboard (0 when hidden). */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  photoArea: { height: 250, backgroundColor: color.fog },
  noPhoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  round: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
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
  photoBar: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pill: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: font.uiSemi, fontSize: 13, color: color.ink },
  photoButton: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoButtonText: { fontFamily: font.uiSemi, fontSize: 14, color: color.bay },
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.lg },
  field: { gap: 6 },
  labelOn: { color: color.bay },
  optional: { fontFamily: font.ui, color: color.inkSoft },
  inputOn: { borderBottomColor: color.bay },
  title: {
    fontFamily: font.curator,
    fontSize: 30,
    lineHeight: 36,
    color: color.ink,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: color.line,
  },
  owner: { flexDirection: "row", alignItems: "center", gap: space.md },
  description: {
    minHeight: 72,
    fontFamily: font.ui,
    fontSize: 16,
    lineHeight: 24,
    color: color.ink,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: color.line,
    textAlignVertical: "top",
  },
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
  changeChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: { fontFamily: font.uiSemi, color: color.bay, fontSize: 14 },
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
  next: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    backgroundColor: color.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  nextButton: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.bay, justifyContent: "center" },
  nextText: { fontFamily: font.uiSemi, fontSize: 14, color: color.white },
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  // A giving moment: Poppy with Ink text.
  poppy: { backgroundColor: color.poppy },
  poppyText: { color: color.ink, fontFamily: font.uiBold },
  sendTo: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, paddingTop: space.lg },
  sendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  sendInitial: { fontFamily: font.uiBold, fontSize: 16, color: color.bay },
});
