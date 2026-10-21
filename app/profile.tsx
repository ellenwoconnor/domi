import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { signOutOfProviders } from "../src/features/auth/nativeSignIn";
import { openLegal } from "../src/features/legal";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote, Field, PrimaryButton, TextButton } from "../src/ui/Form";
import { color, font, radius, space, type } from "../src/ui/theme";

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Profile: name, zip (with the "this will cancel…" check), sign out, delete account. */
export default function Profile() {
  const convex = useConvex();
  const { signOut } = useAuthActions();
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const updateProfile = useMutation(api.profiles.updateProfile);
  const changeZip = useMutation(api.profiles.changeZip);
  const deleteAccount = useMutation(api.profiles.deleteAccount);

  const profile = me?.profile;
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState<null | "name" | "zip" | "delete">(null);
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

  async function doSignOut() {
    await signOutOfProviders();
    await signOut();
  }

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your profile, listings, wishes, requests and messages. Anyone you were arranging a pickup with will be told. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteAccount({});
              await signOutOfProviders();
              await signOut().catch(() => {}); // the session is already gone on the server
            } catch (e) {
              setError(errorMessage(e));
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  if (!profile) return <SafeAreaView style={styles.screen} />;

  const nameChanged = name.trim() !== profile.displayName;
  const zipChanged = zip !== profile.zip;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={color.ink} />
        </Pressable>
        <Text style={type.title}>You</Text>
        <View style={{ width: 26 }} />
      </View>
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

        <View style={styles.links}>
          <TextButton title="Terms of Service" onPress={() => openLegal("terms")} tone="ink" />
          <TextButton title="Privacy Policy" onPress={() => openLegal("privacy")} tone="ink" />
        </View>

        <View style={styles.section}>
          <TextButton title="Sign out" onPress={doSignOut} />
          <TextButton title={busy === "delete" ? "Deleting…" : "Delete account"} onPress={confirmDelete} tone="ink" />
        </View>
        <Text style={[type.meta, styles.version]}>Domi {Constants.expoConfig?.version ?? ""}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  section: { gap: space.md },
  links: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    paddingVertical: space.sm,
    alignItems: "flex-start",
  },
  version: { textAlign: "center", fontFamily: font.ui, color: color.inkFaint, borderRadius: radius.pill },
});
