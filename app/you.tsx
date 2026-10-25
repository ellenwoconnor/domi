import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { signOutOfProviders } from "../src/features/auth/nativeSignIn";
import { CircleBadge } from "../src/features/circles/CircleBadge";
import { openLegal } from "../src/features/legal";
import { errorMessage } from "../src/lib/errors";
import { Avatar } from "../src/ui/Avatar";
import { ErrorNote } from "../src/ui/Form";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, font, space, type } from "../src/ui/theme";

const neighbors = (n: number) => `${n} ${n === 1 ? "neighbor" : "neighbors"}`;

/** You: who you are, your circles, and settings (incl. sign out and delete). Opened from the My stuff avatar. */
export default function You() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const { data: circles } = useQuery(convexQuery(api.communities.mine, {}));
  const p = me?.profile;
  const home = circles?.find((c) => c.kind === "zip");
  const custom = circles?.filter((c) => c.kind === "custom") ?? [];
  const { signOut } = useAuthActions();
  const deleteAccount = useMutation(api.profiles.deleteAccount);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setDeleting(true);
            try {
              await deleteAccount({});
              await signOutOfProviders();
              await signOut().catch(() => {}); // the session is already gone on the server
            } catch (e) {
              setError(errorMessage(e));
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.me}>
          <Avatar name={p?.displayName ?? ""} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p?.displayName ?? ""}
            </Text>
            <Text style={styles.soft}>{home?.name.replace(" · ", " ") ?? p?.zip ?? ""}</Text>
          </View>
          <Link label="Edit" onPress={() => router.push("/profile")} />
        </View>

        <View style={{ gap: space.xs }}>
          <Text style={styles.h2}>Your circles</Text>
          <Text style={[styles.soft, { fontSize: 14, marginBottom: 6 }]}>
            Where you share things with neighbors.
          </Text>
          {home ? (
            <CircleRow
              badge={<CircleBadge kind="zip" emoji="" size={40} />}
              name={home.name}
              meta={`Everyone nearby · ${neighbors(home.memberCount)}`}
              onPress={() => router.push(`/circle/${home.id}`)}
            />
          ) : null}
          {custom.map((c) => (
            <CircleRow
              key={c.id}
              badge={<CircleBadge kind="custom" emoji={c.emoji} size={40} />}
              name={c.name}
              meta={neighbors(c.memberCount)}
              onPress={() => router.push(`/circle/${c.id}`)}
            />
          ))}
          <View style={styles.links}>
            <Link label="Start a circle" onPress={() => router.push("/circle/form")} />
            <Link label="Join with a code" onPress={() => router.push("/join")} />
          </View>
        </View>

        <View style={styles.settings}>
          <SettingsRow
            label="How Domi works"
            onPress={() => router.push({ pathname: "/welcome", params: { replay: "1" } })}
          />
          <SettingsRow label="Blocked people" onPress={() => router.push("/blocked")} />
          <SettingsRow label="Terms of Service" onPress={() => openLegal("terms")} />
          <SettingsRow label="Privacy Policy" onPress={() => openLegal("privacy")} />
          <SettingsRow label="Sign out" onPress={doSignOut} />
          <SettingsRow label={deleting ? "Deleting…" : "Delete account"} onPress={confirmDelete} last />
        </View>
        <ErrorNote message={error} />
        <Text style={styles.version}>Domi {Constants.expoConfig?.version ?? ""}</Text>
        {/* Required by the GeoNames CC BY 4.0 license (docs/vendors.md). */}
        <Text style={styles.version}>Zip code data from GeoNames (CC BY 4.0)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function CircleRow({ badge, name, meta, onPress }: { badge: ReactNode; name: string; meta: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.circleRow, pressed && { opacity: 0.6 }]}>
      {badge}
      <View style={{ flex: 1 }}>
        <Text style={styles.circleName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.soft, { fontSize: 14 }]}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function SettingsRow({ label, onPress, last = false }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.settingsRow, !last && styles.rule, pressed && { opacity: 0.6 }]}
    >
      <Text style={type.body}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.xl },
  me: { flexDirection: "row", alignItems: "center", gap: 16 },
  name: { fontFamily: font.curator, fontSize: 28, lineHeight: 34, color: color.ink },
  soft: { fontFamily: font.ui, fontSize: 15, color: color.inkSoft },
  h2: { fontFamily: font.uiBold, fontSize: 17, color: color.ink },
  circleRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60 },
  circleName: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  links: { flexDirection: "row", gap: 24, marginTop: space.xs },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  settings: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  settingsRow: { minHeight: 52, justifyContent: "center" },
  version: { fontFamily: font.ui, fontSize: 13, color: color.inkFaint, textAlign: "center" },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
});
