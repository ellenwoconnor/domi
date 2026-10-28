import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { useAccountActions } from "../src/features/auth/useAccountActions";
import { openLegal } from "../src/features/legal";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote, PrimaryButton, TextButton } from "../src/ui/Form";
import { Logo } from "../src/ui/Logo";
import { color, radius, space, type } from "../src/ui/theme";

/**
 * Shown instead of the app when the terms changed since this person accepted
 * them (appConfig "terms_version" moved past profiles.termsVersion). Agreeing
 * calls profiles.acceptTerms; the root layout's guard then shows the app.
 * Someone who doesn't agree can sign out or delete their account from here.
 */
export default function UpdatedTerms() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const accept = useMutation(api.profiles.acceptTerms);
  const { doSignOut, confirmDelete, deleting, error: accountError } = useAccountActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = me?.profile?.currentTermsVersion ?? null;

  async function agree() {
    if (!version) return;
    setBusy(true);
    setError(null);
    try {
      await accept({ termsVersion: version });
      // No navigation needed: the root guard shows the app once the profile is current.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        <Logo size={28} />
        <View style={{ gap: space.sm }}>
          <Text style={type.display}>We've updated our terms.</Text>
          <Text style={type.caption}>Take a look, then agree to keep using Domi.</Text>
        </View>

        <View style={styles.links}>
          <LegalRow title="Terms of Service" onPress={() => openLegal("terms")} />
          <View style={styles.line} />
          <LegalRow title="Privacy Policy" onPress={() => openLegal("privacy")} />
        </View>

        <ErrorNote message={error ?? accountError} />

        <View style={styles.other}>
          <Text style={type.meta}>Don't agree? You can sign out, or delete your account and everything in it.</Text>
          <View style={styles.otherButtons}>
            <TextButton title="Sign out" onPress={() => doSignOut().catch(() => {})} />
            <TextButton title={deleting ? "Deleting…" : "Delete my account"} tone="ink" onPress={confirmDelete} />
          </View>
        </View>
      </ScrollView>
      <View style={styles.bar}>
        <PrimaryButton title="Agree and continue" onPress={agree} busy={busy} disabled={!version || deleting} />
      </View>
    </SafeAreaView>
  );
}

function LegalRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.row}>
      <Text style={[type.body, { flex: 1 }]}>{title}</Text>
      <Ionicons name="open-outline" size={20} color={color.bay} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  links: { borderRadius: radius.control, backgroundColor: color.fog, paddingHorizontal: space.md },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space.md, minHeight: 50 },
  line: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  other: { gap: space.sm, marginTop: space.md },
  otherButtons: { flexDirection: "row", gap: space.lg },
  bar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
