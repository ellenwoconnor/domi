import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { color, space } from "./theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * A round 40 px icon button: the actions on a thing (share, edit, remove) and
 * "more" (⋯) on someone else's. White over a photo or Blush, Fog on white.
 */
export function IconButton({
  icon,
  label,
  onPress,
  tone = "white",
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: "white" | "fog";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.button, { backgroundColor: tone === "fog" ? color.fog : color.white }, pressed && { opacity: 0.7 }, style]}
    >
      <Ionicons name={icon} size={icon === "chevron-back" ? 22 : 19} color={color.ink} />
    </Pressable>
  );
}

/**
 * The actions on a thing, top right, always in this order: share, edit, remove.
 * Leave one out by not passing its handler. For someone else's thing, pass only `more`.
 */
export function ThingActions({
  onShare,
  onEdit,
  onRemove,
  onMore,
  removeLabel = "Remove",
  tone = "white",
  style,
}: {
  onShare?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onMore?: () => void;
  removeLabel?: string;
  tone?: "white" | "fog";
  style?: StyleProp<ViewStyle>;
}) {
  if (!onShare && !onEdit && !onRemove && !onMore) return null;
  return (
    <View style={[styles.row, style]}>
      {onShare ? <IconButton icon="share-outline" label="Share outside Domi" onPress={onShare} tone={tone} /> : null}
      {onEdit ? <IconButton icon="create-outline" label="Edit" onPress={onEdit} tone={tone} /> : null}
      {onRemove ? <IconButton icon="trash-outline" label={removeLabel} onPress={onRemove} tone={tone} /> : null}
      {onMore ? <IconButton icon="ellipsis-horizontal" label="Report or block" onPress={onMore} tone={tone} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: space.sm },
});
