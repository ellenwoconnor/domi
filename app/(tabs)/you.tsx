import Ionicons from "@expo/vector-icons/Ionicons";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CirclesScreen } from "../../src/features/circles/CirclesScreen";
import { color, font, radius, space, type } from "../../src/ui/theme";

/** The "You" tab: profile at the top, then my circles. My listings and requests join in M3/M4. */
export default function You() {
  const { data: me } = useQuery(convexQuery(api.profiles.me, {}));
  const p = me?.profile;
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <CirclesScreen
        header={
          <View style={{ gap: space.lg }}>
            <Pressable
              onPress={() => router.push("/profile")}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              style={({ pressed }) => [styles.profile, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p?.displayName.charAt(0).toUpperCase() ?? ""}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{p?.displayName ?? ""}</Text>
                <Text style={type.meta}>{p ? `Zip ${p.zip} · Profile & settings` : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
            </Pressable>
            <Text style={type.display}>Your circles</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.thing,
    backgroundColor: color.fog,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.uiBold, fontSize: 20, color: color.bay },
});
