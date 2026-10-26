import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useAskForPush } from "../../src/features/push/useAskForPush";
import { Keyboard, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmojiPicker } from "../../src/features/circles/EmojiPicker";
import { errorMessage } from "../../src/lib/errors";
import { ErrorNote, Field, PrimaryButton } from "../../src/ui/Form";
import { FormScroll } from "../../src/ui/FormScroll";
import { ScreenHeader } from "../../src/ui/ScreenHeader";
import { color, space } from "../../src/ui/theme";

/** Start a circle (optionally prefilled with ?name=&emoji=), or (with ?id=) edit one you own. */
export default function CircleForm() {
  const { id, name: presetName, emoji: presetEmoji } = useLocalSearchParams<{
    id?: Id<"communities">;
    name?: string;
    emoji?: string;
  }>();
  const editing = !!id;
  const existing = useQuery(convexQuery(api.communities.get, id ? { communityId: id } : "skip"));
  const create = useMutation(api.communities.create);
  const update = useMutation(api.communities.update);

  const [emoji, setEmoji] = useState(presetEmoji || "🏡");
  const [name, setName] = useState(presetName ?? "");
  const [description, setDescription] = useState("");
  const askForPush = useAskForPush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = existing.data;
    if (c) {
      setEmoji(c.emoji);
      setName(c.name);
      setDescription(c.description ?? "");
    }
  }, [existing.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    Keyboard.dismiss();
    setError(null);
    setBusy(true);
    try {
      if (id) {
        await update({ communityId: id, name, emoji, description });
        router.back();
      } else {
        const newId = await create({ name, emoji, description: description || undefined });
        router.replace(`/circle/${newId}`); // straight to the circle, where Invite is
        askForPush("join", { circle: name.trim() }).catch(() => {});
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title={editing ? "Edit circle" : "Start a circle"} close />
      <FormScroll>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Spruce St, Baby Shower, Building B…"
          maxLength={40}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
        />
        <EmojiPicker
          value={emoji}
          onChange={(e) => {
            Keyboard.dismiss();
            setEmoji(e);
          }}
        />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Who it's for, in a sentence."
          maxLength={280}
          multiline
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          style={styles.multiline}
        />
        <ErrorNote message={error} />
        <PrimaryButton
          title={editing ? "Save" : "Start circle"}
          onPress={save}
          busy={busy}
          disabled={!name.trim() || !emoji}
        />
      </FormScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  multiline: { height: 96, paddingTop: space.md, textAlignVertical: "top" },
});
