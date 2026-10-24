import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import type { StuffRow } from "../../convex/mystuff";
import { YouButton } from "../../src/ui/YouButton";
import { Segmented } from "../../src/ui/Segmented";
import { color, font, radius, space, type } from "../../src/ui/theme";

type Side = "giving" | "getting";

/**
 * My stuff: what you're giving and what you're getting, one calm row each.
 * A row that needs you has a Bay status line and a small dot; nothing else
 * competes for attention. The avatar opens You (profile, circles, settings).
 */
export default function MyStuff() {
  const giving = useQuery(convexQuery(api.mystuff.giving, {}));
  const getting = useQuery(convexQuery(api.mystuff.getting, {}));
  const needs = useQuery(convexQuery(api.mystuff.needsYou, {}));
  const [side, setSide] = useState<Side | null>(null);

  // Open on the side that needs you (Giving when both or neither do).
  useEffect(() => {
    if (side === null && needs.data) setSide(needs.data.giving === 0 && needs.data.getting > 0 ? "getting" : "giving");
  }, [needs.data, side]);

  const current = side ?? "giving";
  const rows = (current === "giving" ? giving.data : getting.data) ?? [];
  const loaded = current === "giving" ? giving.isSuccess : getting.isSuccess;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.head}>
        <Text style={type.display}>My stuff</Text>
        <YouButton />
      </View>

      <View style={styles.tabs}>
        <Segmented<Side>
          options={[
            { value: "giving", label: "Giving", dot: (needs.data?.giving ?? 0) > 0 },
            { value: "getting", label: "Getting", dot: (needs.data?.getting ?? 0) > 0 },
          ]}
          value={current}
          onChange={setSide}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) => <StuffRowView row={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loaded ? <Empty side={current} /> : null}
      />
    </SafeAreaView>
  );
}

function StuffRowView({ row }: { row: StuffRow }) {
  const wish = row.kind === "wish";
  // Item rows open the listing; threads and wishes open once M4 wires them.
  const itemId = row.kind === "item" ? row.itemId : null;
  return (
    <Pressable
      disabled={!itemId}
      onPress={() => itemId && router.push({ pathname: "/item/[id]", params: { id: itemId } })}
      accessibilityRole={itemId ? "button" : undefined}
      style={({ pressed }) => [styles.row, row.ended && { opacity: 0.6 }, pressed && { opacity: 0.7 }]}
    >
      {row.photoUrl ? (
        <Image source={{ uri: row.photoUrl }} style={[styles.thumb, wish && styles.round]} />
      ) : (
        <View style={[styles.thumb, wish && styles.round]} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>
          {row.title}
          {row.subtitle ? <Text style={styles.subtitle}> ({row.subtitle})</Text> : null}
        </Text>
        <View style={styles.statusLine}>
          {row.needsYou ? <View style={styles.dot} /> : null}
          <Text style={[styles.status, row.needsYou && styles.statusNeeds]} numberOfLines={2}>
            {row.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function Empty({ side }: { side: Side }) {
  return (
    <View style={styles.empty}>
      <Text style={type.caption}>
        {side === "giving"
          ? "Things you give away will show up here."
          : "Things you ask for, and wishes you post, will show up here."}
      </Text>
      <Pressable onPress={() => router.navigate(side === "giving" ? "/post" : "/")} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.link}>{side === "giving" ? "Give something" : "Browse"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  tabs: { marginTop: space.lg, marginBottom: space.xs },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.bay },
  list: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: space.md },
  thumb: { width: 60, height: 60, borderRadius: radius.control, backgroundColor: color.fog },
  round: { borderRadius: 30 },
  rowText: { flex: 1, gap: 3 },
  title: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  subtitle: { fontFamily: font.ui, color: color.inkSoft },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { flexShrink: 1, fontFamily: font.ui, fontSize: 14, lineHeight: 19, color: color.inkSoft },
  statusNeeds: { fontFamily: font.uiSemi, color: color.bay },
  empty: { paddingTop: space.xl, gap: space.md, alignItems: "flex-start" },
  link: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
});
