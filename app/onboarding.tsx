import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { clearPendingCodes, getPendingCodes, type PendingCodes } from "../src/features/auth/pendingCodes";
import { openLegal } from "../src/features/legal";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote, Field, PrimaryButton, TextButton } from "../src/ui/Form";
import { Logo } from "../src/ui/Logo";
import { color, radius, space, type } from "../src/ui/theme";

/**
 * Profile setup after first sign-in: display name, zip, terms, and any invite
 * code. One call to profiles.completeSignup; when it succeeds, the root
 * layout's guard moves the person into the app.
 */
export default function Onboarding() {
  const { data: user } = useQuery(convexQuery(api.users.me, {}));
  const { data: terms } = useQuery(convexQuery(api.appConfig.get, { key: "terms_version" }));
  const completeSignup = useMutation(api.profiles.completeSignup);

  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [pending, setPending] = useState<PendingCodes>({ invites: [], shares: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPendingCodes().then(setPending);
  }, []);

  // Apple and Google share a name on first sign-in; suggest the first name.
  useEffect(() => {
    if (user?.name && !name) setName(user.name.split(" ")[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

  const zipOk = /^\d{5}$/.test(zip);
  const ready = name.trim().length > 0 && zipOk && agreed && !!terms?.value;

  async function submit() {
    if (!terms?.value) return;
    setError(null);
    setBusy(true);
    const inviteCodes = [...pending.invites, ...(typedCode.trim() ? [typedCode.trim()] : [])];
    try {
      const result = await completeSignup({
        displayName: name,
        zip,
        termsVersion: terms.value,
        inviteCodes,
        shareCodes: pending.shares,
      });
      await clearPendingCodes();
      const failed =
        result.invites.filter((i) => !i.result.ok).length + result.shares.filter((s) => !s.result.ok).length;
      if (failed > 0) {
        Alert.alert(
          "You're in!",
          failed === 1
            ? "One code didn't work. It may have expired; ask for a new link."
            : `${failed} codes didn't work. They may have expired; ask for new links.`,
        );
      }
      // No navigation needed: the profile now exists, so the root guard shows the app.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const fromInvite = pending.invites.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Logo size={28} />
          <View style={{ gap: space.sm }}>
            <Text style={type.display}>Welcome, neighbor.</Text>
            <Text style={type.caption}>
              {fromInvite
                ? "You'll join the circle you were invited to, plus the circle for your zip code."
                : "We'll put you in the circle for your zip code. You can join others by invite."}
            </Text>
          </View>

          <Field
            label="Your name"
            hint="What neighbors see. A first name is plenty."
            value={name}
            onChangeText={setName}
            autoComplete="given-name"
            textContentType="givenName"
            maxLength={40}
            returnKeyType="next"
          />
          <Field
            label="Zip code"
            hint="Listings show an approximate area, never your address."
            value={zip}
            onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))}
            keyboardType="number-pad"
            autoComplete="postal-code"
            textContentType="postalCode"
            maxLength={5}
          />

          {codeOpen ? (
            <Field
              label="Invite code"
              value={typedCode}
              onChangeText={setTypedCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="e.g. 7K2M-QX9P"
              maxLength={12}
            />
          ) : (
            <View style={{ alignItems: "flex-start" }}>
              <TextButton title="Have an invite code?" onPress={() => setCodeOpen(true)} />
            </View>
          )}

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            onPress={() => setAgreed(!agreed)}
            style={styles.agree}
          >
            <Ionicons name={agreed ? "checkbox" : "square-outline"} size={24} color={color.bay} />
            <Text style={[type.body, { flex: 1 }]}>
              I agree to the{" "}
              <Text style={styles.link} onPress={() => openLegal("terms")}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={styles.link} onPress={() => openLegal("privacy")}>
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          <ErrorNote message={error} />
        </ScrollView>
        <View style={styles.bar}>
          <PrimaryButton title="Join Domi" onPress={submit} busy={busy} disabled={!ready} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  agree: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: color.fog,
  },
  link: { color: color.bay, textDecorationLine: "underline" },
  bar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
