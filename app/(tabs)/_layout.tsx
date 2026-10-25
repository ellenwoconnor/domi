import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { api } from "../../convex/_generated/api";
import { color, font } from "../../src/ui/theme";

export default function TabsLayout() {
  const needs = useQuery(convexQuery(api.mystuff.needsYou, {}));
  const needsYou = (needs.data?.total ?? 0) > 0;

  // First time in the app: open the "How Domi works" cards once.
  const me = useQuery(convexQuery(api.profiles.me, {}));
  const showIntro = me.data?.profile?.introSeen === false;
  const introOpened = useRef(false);
  useEffect(() => {
    if (showIntro && !introOpened.current) {
      introOpened.current = true;
      router.push("/welcome");
    }
  }, [showIntro]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.bay,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: { borderTopColor: color.line, backgroundColor: color.white },
        tabBarLabelStyle: { fontFamily: font.uiSemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "Give",
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "camera" : "camera-outline"} size={24} color={c} />
          ),
        }}
      />
      <Tabs.Screen
        name="mystuff"
        options={{
          title: "My stuff",
          tabBarAccessibilityLabel: needsYou ? "My stuff, something needs you" : "My stuff",
          tabBarIcon: ({ color: c, focused }) => (
            <View>
              <Ionicons name={focused ? "cube" : "cube-outline"} size={23} color={c} />
              {/* No red badges and no counts: a small Bay dot when something needs you. */}
              {needsYou ? (
                <View
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -4,
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: color.bay,
                    borderWidth: 1.5,
                    borderColor: color.white,
                  }}
                />
              ) : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
