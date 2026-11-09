import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { useAccountActions } from "../src/features/auth/useAccountActions";
import { lowerFirst, postedLabel } from "../src/features/items/format";
import { openLegal } from "../src/features/legal";
import { pushPermission, type PushPermission } from "../src/features/push/push";
import { useAskForPush } from "../src/features/push/useAskForPush";
import { Garden } from "../src/features/thanks/Garden";
import { Avatar } from "../src/ui/Avatar";
import { ErrorNote } from "../src/ui/Form";
import { Sheet, SheetAction } from "../src/ui/Sheet";
import { color, font, radius, space, type } from "../src/ui/theme";

/**
 * You: your garden across the top (a domi flower for each thank-you, seedlings
 * before the first), who you are, the latest thank-you, then a few settings.
 * Opened from your initial on every tab. (Layout H1, 2026-11-08 design review.)
 */
export default function You() {
  const insets = useSafeAreaInsets();
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const { data: circles } = useQuery(convexQuery(api.communities.mine, {}));
  const { data: thanks } = useQuery(convexQuery(api.thanks.received, {}));
  const p = me?.profile;
  const home = circles?.find((c) => c.kind === "zip");
  const { doSignOut, confirmDelete, deleteSheet, deleting, error } = useAccountActions();
  const askForPush = useAskForPush();
  const [push, setPush] = useState<PushPermission | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
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

  const latest = thanks?.[0];
  const openThanks = () => router.push("/thanks");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
        <Pressable
          onPress={openThanks}
          disabled={!thanks?.length}
          accessibilityRole={thanks?.length ? "button" : "image"}
          accessibilityHint={thanks?.length ? "Opens your thank-yous" : undefined}
        >
          <Garden flowers={thanks?.length ?? 0} />
        </Pressable>

        <View style={styles.avatar}>
          <Avatar name={p?.displayName ?? ""} size={72} />
        </View>
        <View style={styles.me}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p?.displayName ?? ""}
            </Text>
            <Text style={styles.soft}>
              {home?.name.replace(" · ", " ") ?? p?.zip ?? ""}
              {circles ? ` · in ${circles.length} ${circles.length === 1 ? "domi" : "domis"}` : ""}
            </Text>
          </View>
          <Link label="Edit" onPress={() => router.push("/profile")} />
        </View>

        {latest ? (
          <Pressable onPress={openThanks} accessibilityRole="button" style={({ pressed }) => [styles.note, pressed && { opacity: 0.7 }]}>
            <Text style={styles.quote}>
              {latest.note ? `“${latest.note}”` : latest.thing ? `A thank-you for the ${lowerFirst(latest.thing)}.` : "A thank-you."}
            </Text>
            <Text style={type.meta}>
              {latest.from}
              {latest.thing ? `, for the ${lowerFirst(latest.thing)}` : ""} · {postedLabel(latest.at)}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.settings}>
          <SettingsRow
            label="Notifications"
            value={push === "granted" ? "On" : push === null ? undefined : "Off"}
            onPress={notifications}
          />
          <SettingsRow label="Blocked people" onPress={() => router.push("/blocked")} />
          <SettingsRow label="Terms & Privacy" onPress={() => setLegalOpen(true)} last />
        </View>
        <ErrorNote message={error} />
        <View style={styles.footer}>
          <Pressable onPress={doSignOut} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.quiet}>Sign out</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.quiet}>{deleting ? "Deleting…" : "Delete account"}</Text>
          </Pressable>
          <Text style={[styles.quiet, { marginLeft: "auto", color: color.inkFaint }]}>
            Domi {Constants.expoConfig?.version ?? ""}
          </Text>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={[styles.back, { top: insets.top + space.sm }]}
      >
        <Ionicons name="chevron-back" size={22} color={color.ink} />
      </Pressable>

      <Sheet visible={legalOpen} onClose={() => setLegalOpen(false)}>
        <SheetAction
          icon={<Ionicons name="document-text-outline" size={22} color={color.bay} />}
          label="Terms of Service"
          onPress={() => {
            setLegalOpen(false);
            openLegal("terms");
          }}
        />
        <SheetAction
          icon={<Ionicons name="lock-closed-outline" size={22} color={color.bay} />}
          label="Privacy Policy"
          onPress={() => {
            setLegalOpen(false);
            openLegal("privacy");
          }}
          last
        />
      </Sheet>
      {deleteSheet}
    </View>
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
  back: {
    position: "absolute",
    left: space.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  // Your initial sits on the hill.
  avatar: {
    marginTop: -48,
    marginLeft: space.lg,
    alignSelf: "flex-start",
    borderRadius: 40,
    borderWidth: 4,
    borderColor: color.white,
  },
  me: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingHorizontal: space.lg, paddingTop: space.sm },
  name: { fontFamily: font.curator, fontSize: 28, lineHeight: 34, color: color.ink },
  soft: { fontFamily: font.ui, fontSize: 15, color: color.inkSoft },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  note: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.thing,
    backgroundColor: color.fog,
    gap: 4,
  },
  quote: { fontFamily: font.curatorLight, fontSize: 18, lineHeight: 25, color: color.ink },
  settings: { marginHorizontal: space.lg, marginTop: space.lg },
  settingsRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  footer: { flexDirection: "row", alignItems: "center", gap: space.lg, marginHorizontal: space.lg, marginTop: space.md },
  quiet: { fontFamily: font.ui, fontSize: 14, color: color.inkSoft },
});
