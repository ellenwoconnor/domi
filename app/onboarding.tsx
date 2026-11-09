import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { clearPendingCodes, getPendingCodes, type PendingCodes } from "../src/features/auth/pendingCodes";
import { setLandingItem } from "../src/features/auth/landing";
import { openLegal } from "../src/features/legal";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote, Field, PrimaryButton } from "../src/ui/Form";
import { CircleBadge } from "../src/features/circles/CircleBadge";
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
    const inviteCodes = [...pending.invites, ...(typedClean ? [typedClean] : [])];
    try {
      const result = await completeSignup({
        displayName: name,
        zip,
        termsVersion: terms.value,
        inviteCodes,
        shareCodes: pending.shares,
      });
      await clearPendingCodes();
      const shared = result.shares.find((s) => s.result.ok && s.result.itemId)?.result;
      setLandingItem(shared?.ok && shared.itemId ? shared.itemId : null);
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
  const typedClean = typedCode.toUpperCase().replace(/[\s-]/g, "");

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Logo size={28} />
          <View style={{ gap: space.sm }}>
            <Text style={type.display}>Welcome!</Text>
            <Text style={type.caption}>
              {fromInvite
                ? "You'll join the domi you were invited to, plus your neighborhood."
                : "We'll add you to your neighborhood. You can join a domi by invite."}
            </Text>
          </View>

          <Field
            label="Your name"
            hint="What others see. A first name is plenty."
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

          {fromInvite ? (
            pending.invites.map((code) => <InviteRow key={code} code={code} />)
          ) : (
            <View style={{ gap: space.sm }}>
              <Field
                label="Invite code (optional)"
                hint="Got an invite link? The code is on that page. No code? Leave this blank; you can join a domi later."
                value={typedCode}
                onChangeText={setTypedCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="7K2M-QX9P"
                maxLength={12}
              />
              {typedClean.length === 8 ? <InviteRow code={typedClean} typed /> : null}
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

/** "🍼 Baby Shower · Sam invited you": the domi a saved or typed code joins. */
function InviteRow({ code, typed = false }: { code: string; typed?: boolean }) {
  const preview = useQuery(convexQuery(api.invites.preview, { code }));
  if (preview.isPending) return null;
  const p = preview.data;
  if (!p) {
    return typed ? <Text style={type.meta}>That code doesn't match an invite. Check it, or leave it blank.</Text> : null;
  }
  return (
    <View style={styles.invite}>
      <CircleBadge kind="custom" emoji={p.emoji} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={type.label}>{typed ? `You'll join ${p.name}` : `Joining ${p.name}`}</Text>
        <Text style={type.meta}>{p.invitedBy} invited you</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: color.blush,
  },
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
