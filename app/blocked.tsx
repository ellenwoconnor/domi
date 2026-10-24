import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { errorMessage } from "../src/lib/errors";
import { Avatar } from "../src/ui/Avatar";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, font, radius, space, type } from "../src/ui/theme";

/** You › Blocked people, with Unblock. */
export default function Blocked() {
  const { data: people } = useQuery(convexQuery(api.safety.blocked, {}));
  const unblock = useMutation(api.safety.unblock);
  const [busy, setBusy] = useState<Id<"users"> | null>(null);

  const doUnblock = async (userId: Id<"users">) => {
    setBusy(userId);
    try {
      await unblock({ userId });
    } catch (e) {
      Alert.alert("Couldn't unblock", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ gap: space.sm }}>
          <Text style={type.display}>Blocked people</Text>
          <Text style={[type.body, { color: color.inkSoft }]}>
            You and they can't see each other's listings or wishes, or message. They aren't told.
          </Text>
        </View>
        {people && people.length === 0 ? (
          <Text style={type.caption}>You haven't blocked anyone.</Text>
        ) : (
          <View>
            {(people ?? []).map((p, i) => (
              <View key={p.userId} style={[styles.row, i < (people?.length ?? 0) - 1 && styles.line]}>
                <Avatar name={p.displayName} size={42} />
                <Text style={styles.name}>{p.displayName}</Text>
                <Pressable
                  onPress={() => doUnblock(p.userId)}
                  disabled={busy === p.userId}
                  accessibilityRole="button"
                  style={[styles.unblock, busy === p.userId && { opacity: 0.5 }]}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {people && people.length > 0 ? (
          <Text style={type.meta}>Unblocking doesn't bring back cancelled pickups. Past chats become readable again.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  name: { flex: 1, fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  unblock: {
    height: 40,
    paddingHorizontal: space.lg - 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: "center",
  },
  unblockText: { fontFamily: font.uiSemi, fontSize: 15, color: color.ink },
});
