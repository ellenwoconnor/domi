import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { agoLabel, events } from "../../src/features/activity/mockEvents";
import { signOutOfProviders } from "../../src/features/auth/nativeSignIn";
import { passedOnThisMonth } from "../../src/features/items/mockData";
import { CircleMark } from "../../src/ui/Logo";
import { color, font, radius, space, type } from "../../src/ui/theme";

export default function Activity() {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={type.display}>Activity</Text>
            <View style={styles.impact}>
              <Text style={[type.caption, { color: color.ink }]}>
                {passedOnThisMonth} things found new homes in your circles this month.
              </Text>
            </View>
          </View>
        }
        // Temporary account row for the sign-in spike; moves to a profile screen in M1.
        ListFooterComponent={
          <View style={styles.account}>
            <Text style={type.meta}>Signed in{me?.email ? ` as ${me.email}` : me?.name ? ` as ${me.name}` : ""}</Text>
            <Pressable
              onPress={async () => {
                await signOutOfProviders();
                await signOut();
              }}
              hitSlop={10}
            >
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item: e }) => (
          <Pressable
            onPress={() => e.itemId && router.push({ pathname: "/item/[id]", params: { id: e.itemId } })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fog }]}
          >
            <View>
              <View style={styles.avatar}>
                {e.who ? <Text style={styles.avatarText}>{e.who.charAt(0)}</Text> : <CircleMark size={18} />}
              </View>
              {e.giving ? <View style={styles.givingDot} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.rowTitle, e.unread && { fontFamily: font.uiBold }]}>{e.title}</Text>
              {e.body ? <Text style={type.meta}>{e.body}</Text> : null}
            </View>
            <View style={styles.right}>
              <Text style={[type.meta, { color: color.inkFaint }]}>{agoLabel(e.hoursAgo)}</Text>
              {e.unread ? <View style={styles.unread} /> : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  list: { paddingBottom: space.xxl },
  header: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, gap: space.lg },
  impact: { backgroundColor: color.blush, borderRadius: radius.thing, paddingHorizontal: space.lg, paddingVertical: space.md },
  row: { flexDirection: "row", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: "flex-start" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 16, color: color.bay },
  givingDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: color.poppy,
    borderWidth: 2,
    borderColor: color.white,
  },
  rowTitle: { fontFamily: font.uiMedium, fontSize: 15.5, lineHeight: 21, color: color.ink },
  right: { alignItems: "flex-end", gap: 6, paddingTop: 2 },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.bay },
  account: {
    marginTop: space.xl,
    marginHorizontal: space.lg,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  signOut: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.line, marginLeft: space.lg + 42 + space.md },
});
