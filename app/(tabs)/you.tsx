import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CircleBadge } from "../../src/features/circles/CircleBadge";
import { PrimaryButton, TextButton } from "../../src/ui/Form";
import { Group, Row, Section } from "../../src/ui/List";
import { color, font, radius, space, type } from "../../src/ui/theme";

const members = (n: number) => `${n} ${n === 1 ? "member" : "members"}`;

/**
 * You: who you are, then your circles. My listings and my requests become
 * sections here in M3/M4.
 */
export default function You() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const { data: circles } = useQuery(convexQuery(api.communities.mine, {}));
  const p = me?.profile;
  const home = circles?.find((c) => c.kind === "zip");
  const custom = circles?.filter((c) => c.kind === "custom") ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={type.display}>You</Text>

        <Group>
          <Row
            leading={
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p?.displayName.charAt(0).toUpperCase() ?? ""}</Text>
              </View>
            }
            title={p?.displayName ?? ""}
            subtitle="Profile, zip code, and account"
            onPress={() => router.push("/profile")}
          />
        </Group>

        <Section
          title="Circles"
          action={custom.length ? { label: "New", onPress: () => router.push("/circle/form") } : undefined}
        >
          <Group>
            {home ? (
              <Row
                leading={<CircleBadge kind="zip" emoji="" size={40} onFog />}
                title={home.name}
                subtitle={`Home circle · ${members(home.memberCount)}`}
                onPress={() => router.push(`/circle/${home.id}`)}
              />
            ) : null}
            {custom.map((c) => (
              <Row
                key={c.id}
                leading={<CircleBadge kind="custom" emoji={c.emoji} size={40} onFog />}
                title={c.name}
                subtitle={`${c.role === "owner" ? "Yours" : "Invite-only"} · ${members(c.memberCount)}${c.muted ? " · Muted" : ""}`}
                onPress={() => router.push(`/circle/${c.id}`)}
              />
            ))}
          </Group>

          {custom.length === 0 ? (
            <View style={styles.empty}>
              <Text style={type.objectLabel}>Start a circle for the people you trust</Text>
              <Text style={type.caption}>
                Your street, your building, a parents' group. Invite-only, and you decide who's in.
              </Text>
              <PrimaryButton title="Start a circle" onPress={() => router.push("/circle/form")} />
            </View>
          ) : null}

          <View style={styles.join}>
            <Ionicons name="enter-outline" size={18} color={color.bay} />
            <TextButton title="Join with an invite code" onPress={() => router.push("/join")} />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 17, color: color.bay },
  empty: { gap: space.sm, padding: space.lg, borderRadius: radius.thing, backgroundColor: color.blush },
  join: { flexDirection: "row", alignItems: "center", gap: space.xs, alignSelf: "flex-start" },
});
