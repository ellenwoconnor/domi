import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { PrimaryButton, TextButton } from "../../ui/Form";
import { color, space, type } from "../../ui/theme";
import { CircleBadge } from "./CircleBadge";

/** My circles, with create and join. `header` lets the host screen add a title or profile row. */
export function CirclesScreen({ header }: { header?: ReactNode }) {
  const { data: circles } = useQuery(convexQuery(api.communities.mine, {}));

  return (
    <FlatList
      data={circles ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: space.lg, marginBottom: space.md }}>
          {header}
          <Text style={type.caption}>
            Your zip circle is everyone nearby. Custom circles are invite-only: a street, a parents' group, a
            building.
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item: c }) => (
        <Pressable
          onPress={() => router.push(`/circle/${c.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <CircleBadge kind={c.kind} emoji={c.emoji} />
          <View style={{ flex: 1 }}>
            <Text style={type.objectLabel}>{c.name}</Text>
            <Text style={type.meta}>
              {c.kind === "zip" ? "Your home circle" : c.role === "owner" ? "You started it" : "Invite-only"} ·{" "}
              {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
              {c.muted ? " · Muted" : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
        </Pressable>
      )}
      ListFooterComponent={
        <View style={styles.actions}>
          <PrimaryButton title="Start a circle" onPress={() => router.push("/circle/form")} />
          <TextButton title="Join with an invite code" onPress={() => router.push("/join")} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: space.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.line, marginLeft: 44 + space.md },
  actions: { gap: space.sm, marginTop: space.xl },
});
