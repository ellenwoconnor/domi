import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CircleBadge } from "../../src/features/circles/CircleBadge";
import { Avatar } from "../../src/ui/Avatar";
import { TabHeader } from "../../src/ui/TabHeader";
import { color, font, radius, space, type } from "../../src/ui/theme";

const neighbors = (n: number) => `${n} ${n === 1 ? "neighbor" : "neighbors"}`;
// The server caps each count at 50.
const count = (n: number, one: string, many: string) => `${n >= 50 ? "50+" : n} ${n === 1 ? one : many}`;

/** Home card: "12 offers · 3 wishes this week". Rows: "4 new offers · 1 new wish". Null when nothing's new. */
function news(offers: number, wishes: number, style: "week" | "new") {
  const pre = style === "new" ? "new " : "";
  const parts = [
    offers ? count(offers, `${pre}offer`, `${pre}offers`) : null,
    wishes ? count(wishes, `${pre}wish`, `${pre}wishes`) : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(" · ") + (style === "week" ? " this week" : "");
}

// One tap fills in the Start a circle form; people change the name there.
const IDEAS = [
  { emoji: "🏢", name: "My building" },
  { emoji: "🧸", name: "Parents group" },
  { emoji: "🌱", name: "Garden club" },
  { emoji: "⛪", name: "Congregation" },
];

const startCircle = (preset?: { name: string; emoji: string }) =>
  router.push(preset ? { pathname: "/circle/form", params: preset } : "/circle/form");
const joinWithCode = () => router.push("/join");
const openCircle = (id: string) => router.push(`/circle/${id}`);

/**
 * Circles: your home circle, your invite-only circles and what's new in each
 * this week, plus Start a circle and Join with a code. With only the home
 * circle, a Blush panel invites you to start one.
 */
export default function Circles() {
  const { data } = useQuery(convexQuery(api.communities.overview, {}));
  const home = data?.find((c) => c.kind === "zip");
  const custom = data?.filter((c) => c.kind === "custom") ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TabHeader title="Your circles" subtitle="Where you share things with neighbors" />
        <View style={styles.content}>
          {home ? (
            <Pressable
              onPress={() => openCircle(home.id)}
              accessibilityRole="button"
              accessibilityLabel={`${home.name}, your home circle, ${neighbors(home.memberCount)}`}
              style={({ pressed }) => [styles.homeCard, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.row}>
                <CircleBadge kind="zip" emoji="" size={52} onFog />
                <View style={{ flex: 1 }}>
                  <Text style={styles.homeName} numberOfLines={1}>
                    {home.name}
                  </Text>
                  <Text style={styles.meta}>Your home circle · {neighbors(home.memberCount)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={color.inkSoft} />
              </View>
              {home.faces.length || news(home.newOffers, home.newWishes, "week") ? (
                <View style={styles.homeFoot}>
                  <View style={{ flexDirection: "row" }}>
                    {home.faces.map((name, i) => (
                      <View key={`${name}-${i}`} style={[styles.face, i > 0 && { marginLeft: -8 }]}>
                        <Avatar name={name} size={28} onFog />
                      </View>
                    ))}
                  </View>
                  {news(home.newOffers, home.newWishes, "week") ? (
                    <Text style={styles.news}>{news(home.newOffers, home.newWishes, "week")}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {data && custom.length === 0 ? (
            <View style={styles.startPanel}>
              <View style={styles.picture} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.pictureRing]} />
                <View style={[styles.pictureDisc, { left: 52, top: 0, width: 64, height: 64 }]}>
                  <Text style={{ fontSize: 28 }}>🏢</Text>
                </View>
                <View style={[styles.pictureDisc, { left: 104, top: 34, width: 54, height: 54 }]}>
                  <Text style={{ fontSize: 24 }}>🧸</Text>
                </View>
                <View style={styles.pictureDot} />
              </View>
              <Text style={styles.panelTitle}>Share with people you already know</Text>
              <Text style={styles.panelBody}>Start a new circle. Only people you invite can see what’s shared there.</Text>
              <View style={styles.ideas}>
                {IDEAS.map((idea) => (
                  <Pressable
                    key={idea.name}
                    onPress={() => startCircle(idea)}
                    accessibilityRole="button"
                    accessibilityLabel={`Start a circle: ${idea.name}`}
                    style={({ pressed }) => [styles.idea, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={{ fontSize: 14 }}>{idea.emoji}</Text>
                    <Text style={styles.ideaText}>{idea.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.buttons}>
                <PillButton label="Start a circle" onPress={() => startCircle()} solid />
                <PillButton label="I have a code" onPress={joinWithCode} onBlush />
              </View>
            </View>
          ) : null}

          {custom.length > 0 ? (
            <>
              <View>
                <Text style={styles.section}>Invite-only</Text>
                {custom.map((c, i) => {
                  const fresh = news(c.newOffers, c.newWishes, "new");
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => openCircle(c.id)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.circleRow,
                        i < custom.length - 1 && styles.rule,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <CircleBadge kind="custom" emoji={c.emoji} size={46} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.circleName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {neighbors(c.memberCount)} ·{" "}
                          {fresh ? <Text style={styles.newsInline}>{fresh}</Text> : "quiet this week"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.buttons}>
                <PillButton label="Start a circle" onPress={() => startCircle()} solid icon />
                <PillButton label="Join with a code" onPress={joinWithCode} />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PillButton({
  label,
  onPress,
  solid = false,
  onBlush = false,
  icon = false,
}: {
  label: string;
  onPress: () => void;
  solid?: boolean;
  onBlush?: boolean;
  icon?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pill,
        solid ? styles.pillSolid : onBlush ? styles.pillWhite : styles.pillOutline,
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? <Ionicons name="add" size={18} color={color.white} /> : null}
      <Text style={[styles.pillText, solid && { color: color.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  scroll: { paddingBottom: space.xxl },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  meta: { fontFamily: font.ui, fontSize: 14, color: color.inkSoft },

  homeCard: { backgroundColor: color.fog, borderRadius: radius.thing, padding: 16, gap: 14 },
  homeName: { fontFamily: font.uiSemi, fontSize: 17, color: color.ink },
  homeFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  face: { borderRadius: 16, borderWidth: 2, borderColor: color.fog },
  news: { fontFamily: font.uiSemi, fontSize: 13.5, color: color.bay, flexShrink: 1, textAlign: "right" },

  section: {
    fontFamily: font.uiBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginBottom: 4,
  },
  circleRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  circleName: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
  newsInline: { fontFamily: font.uiSemi, color: color.bay },

  startPanel: { backgroundColor: color.blush, borderRadius: radius.sheet, padding: 20, paddingTop: 24, gap: 14 },
  picture: { height: 92 },
  pictureRing: {
    position: "absolute",
    left: 0,
    top: 10,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: color.bay,
  },
  pictureDisc: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pictureDot: { position: "absolute", left: 34, top: 46, width: 12, height: 12, borderRadius: 6, backgroundColor: color.poppy },
  panelTitle: { ...type.title, fontSize: 24, lineHeight: 30 },
  panelBody: { fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.inkSoft },
  ideas: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  idea: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ideaText: { fontFamily: font.uiSemi, fontSize: 14, color: color.ink },

  buttons: { flexDirection: "row", gap: space.md },
  pill: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: space.md,
  },
  pillSolid: { backgroundColor: color.bay },
  pillWhite: { backgroundColor: color.white },
  pillOutline: { borderWidth: 1.5, borderColor: color.line },
  pillText: { fontFamily: font.uiSemi, fontSize: 16, color: color.bay },
});
