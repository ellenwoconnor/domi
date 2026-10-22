import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CircleBadge } from "../../src/features/circles/CircleBadge";
import { shareInvite } from "../../src/features/circles/invite";
import { errorMessage } from "../../src/lib/errors";
import { ErrorNote, PrimaryButton, TextButton } from "../../src/ui/Form";
import { Avatar } from "../../src/ui/Avatar";
import { ScreenHeader } from "../../src/ui/ScreenHeader";
import { color, font, radius, space, type } from "../../src/ui/theme";

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function confirm(title: string, message: string, action: string, destructive = false) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: action, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]),
  );
}

export default function CircleDetail() {
  const { id } = useLocalSearchParams<{ id: Id<"communities"> }>();
  const convex = useConvex();
  const circleQ = useQuery(convexQuery(api.communities.get, { communityId: id }));
  const membersQ = useQuery(convexQuery(api.communities.members, { communityId: id }));
  const leave = useMutation(api.communities.leave);
  const removeMember = useMutation(api.communities.removeMember);
  const deleteCircle = useMutation(api.communities.deleteCircle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const c = circleQ.data;
  if (circleQ.error) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader />
        <View style={styles.body}>
          <Text style={type.title}>You're not in this circle anymore.</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!c) return <SafeAreaView style={styles.screen} />;

  const isOwner = c.role === "owner";
  const custom = c.kind === "custom";
  const canRemove = isOwner && custom;
  const members = membersQ.data ?? [];
  const visible = showAll ? members : members.slice(0, 8);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const invite = () => run(() => shareInvite({ id: c.id, name: c.name, emoji: c.emoji }));

  const doLeave = () =>
    run(async () => {
      const p = await convex.query(api.communities.previewLeaving, { communityId: c.id });
      const lost = [
        p.listings ? plural(p.listings, "listing") : null,
        p.requests ? plural(p.requests, "request") : null,
        p.wishes ? plural(p.wishes, "wish", "wishes") : null,
      ].filter(Boolean);
      const message =
        (lost.length ? `This will cancel ${lost.join(", ")} that only live in this circle. ` : "") +
        (isOwner ? "Someone else will become the circle's owner." : "You can rejoin with an invite.");
      if (!(await confirm(`Leave ${c.name}?`, message, "Leave", true))) return;
      await leave({ communityId: c.id });
      router.back();
    });

  const doDelete = () =>
    run(async () => {
      const ok = await confirm(
        `Delete ${c.name}?`,
        "Everyone is removed and listings that only live here are taken down. This can't be undone.",
        "Delete circle",
        true,
      );
      if (!ok) return;
      await deleteCircle({ communityId: c.id });
      router.back();
    });

  const doRemove = (member: { userId: Id<"users">; displayName: string }) =>
    run(async () => {
      const ok = await confirm(
        `Remove ${member.displayName}?`,
        `${member.displayName} will leave ${c.name} and can't rejoin with an invite.`,
        "Remove",
        true,
      );
      if (ok) await removeMember({ communityId: c.id, userId: member.userId });
    });

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader
        right={
          isOwner && custom ? (
            <Pressable onPress={() => router.push({ pathname: "/circle/form", params: { id: c.id } })} hitSlop={12}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <CircleBadge kind={c.kind} emoji={c.emoji} size={88} />
          <Text style={[type.display, { textAlign: "center" }]}>{c.name}</Text>
          {c.description ? <Text style={[type.caption, { textAlign: "center" }]}>{c.description}</Text> : null}
          <Text style={type.meta}>
            {plural(c.memberCount, "neighbor")}
            {c.startedBy ? ` · started by ${c.startedBy}` : ""}
          </Text>
        </View>

        {custom ? (
          <PrimaryButton title="Invite a neighbor" onPress={invite} busy={busy} />
        ) : (
          <Text style={[type.meta, styles.note]}>
            Everyone in your zip code is here. To change your home circle, edit the zip in your profile.
          </Text>
        )}

        <ErrorNote message={error} />

        <View>
          <Text style={styles.h2}>Neighbors</Text>
          {visible.map((m) => (
            <Pressable
              key={m.userId}
              disabled={!canRemove || m.isMe}
              onPress={() => doRemove(m)}
              style={styles.member}
              accessibilityHint={canRemove && !m.isMe ? "Remove from circle" : undefined}
            >
              <Avatar name={m.displayName} />
              <Text style={[type.body, { flex: 1 }]}>{m.isMe ? "You" : m.displayName}</Text>
              {m.role === "owner" ? <Text style={type.meta}>Started it</Text> : null}
            </Pressable>
          ))}
          {members.length > visible.length ? (
            <TextButton title={`See all ${members.length}`} onPress={() => setShowAll(true)} />
          ) : null}
        </View>

        {custom ? (
          <View style={styles.danger}>
            <Quiet label="Leave this circle" onPress={doLeave} />
            {isOwner ? <Quiet label="Delete this circle" onPress={doDelete} /> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  hero: { alignItems: "center", gap: space.sm },
  edit: { fontFamily: font.uiSemi, fontSize: 16, color: color.bay },
  note: { backgroundColor: color.fog, padding: space.md, borderRadius: radius.control },
  h2: { fontFamily: font.uiBold, fontSize: 17, color: color.ink, marginBottom: 6 },
  member: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  quiet: { minHeight: 44, justifyContent: "center" },
  quietText: { fontFamily: font.ui, fontSize: 15, color: color.inkSoft },
  danger: { alignItems: "flex-start" },
});

function Quiet({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.quiet}>
      <Text style={styles.quietText}>{label}</Text>
    </Pressable>
  );
}
