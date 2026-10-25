import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { CirclesPicture, GivePicture, WishPicture } from "../src/features/intro/Pictures";
import { useAskForPush } from "../src/features/push/useAskForPush";
import { PrimaryButton, TextButton } from "../src/ui/Form";
import { Logo } from "../src/ui/Logo";
import { color, font, radius, space, type } from "../src/ui/theme";

const PAGES = 3;
const GUTTER = space.lg;

/**
 * "How Domi works": three swipeable cards. Shown once after signup (the tabs
 * layout opens it while the profile's introSeen is false) and again from
 * You › How Domi works (`?replay=1`, which doesn't touch the flag).
 */
export default function Welcome() {
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const markIntroSeen = useMutation(api.profiles.markIntroSeen);
  const askForPush = useAskForPush();
  // Name the circle they were invited to, else their neighborhood circle.
  const circles = useQuery(convexQuery(api.communities.mine, {})).data ?? [];
  const circleName = (circles.find((c) => c.kind === "custom") ?? circles[0])?.name;
  const { width, height } = useWindowDimensions();
  // Insets by hand, like the other full-screen modals: SafeAreaView can measure 0 in one.
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  // Mark it seen as soon as it opens, so it never comes back on its own,
  // even if the app is closed halfway through.
  useEffect(() => {
    if (!replay) markIntroSeen({}).catch(() => {});
  }, [replay, markIntroSeen]);

  const pictureW = width - GUTTER * 2;
  const pictureH = Math.round(Math.min(300, Math.max(210, height * 0.34)));
  const last = page === PAGES - 1;

  function goTo(i: number) {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  }
  function onSwipe(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }
  function giveFirstThing() {
    router.replace("/listing/new");
  }
  // First time through, the notifications ask comes next (it then goes on to `next`).
  async function leave(next: "/" | "/listing/new") {
    if (!replay && (await askForPush("welcome", { circle: circleName, next, replace: true }))) return;
    if (next === "/") close();
    else giveFirstThing();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {page === 0 ? (
          <Logo size={24} />
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => goTo(page - 1)}>
            <Ionicons name="chevron-back" size={26} color={color.bay} />
          </Pressable>
        )}
        {last ? null : <TextButton title={replay ? "Close" : "Skip"} onPress={() => leave("/")} />}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSwipe}
        style={{ flex: 1 }}
      >
        <Card
          width={width}
          title="Good things find a new home nearby."
          body="Domi circles are sharing groups. We've added you to your neighborhood circle. You can create other circles and invite others into them."
        >
          <CirclesPicture width={pictureW} height={pictureH} />
        </Card>
        <Card
          width={width}
          title="Give something away"
          body="Snap a photo and post it free. Neighbors ask for it, you pick who gets it, and you set up pickup in chat. Your address is never shown."
        >
          <GivePicture width={pictureW} height={pictureH} />
        </Card>
        <Card
          width={width}
          title="Share a wish"
          body="Request items posted in your circles, or post a wish for a neighbor to see and fulfill."
        >
          <WishPicture width={pictureW} height={pictureH} />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Card ${page + 1} of ${PAGES}`}>
          {Array.from({ length: PAGES }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
        {last ? (
          <View style={{ gap: space.xs }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => leave("/listing/new")}
              style={({ pressed }) => [styles.give, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.giveText}>Give your first thing</Text>
            </Pressable>
            <TextButton title="Start browsing" onPress={() => leave("/")} />
          </View>
        ) : (
          <PrimaryButton title="Next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </View>
  );
}

/**
 * Every card is laid out the same way: title, picture, explanation. The title
 * box is always two lines tall (text sits at its bottom), so the pictures,
 * which all share one size, line up from card to card.
 */
function Card({ width, title, body, children }: { width: number; title: string; body: string; children: ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBox}>
        <Text style={type.display} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
      <Text style={styles.body}>{body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  bar: {
    height: 52,
    paddingHorizontal: GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: { paddingHorizontal: GUTTER, paddingTop: space.sm, paddingBottom: space.lg, gap: space.lg },
  titleBox: { minHeight: type.display.lineHeight * 2, justifyContent: "flex-end" },
  body: { ...type.body, color: color.inkSoft },
  footer: { paddingHorizontal: GUTTER, paddingTop: space.sm, paddingBottom: space.md, gap: space.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line },
  dotOn: { width: 18, backgroundColor: color.bay },
  // Solid Poppy is for giving moments; text on Poppy is Ink.
  give: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.poppy,
    alignItems: "center",
    justifyContent: "center",
  },
  giveText: { fontFamily: font.uiSemi, fontSize: 17, color: color.ink },
});
