import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, space, type } from "./theme";

/** Back (or close) button, centered title, optional right-side action. */
export function ScreenHeader({
  title,
  close = false,
  right,
}: {
  title?: string;
  close?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={close ? "Close" : "Back"}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={12}
        style={styles.side}
      >
        <Ionicons name={close ? "close" : "chevron-back"} size={26} color={color.ink} />
      </Pressable>
      <Text style={type.title} numberOfLines={1}>
        {title ?? ""}
      </Text>
      <View style={[styles.side, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.md,
  },
  side: { minWidth: 26 },
});
