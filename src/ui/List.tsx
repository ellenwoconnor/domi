import Ionicons from "@expo/vector-icons/Ionicons";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space, type } from "./theme";

/** A titled section, with an optional small action on the right ("New"). */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.sectionHead}>
        <Text style={type.title}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button" style={styles.action}>
            <Ionicons name="add" size={18} color={color.bay} />
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Rows grouped on a Fog card, separated by hairlines. */
export function Group({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.sep} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function Row({
  leading,
  title,
  subtitle,
  onPress,
  tone = "ink",
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: "ink" | "bay";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={[type.label, styles.rowTitle, tone === "bay" && { color: color.bay }]}>{title}</Text>
        {subtitle ? <Text style={type.meta}>{subtitle}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={color.inkFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  action: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionText: { fontFamily: font.uiSemi, fontSize: 15, color: color.bay },
  group: { backgroundColor: color.fog, borderRadius: radius.thing, paddingHorizontal: space.md },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, minHeight: 56 },
  rowTitle: { fontSize: 16 },
});
