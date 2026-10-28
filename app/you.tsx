import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { useAccountActions } from "../src/features/auth/useAccountActions";
import { openLegal } from "../src/features/legal";
import { pushPermission, type PushPermission } from "../src/features/push/push";
import { useAskForPush } from "../src/features/push/useAskForPush";
import { Avatar } from "../src/ui/Avatar";
import { ErrorNote } from "../src/ui/Form";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, font, space, type } from "../src/ui/theme";

/** You: who you are and settings (incl. sign out and delete). Opened from your initial on every tab. Circles have their own tab. */
export default function You() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const { data: circles } = useQuery(convexQuery(api.communities.mine, {}));
  const p = me?.profile;
  const home = circles?.find((c) => c.kind === "zip");
  const { doSignOut, confirmDelete, deleting, error } = useAccountActions();
  const askForPush = useAskForPush();
  const [push, setPush] = useState<PushPermission | null>(null);
  useFocusEffect(
    useCallback(() => {
      pushPermission().then(setPush).catch(() => setPush(null));
    }, []),
  );

  function notifications() {
    // Granted or blocked: only the Settings app can change it now.
    if (push === "ask") askForPush("settings").catch(() => {});
    else Linking.openSettings().catch(() => {});
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
            <Text style={styles.soft}>
              {home?.name.replace(" · ", " ") ?? p?.zip ?? ""}
              {circles ? ` · in ${circles.length} ${circles.length === 1 ? "circle" : "circles"}` : ""}
            </Text>
          </View>
          <Link label="Edit" onPress={() => router.push("/profile")} />
        </View>

        <View style={styles.settings}>
          <SettingsRow
            label="How Domi works"
            onPress={() => router.push({ pathname: "/welcome", params: { replay: "1" } })}
          />
          <SettingsRow
            label="Notifications"
            value={push === "granted" ? "On" : push === null ? undefined : "Off"}
            onPress={notifications}
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

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  last = false,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityValue={value ? { text: value } : undefined}
      style={({ pressed }) => [styles.settingsRow, !last && styles.rule, pressed && { opacity: 0.6 }]}
    >
      <Text style={type.body}>{label}</Text>
      {value ? <Text style={styles.soft}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.xl },
  me: { flexDirection: "row", alignItems: "center", gap: 16 },
  name: { fontFamily: font.curator, fontSize: 28, lineHeight: 34, color: color.ink },
  soft: { fontFamily: font.ui, fontSize: 15, color: color.inkSoft },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  settings: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  settingsRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  version: { fontFamily: font.ui, fontSize: 13, color: color.inkFaint, textAlign: "center" },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
});
