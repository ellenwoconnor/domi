import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { agoLabel, events } from "../../src/features/activity/mockEvents";
import { color, space, type } from "../../src/ui/theme";

export default function Activity() {
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={<Text style={styles.title}>Activity</Text>}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item: e }) => (
          <Pressable
            onPress={() => e.itemId && router.push({ pathname: "/item/[id]", params: { id: e.itemId } })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.surface }]}
          >
            <View style={[styles.icon, e.unread && styles.iconUnread]}>
              <Text style={{ fontSize: 22 }}>{e.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.rowTitle, e.unread && { fontWeight: "700" }]}>{e.title}</Text>
              {e.body ? <Text style={type.meta}>{e.body}</Text> : null}
            </View>
            <View style={styles.right}>
              <Text style={[type.meta, { color: color.inkFaint }]}>{agoLabel(e.hoursAgo)}</Text>
              {e.unread ? <View style={styles.dot} /> : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  list: { paddingBottom: space.xxl },
  title: {
    ...type.display,
    fontSize: 32,
    lineHeight: 38,
    color: color.ink,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  row: { flexDirection: "row", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: "flex-start" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnread: { backgroundColor: color.tag },
  rowTitle: { fontSize: 15, lineHeight: 20, color: color.ink, fontWeight: "500" },
  right: { alignItems: "flex-end", gap: 6, paddingTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.ink },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.line, marginLeft: space.lg + 44 + space.md },
});
