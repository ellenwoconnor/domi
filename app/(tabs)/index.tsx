import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleChips } from "../../src/features/items/CircleChips";
import { ItemCard } from "../../src/features/items/ItemCard";
import { circleById, circles, items, passedOnThisMonth, type Item } from "../../src/features/items/mockData";
import { AddWishSheet } from "../../src/features/wishlist/AddWishSheet";
import { useWishes, type Wish } from "../../src/features/wishlist/store";
import { MyWishRow, WishRow } from "../../src/features/wishlist/WishRow";
import { CircleMark, Logo } from "../../src/ui/Logo";
import { Segmented } from "../../src/ui/Segmented";
import { color, font, radius, space, type } from "../../src/ui/theme";

type Mode = "free" | "wishes";

export default function Browse() {
  const [mode, setMode] = useState<Mode>("free");
  const [query, setQuery] = useState("");
  const [circleId, setCircleId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const allWishes = useWishes();

  const q = query.trim().toLowerCase();
  const inCircle = (ids: string[]) => circleId === null || ids.includes(circleId);
  const matches = (...fields: (string | undefined)[]) =>
    q === "" || fields.some((f) => f?.toLowerCase().includes(q));

  const freeResults = useMemo(
    () => items.filter((i) => inCircle(i.circleIds) && matches(i.title, i.description)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, circleId],
  );
  const myWishes = allWishes.filter((w) => w.mine);
  const wishResults = allWishes.filter(
    (w) => !w.mine && w.status === "open" && inCircle(w.circleIds) && matches(w.title, w.note),
  );

  const circle = circleId ? circleById(circleId) : undefined;
  const heading = circle ? (circle.emoji ? `${circle.emoji} ${circle.name}` : circle.name) : "Close to home";
  const sub =
    circle?.kind === "zip"
      ? `Your home circle, ${circle.zip}`
      : circle
        ? "An invite-only circle"
        : mode === "free"
          ? `${freeResults.filter((i) => i.status === "available").length} things looking for a new home`
          : `${wishResults.length} neighbors are looking for something`;

  const openAdd = (title = "") => {
    setAddTitle(title);
    setAddOpen(true);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.pad}>
        <Logo size={24} />
      </View>
      <View style={[styles.pad, styles.titleBlock]}>
        <Text style={type.display}>{heading}</Text>
        <Text style={type.meta}>{sub}</Text>
      </View>
      <Segmented<Mode>
        options={[
          { value: "free", label: "Free" },
          { value: "wishes", label: "Wishes" },
        ]}
        value={mode}
        onChange={setMode}
      />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={mode === "free" ? "Search what's free" : "Search what neighbors want"}
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
      {mode === "free" ? (
        <FlatList<Item | null>
          key="free"
          // pad odd counts with an empty cell so the last object keeps its column
          data={freeResults.length % 2 ? [...freeResults, null] : freeResults}
          keyExtractor={(i, idx) => i?.id ?? `spacer-${idx}`}
          numColumns={2}
          ListHeaderComponent={header}
          ListFooterComponent={
            freeResults.length > 0 ? (
              <View style={styles.footer}>
                <CircleMark size={14} />
                <Text style={type.meta}>Your circles passed on {passedOnThisMonth} things this month.</Text>
              </View>
            ) : null
          }
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
                  ? "Add it to your wishes and your circles will know you're looking."
                  : "Be the first to give something. Tap Give to post a photo."}
              </Text>
              {query ? (
                <Pressable onPress={() => openAdd(query.trim())} style={styles.pillButton}>
                  <Ionicons name="add" size={18} color={color.white} />
                  <Text style={styles.pillText}>Add to my wishes</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      ) : (
        <FlatList<Wish>
          key="wishes"
          data={wishResults}
          keyExtractor={(w) => w.id}
          ListHeaderComponent={
            <>
              {header}
              <View style={styles.mineHeader}>
                <Text style={type.label}>My wishes</Text>
                <Pressable onPress={() => openAdd()} hitSlop={10} style={styles.addLink}>
                  <Ionicons name="add" size={18} color={color.bay} />
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              </View>
              <View style={{ gap: space.sm }}>
                {myWishes.length ? (
                  myWishes.map((w) => <MyWishRow key={w.id} wish={w} />)
                ) : (
                  <Text style={type.meta}>Nothing yet. Add what you're hoping to find.</Text>
                )}
              </View>
              <Text style={[type.label, styles.othersLabel]}>Your circles are looking for</Text>
            </>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <WishRow wish={item} />}
          ListEmptyComponent={
            <View style={[styles.empty, { marginTop: space.md }]}>
              <Text style={type.title}>
                {query ? `No one is wishing for “${query.trim()}”.` : "No open wishes here right now."}
              </Text>
              <Text style={[type.body, { color: color.inkSoft }]}>
                When neighbors add wishes, they show up here.
              </Text>
            </View>
          }
        />
      )}

      <AddWishSheet
        visible={addOpen}
        initialTitle={addTitle}
        onClose={(added) => {
          setAddOpen(false);
          if (added) {
            setQuery("");
            setMode("wishes");
          }
        }}
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
  pillButton: {
    marginTop: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.bay,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 44,
  },
  pillText: { fontFamily: font.uiSemi, color: color.white, fontSize: 15 },
  mineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  addLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  addText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  othersLabel: { marginTop: space.xl },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
});
