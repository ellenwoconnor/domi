import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleChips } from "../../src/features/items/CircleChips";
import { ItemCard } from "../../src/features/items/ItemCard";
import { circleById, circles, items } from "../../src/features/items/mockData";
import { color, radius, space, type } from "../../src/ui/theme";

export default function Browse() {
  const [query, setQuery] = useState("");
  const [circleId, setCircleId] = useState<string | null>(null);
  const [wished, setWished] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (circleId === null || i.circleIds.includes(circleId)) &&
        (q === "" || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
    );
  }, [query, circleId]);

  const circle = circleId ? circleById(circleId) : undefined;
  const heading = circle ? `${circle.emoji} ${circle.name}` : "Free nearby";

  const header = (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{heading}</Text>
        <Text style={type.meta}>
          {circle?.kind === "zip"
            ? "Everyone in your zip code"
            : circle
              ? "Invite-only circle"
              : `Across your ${circles.length} circles`}
        </Text>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setWished(false);
          }}
          placeholder="Search free stuff"
          placeholderTextColor={color.inkFaint}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>
      <CircleChips circles={circles} selected={circleId} onSelect={setCircleId} />
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        // pad odd counts with an empty cell so the last card stays half-width
        data={results.length % 2 ? [...results, null] : results}
        keyExtractor={(i, idx) => i?.id ?? `spacer-${idx}`}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <View style={styles.cell}>{item ? <ItemCard item={item} /> : null}</View>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {query ? `No one is giving away “${query.trim()}” right now` : "Nothing posted here yet"}
            </Text>
            <Text style={[type.body, { color: color.inkSoft }]}>
              {query
                ? "Add it to your wishlist and neighbors will know you're looking."
                : "Be the first: tap Give to post something."}
            </Text>
            {query ? (
              <Pressable
                onPress={() => setWished(true)}
                disabled={wished}
                style={[styles.wishButton, wished && styles.wishDone]}
              >
                <Ionicons name={wished ? "checkmark" : "heart-outline"} size={18} color={wished ? color.circle : color.paper} />
                <Text style={[styles.wishText, wished && { color: color.circle }]}>
                  {wished ? "On your wishlist" : "Add to wishlist"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  header: { gap: space.md, paddingTop: space.sm, paddingBottom: space.lg, marginHorizontal: -space.lg },
  titleBlock: { paddingHorizontal: space.lg, gap: 2 },
  title: { ...type.display, fontSize: 32, lineHeight: 38, color: color.ink },
  search: {
    marginHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 16, color: color.ink },
  columns: { gap: space.md },
  cell: { flex: 1, paddingBottom: space.xl },
  empty: { paddingTop: space.xl, gap: space.sm, alignItems: "flex-start" },
  emptyTitle: { ...type.heading, fontSize: 20, lineHeight: 26, color: color.ink },
  wishButton: {
    marginTop: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  wishDone: { backgroundColor: color.circleSoft },
  wishText: { color: color.paper, fontWeight: "600", fontSize: 15 },
});
