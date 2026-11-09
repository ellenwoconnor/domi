import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { color, font, radius, space, type } from "../../ui/theme";
import { CircleBadge } from "../circles/CircleBadge";
import { checkInstallMatch, type InstallMatch } from "./installMatch";
import { addPendingCode, getPendingCodes } from "./pendingCodes";

type Found = InstallMatch & { confirmed: boolean };

/**
 * On the sign-in screen: the invite (or shared listing) this person came
 * from. A code saved from a link shows as-is; otherwise domicircles.com may
 * recognize the network that just tapped one, and we ask "Is that you?"
 * before saving it for profiles.completeSignup.
 */
export function SignInInvite() {
  const [found, setFound] = useState<Found | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const saved = await getPendingCodes();
      if (saved.invites[0]) return live && setFound({ kind: "invite", code: saved.invites[0], confirmed: true });
      if (saved.shares[0]) return live && setFound({ kind: "share", code: saved.shares[0], confirmed: true });
      const match = await checkInstallMatch();
      if (live && match) setFound({ ...match, confirmed: false });
    })();
    return () => {
      live = false;
    };
  }, []);

  const invite = useQuery(convexQuery(api.invites.preview, found?.kind === "invite" ? { code: found.code } : "skip")).data;
  const share = useQuery(convexQuery(api.shares.preview, found?.kind === "share" ? { code: found.code } : "skip")).data;

  if (!found) return null;
  const text =
    found.kind === "invite" && invite
      ? { emoji: invite.emoji, line: `${invite.invitedBy} invited you to ${invite.name}`, after: `Sign in to join ${invite.name}.` }
      : found.kind === "share" && share?.available
        ? { emoji: "🎁", line: `${share.ownerName} shared their ${share.title} with you`, after: "Sign in to see it." }
        : null;
  if (!text) return null;

  const yes = async () => {
    await addPendingCode(found.kind, found.code);
    setFound({ ...found, confirmed: true });
  };

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <CircleBadge kind="custom" emoji={text.emoji} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.objectLabel}>{text.line}</Text>
          <Text style={type.meta}>{found.confirmed ? text.after : "Is that you?"}</Text>
        </View>
      </View>
      {found.confirmed ? null : (
        <View style={styles.row}>
          <Pressable onPress={yes} accessibilityRole="button" style={[styles.button, styles.yes]}>
            <Text style={styles.yesText}>Yes, that's me</Text>
          </Pressable>
          <Pressable onPress={() => setFound(null)} accessibilityRole="button" style={styles.button}>
            <Text style={styles.noText}>Not me</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.blush, borderRadius: radius.thing, padding: space.md, gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  button: { flex: 1, height: 44, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  yes: { backgroundColor: color.bay },
  yesText: { fontFamily: font.uiSemi, fontSize: 15, color: color.white },
  noText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
});
