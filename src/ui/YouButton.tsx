import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { api } from "../../convex/_generated/api";
import { Avatar } from "./Avatar";

/** Your initial, top right on Browse and My stuff. Opens You (profile, circles, settings). */
export function YouButton() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  return (
    <Pressable
      onPress={() => router.push("/you")}
      accessibilityRole="button"
      accessibilityLabel="You: profile, circles and settings"
      hitSlop={6}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <Avatar name={me?.profile?.displayName ?? ""} size={38} />
    </Pressable>
  );
}
