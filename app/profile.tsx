import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote, Field, PrimaryButton } from "../src/ui/Form";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, space } from "../src/ui/theme";

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Edit profile: name and zip (with the "this will cancel…" check). Sign out and delete live in Account. */
export default function EditProfile() {
  const convex = useConvex();
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const updateProfile = useMutation(api.profiles.updateProfile);
  const changeZip = useMutation(api.profiles.changeZip);

  const profile = me?.profile;
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState<null | "name" | "zip">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.displayName);
      setZip(profile.zip);
    }
  }, [profile?.displayName, profile?.zip]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveName() {
    setError(null);
    setBusy("name");
    try {
      await updateProfile({ displayName: name });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveZip() {
    setError(null);
    setBusy("zip");
    try {
      const preview = await convex.query(api.profiles.previewZipChange, { zip });
      if (!preview.knownZip) {
        setError("We don't recognize that zip code.");
        return;
      }
      const lost = [
        preview.listings ? plural(preview.listings, "listing") : null,
        preview.requests ? plural(preview.requests, "request") : null,
        preview.wishes ? plural(preview.wishes, "wish", "wishes") : null,
      ].filter(Boolean);
      const message = lost.length
        ? `This will cancel ${lost.join(", ")} in ${preview.oldZip}. Your custom circles aren't affected.`
        : `You'll move from the ${preview.oldZip} circle to the ${preview.newZip} circle. Your custom circles aren't affected.`;
      const ok = await new Promise<boolean>((resolve) =>
        Alert.alert("Change your zip code?", message, [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Change zip", onPress: () => resolve(true) },
        ]),
      );
      if (ok) await changeZip({ zip });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!profile) return <SafeAreaView style={styles.screen} />;

  const nameChanged = name.trim() !== profile.displayName;
  const zipChanged = zip !== profile.zip;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title="Edit profile" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Field label="Your name" value={name} onChangeText={setName} maxLength={40} />
          {nameChanged ? (
            <PrimaryButton title="Save name" onPress={saveName} busy={busy === "name"} disabled={!name.trim()} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Field
            label="Zip code"
            hint="Your zip decides your home circle."
            value={zip}
            onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))}
            keyboardType="number-pad"
            maxLength={5}
          />
          {zipChanged ? (
            <PrimaryButton title="Change zip" onPress={saveZip} busy={busy === "zip"} disabled={!/^\d{5}$/.test(zip)} />
          ) : null}
        </View>

        <ErrorNote message={error} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  section: { gap: space.md },
});
