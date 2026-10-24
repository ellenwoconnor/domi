import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { Avatar } from "../../ui/Avatar";
import { CircleMark } from "../../ui/Logo";
import { PhotoTile } from "../../ui/PhotoTile";
import { color, font, radius, space, type } from "../../ui/theme";
import { circleLabel, type CircleView } from "./format";

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 1000;

/** A photo on the listing: a local file still to upload, or one already stored. */
export type PhotoEntry = { uri: string; storageId?: string };

export type ListingValues = {
  photos: PhotoEntry[];
  title: string;
  description: string;
  circleIds: CircleView["id"][];
};

/**
 * Write the placard: the listing edited in place, looking the way neighbors
 * will see it (big photo, italic title, who it's from, the circles).
 * Used for a new listing and for editing one.
 */
export function ListingEditor({
  initial,
  circles,
  ownerName,
  submitLabel,
  busyLabel,
  onClose,
  onSubmit,
  onChangeCircles,
}: {
  initial: ListingValues;
  circles: CircleView[];
  ownerName: string;
  submitLabel: string;
  busyLabel: string;
  onClose: (dirty: boolean) => void;
  onSubmit: (values: ListingValues) => Promise<void>;
  /** Opens the circle picker; it calls back with the new selection. */
  onChangeCircles: (current: CircleView["id"][], done: (next: CircleView["id"][]) => void) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState(initial.photos);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [circleIds, setCircleIds] = useState(initial.circleIds);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const dirty =
    title !== initial.title ||
    description !== initial.description ||
    photos.length !== initial.photos.length ||
    circleIds.join() !== initial.circleIds.join();
  const chosen = circles.filter((c) => circleIds.includes(c.id));
  const missing = photos.length === 0 ? "Add a photo" : title.trim() === "" ? "Name it" : chosen.length === 0 ? "Pick a circle" : null;

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
    if (missing || busy) return;
    setBusy(true);
    try {
      await onSubmit({ photos, title: title.trim(), description: description.trim(), circleIds });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={styles.photoArea}>
          {photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll}>
              {photos.map((p) => (
                <PhotoTile key={p.uri} uri={p.uri} rounded={false} style={{ width, height: 330 }} />
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
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Name it"
            placeholderTextColor={color.inkFaint}
            maxLength={TITLE_MAX}
            autoFocus={initial.title === ""}
            returnKeyType="next"
            accessibilityLabel="Title"
            style={styles.title}
          />

          <View style={styles.owner}>
            <Avatar name={ownerName} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={type.label}>From you</Text>
              <Text style={type.meta}>Neighbors see roughly how far away you are, never your address.</Text>
            </View>
          </View>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Condition, size, anything a neighbor should know. (Optional)"
            placeholderTextColor={color.inkFaint}
            maxLength={DESCRIPTION_MAX}
            multiline
            accessibilityLabel="Description"
            style={styles.description}
          />

          <View style={{ gap: space.sm }}>
            <Text style={type.label}>In your circles</Text>
            <View style={styles.circleRow}>
              {chosen.map((c) => (
                <View key={c.id} style={styles.circleChip}>
                  {c.kind === "zip" ? <CircleMark size={13} /> : null}
                  <Text style={styles.circleChipText}>{circleLabel(c)}</Text>
                </View>
              ))}
              <Pressable
                onPress={() => onChangeCircles(circleIds, setCircleIds)}
                style={styles.changeChip}
                accessibilityRole="button"
                accessibilityLabel="Change circles"
              >
                <Text style={styles.changeText}>{chosen.length ? "Change" : "Pick circles"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Text style={[type.meta, { textAlign: "center" }]}>{missing ?? "This is how neighbors will see it."}</Text>
        <Pressable
          onPress={submit}
          disabled={!!missing || busy}
          accessibilityRole="button"
          style={[styles.primary, (!!missing || busy) && { opacity: 0.5 }]}
        >
          {busy ? (
            <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
              <ActivityIndicator color={color.white} />
              <Text style={type.button}>{busyLabel}</Text>
            </View>
          ) : (
            <Text style={type.button}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  photoArea: { height: 330, backgroundColor: color.fog },
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
  body: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.lg },
  title: {
    fontFamily: font.curator,
    fontSize: 32,
    lineHeight: 38,
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
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
});
