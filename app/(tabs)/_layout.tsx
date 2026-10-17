import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import { color } from "../../src/ui/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: { borderTopColor: color.line, backgroundColor: color.paper },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
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
          tabBarBadge: 2,
          tabBarBadgeStyle: { backgroundColor: color.tag, color: color.tagInk, fontWeight: "700" },
          tabBarIcon: ({ color: c, focused }) => (
            <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={c} />
          ),
        }}
      />
    </Tabs>
  );
}
