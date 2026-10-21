import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { color, font } from "../../src/ui/theme";

export default function TabsLayout() {
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
        name="activity"
        options={{
          title: "Activity",
          // No red badges: a calm Bay Blue count
          tabBarBadge: 2,
          tabBarBadgeStyle: { backgroundColor: color.bay, color: color.white, fontFamily: font.uiBold, fontSize: 11 },
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={c} />
          ),
        }}
      />
    </Tabs>
  );
}
