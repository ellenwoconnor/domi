import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { postedLabel } from "../src/features/items/format";
import { ThankYouPoppy } from "../src/features/thanks/ThankYouPoppy";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, radius, space, type } from "../src/ui/theme";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * You › Thank-yous: the domi flowers people sent you for things you gave, with
 * their notes, newest first. Private, and never counted (docs/spec.md, "Domi flower").
 */
export default function Thanks() {
  const { data: thanks } = useQuery(convexQuery(api.thanks.received, {}));

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ gap: space.sm }}>
          <Text style={type.display}>Thank-yous</Text>
          <Text style={[type.body, { color: color.inkSoft }]}>
            Domi flowers from people you've given things to. Only you see these.
          </Text>
        </View>
        {thanks && thanks.length === 0 ? (
          <Text style={type.caption}>When someone thanks you with a domi flower, it'll be kept here.</Text>
        ) : (
          <View style={{ gap: space.md }}>
            {(thanks ?? []).map((t) => (
              <Pressable
                key={t.conversationId}
                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: t.conversationId } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
              >
                <ThankYouPoppy height={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={type.label}>
                    From {t.from}
                    {t.thing ? ` · for the ${lowerFirst(t.thing)}` : ""}
                  </Text>
                  {t.note ? <Text style={type.caption}>“{t.note}”</Text> : null}
                  <Text style={type.meta}>{postedLabel(t.at)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.blush,
    borderRadius: radius.sheet,
    padding: space.md,
  },
});
