import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAskForPush } from "../push/useAskForPush";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { ErrorNote, PrimaryButton } from "../../ui/Form";
import { color, radius, space, type } from "../../ui/theme";
import { addPendingCode } from "../auth/pendingCodes";
import { CircleBadge } from "./CircleBadge";

const REASONS: Record<string, string> = {
  invalid: "That invite code doesn't exist. Check it and try again.",
  revoked: "That invite link has been replaced. Ask for a new one.",
  banned: "You can't rejoin this circle.",
  unavailable: "That invite isn't available.",
  too_many_circles: "You're in 10 circles, the most for now. Leave one to join this one.",
};

/**
 * "Sam invited you to 🍼 Baby Shower". Members confirm and join; people who
 * aren't signed up yet get the code saved and are sent to sign-in, and
 * profiles.completeSignup redeems it.
 */
export function JoinCard({ code, mode }: { code: string; mode: "member" | "signIn" | "onboarding" }) {
  const preview = useQuery(convexQuery(api.invites.preview, { code }));
  const redeem = useMutation(api.invites.redeem);
  const askForPush = useAskForPush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "member" && preview.data) addPendingCode("invite", code);
  }, [mode, code, preview.data]);

  if (preview.isPending) return <ActivityIndicator color={color.bay} style={{ marginTop: space.xl }} />;
  const p = preview.data;
  if (!p) {
    return <Text style={[type.body, styles.missing]}>{REASONS.invalid}</Text>;
  }

  async function join() {
    setError(null);
    setBusy(true);
    try {
      const result = await redeem({ code });
      if (result.ok && result.communityId) {
        router.replace(`/circle/${result.communityId}`);
        askForPush("join", { circle: p?.name }).catch(() => {});
        return;
      }
      setError(result.ok ? null : REASONS[result.reason]);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <View style={styles.card}>
      <CircleBadge kind="custom" emoji={p.emoji} size={88} />
      <Text style={[type.meta, { textAlign: "center" }]}>{p.invitedBy} invited you to</Text>
      <Text style={[type.display, { textAlign: "center" }]}>{p.name}</Text>
      {p.description ? <Text style={[type.caption, { textAlign: "center" }]}>{p.description}</Text> : null}
      <Text style={type.meta}>
        Invite-only · {p.memberCount} {p.memberCount === 1 ? "member" : "members"}
      </Text>
      <ErrorNote message={error} />
      <View style={styles.button}>
        {mode === "member" ? (
          <PrimaryButton title="Join circle" onPress={join} busy={busy} />
        ) : (
          <PrimaryButton
            title={mode === "signIn" ? "Sign in to join" : "Finish signing up to join"}
            onPress={() => router.replace(mode === "signIn" ? "/sign-in" : "/onboarding")}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: space.sm, padding: space.lg, borderRadius: radius.sheet, backgroundColor: color.blush },
  button: { alignSelf: "stretch", marginTop: space.md },
  missing: { textAlign: "center", padding: space.lg },
});
