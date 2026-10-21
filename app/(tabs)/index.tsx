import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleChips } from "../../src/features/items/CircleChips";
import { ItemCard } from "../../src/features/items/ItemCard";
import { circleById, circles, items, passedOnThisMonth, type Item } from "../../src/features/items/mockData";
import { CircleMark, Logo } from "../../src/ui/Logo";
import { color, font, radius, space, type } from "../../src/ui/theme";

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
  const available = results.filter((i) => i.status === "available").length;
  const heading = circle ? (circle.emoji ? `${circle.emoji} ${circle.name}` : circle.name) : "Close to home";
  const sub = circle?.kind === "zip"
    ? `Your home circle, ${circle.zip}`
    : circle
      ? "An invite-only circle"
      : `${available} things looking for a new home`;

  const header = (
    <View style={styles.header}>
      <View style={styles.pad}>
        <Logo size={24} />
      </View>
      <View style={[styles.pad, styles.titleBlock]}>
        <Text style={type.display}>{heading}</Text>
        <Text style={type.meta}>{sub}</Text>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setWished(false);
          }}
          placeholder="Search your circles"
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

  const footer =
    results.length > 0 ? (
      <View style={styles.footer}>
        <CircleMark size={14} />
        <Text style={type.meta}>Your circles passed on {passedOnThisMonth} things this month.</Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList<Item | null>
        // pad odd counts with an empty cell so the last object keeps its column
        data={results.length % 2 ? [...results, null] : results}
        keyExtractor={(i, idx) => i?.id ?? `spacer-${idx}`}
        numColumns={2}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <View style={styles.cell}>{item ? <ItemCard item={item} /> : null}</View>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.title}>
              {query ? `No “${query.trim()}” on the shelves yet.` : "This wall is bare for now."}
            </Text>
            <Text style={[type.body, { color: color.inkSoft }]}>
              {query
                ? "Add it to your wishlist and your circles will know you're looking."
                : "Be the first to give something. Tap Give to post a photo."}
            </Text>
            {query ? (
              <Pressable
                onPress={() => setWished(true)}
                disabled={wished}
                style={[styles.wishButton, wished && styles.wishDone]}
              >
                <Ionicons name={wished ? "checkmark" : "add"} size={18} color={wished ? color.bay : color.white} />
                <Text style={[styles.wishText, wished && { color: color.bay }]}>
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
  screen: { flex: 1, backgroundColor: color.white },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  header: { gap: space.lg, paddingTop: space.sm, paddingBottom: space.xl, marginHorizontal: -space.lg },
  pad: { paddingHorizontal: space.lg },
  titleBlock: { gap: 2, marginTop: space.sm },
  search: {
    marginHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    height: 46,
    marginBottom: -space.sm,
  },
  searchInput: { flex: 1, fontFamily: font.ui, fontSize: 16, color: color.ink },
  columns: { gap: space.lg },
  cell: { flex: 1, paddingBottom: space.xl },
  footer: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.sm },
  empty: {
    marginTop: space.sm,
    padding: space.lg,
    gap: space.sm,
    alignItems: "flex-start",
    backgroundColor: color.blush,
    borderRadius: radius.thing,
  },
  wishButton: {
    marginTop: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.bay,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 44,
  },
  wishDone: { backgroundColor: color.white },
  wishText: { fontFamily: font.uiSemi, color: color.white, fontSize: 15 },
});
