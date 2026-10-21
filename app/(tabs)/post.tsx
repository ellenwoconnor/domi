import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShutterRow, Viewfinder } from "../../src/features/give/Viewfinder";
import { useWishes } from "../../src/features/wishlist/store";
import { GiveButton } from "../../src/ui/GiveButton";
import { color, radius, space, type } from "../../src/ui/theme";

/** Mock of the camera-first posting flow (the real camera arrives in M3). */
export default function Give() {
  const wanted = useWishes().filter((w) => !w.mine && w.status === "open");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.pad}>
        <Text style={type.display}>What's moving on?</Text>
        <Text style={[type.body, styles.sub]}>
          Start with a photo. Good light, the whole thing, a little room around it.
        </Text>
      </View>

      <Viewfinder style={styles.viewfinder} />
      <ShutterRow />

      {wanted.length > 0 && (
        <View style={styles.strip}>
          <Text style={[type.label, styles.pad]}>Your circles are looking for</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {wanted.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => router.push({ pathname: "/fulfill/[wishId]", params: { wishId: w.id } })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <Text style={type.objectLabel} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={type.meta} numberOfLines={1}>
                  {w.who}, {w.area}
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <GiveButton small />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white, paddingTop: space.lg },
  pad: { paddingHorizontal: space.lg },
  sub: { color: color.inkSoft, marginTop: space.xs, marginBottom: space.lg },
  viewfinder: { marginHorizontal: space.lg },
  strip: { gap: space.sm, paddingBottom: space.md },
  cards: { gap: space.sm, paddingHorizontal: space.lg },
  card: {
    width: 220,
    gap: 2,
    padding: space.md,
    borderRadius: radius.thing,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "flex-start",
  },
});
