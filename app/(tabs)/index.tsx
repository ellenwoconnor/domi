import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleChips } from "../../src/features/items/CircleChips";
import { ItemCard } from "../../src/features/items/ItemCard";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { circleLabel, type ItemView } from "../../src/features/items/format";
import { useDebounced } from "../../src/lib/useDebounced";
import { AddWishSheet } from "../../src/features/wishlist/AddWishSheet";
import { masonry, WishCard, type WishView } from "../../src/features/wishlist/WishCard";
import { WishSafetySheet, type WishSafetyTarget } from "../../src/features/wishlist/WishSafetySheet";
import { Segmented } from "../../src/ui/Segmented";
import { TabHeader } from "../../src/ui/TabHeader";
import { color, font, radius, space, type } from "../../src/ui/theme";

type Mode = "free" | "wishes";

export default function Browse() {
  const [mode, setMode] = useState<Mode>("free");
  const [query, setQuery] = useState("");
  const [circleId, setCircleId] = useState<Id<"communities"> | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [safety, setSafety] = useState<WishSafetyTarget | null>(null);

  const me = useQuery(convexQuery(api.profiles.me, {})).data?.profile;
  const circles = useQuery(convexQuery(api.communities.mine, {})).data ?? [];

  // Free: the circle feed, or server-side keyword search once typing settles.
  const searchText = useDebounced(query.trim(), 250);
  const circleArg = circleId ? { communityId: circleId } : {};
  // The feed stays loaded while searching so the count under the title doesn't jump.
  const browse = useQuery(convexQuery(api.items.browse, circleArg));
  const found = useQuery(convexQuery(api.items.search, searchText ? { text: searchText, ...circleArg } : "skip"));
  const free = searchText ? found : browse;
  const freeResults = free.data ?? [];
  const freeLoaded = free.isSuccess;

  // Wishes: everything in your circles (yours included), filtered on the device
  // as you type. One circle's wishes are few enough to search locally.
  const wishesQ = useQuery(convexQuery(api.wishlist.browse, circleArg));
  const q = query.trim().toLowerCase();
  const wishResults = (wishesQ.data ?? []).filter(
    (w) => q === "" || w.title.toLowerCase().includes(q) || (w.description ?? "").toLowerCase().includes(q),
  );
  const wanted = (wishesQ.data ?? []).filter((w) => !w.isMine && !w.pending).length;
  // Other people's things you could still ask for (not yours, not on hold).
  const offered = (browse.data ?? []).filter((i) => !i.isOwner && i.status === "available").length;

  const circle = circleId ? circles.find((c) => c.id === circleId) : undefined;
  const heading = circle ? circleLabel(circle) : "Close to home";
  const sub =
    circle?.kind === "zip"
      ? "Your home circle"
      : circle
        ? "An invite-only circle"
        : mode === "free"
          ? browse.isSuccess
            ? offered === 0
              ? "Nothing up for grabs right now"
              : offered === 1
                ? "1 thing looking for a new home"
                : `${offered} things looking for a new home`
            : " "
          : wishesQ.isSuccess
            ? wanted === 1
              ? "1 neighbor is looking for something"
              : `${wanted} neighbors are looking for something`
            : " ";

  const openAdd = (title = "") => {
    setAddTitle(title);
    setAddOpen(true);
  };

  const header = (
    <View style={styles.header}>
      <TabHeader title={heading} subtitle={sub} />
      <Segmented<Mode>
        options={[
          { value: "free", label: "Offers" },
          { value: "wishes", label: "Wishes" },
        ]}
        value={mode}
        onChange={setMode}
        trailing={
          <Pressable
            onPress={() => (mode === "free" ? router.navigate("/post") : openAdd())}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={18} color={color.white} />
            <Text style={styles.addButtonText}>{mode === "free" ? "Give something" : "Add a wish"}</Text>
          </Pressable>
        }
      />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={mode === "free" ? "Search offers" : "Search what neighbors want"}
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
        <FlatList<ItemView | null>
          key="free"
          // pad odd counts with an empty cell so the last object keeps its column
          data={freeResults.length % 2 ? [...freeResults, null] : freeResults}
          keyExtractor={(i, idx) => i?.id ?? `spacer-${idx}`}
          numColumns={2}
          ListHeaderComponent={header}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <View style={styles.cell}>{item ? <ItemCard item={item} me={me} /> : null}</View>}
          ListEmptyComponent={
            !freeLoaded ? null : (
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
            )
          }
        />
      ) : (
        <ScrollView
          key="wishes"
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {wishResults.length > 0 ? (
            <WishBoard wishes={wishResults} onLongPress={(w) => setSafety({ wishId: w.id, userId: w.user.userId, displayName: w.user.displayName })} />
          ) : wishesQ.isSuccess ? (
            <View style={styles.empty}>
              <Text style={type.title}>
                {query ? `No one is wishing for “${query.trim()}”.` : "No wishes here yet."}
              </Text>
              <Text style={[type.body, { color: color.inkSoft }]}>
                {query ? "Add it as your own wish and your circles will know you're looking." : "Looking for something? Add a wish and your circles will see it."}
              </Text>
              <Pressable onPress={() => openAdd(query.trim())} style={styles.pillButton}>
                <Ionicons name="add" size={18} color={color.white} />
                <Text style={styles.pillText}>Add a wish</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
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
      <WishSafetySheet target={safety} onClose={() => setSafety(null)} />
    </SafeAreaView>
  );
}

/** The wishes board: two columns of cards that grow with their words. */
function WishBoard({ wishes, onLongPress }: { wishes: WishView[]; onLongPress: (w: WishView) => void }) {
  const [left, right] = masonry(wishes);
  return (
    <View style={styles.board}>
      {[left, right].map((col, i) => (
        <View key={i} style={styles.boardCol}>
          {col.map((w) => (
            <WishCard key={w.id} wish={w} onLongPress={onLongPress} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  header: { gap: space.lg, paddingBottom: space.xl, marginHorizontal: -space.lg },
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: color.bay,
  },
  addButtonText: { fontFamily: font.uiSemi, fontSize: 14, color: color.white },
  board: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  boardCol: { flex: 1, minWidth: 0, gap: space.md },
});
