import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { color, radius, space } from "../../ui/theme";
import type { Circle } from "./mockData";

/** Horizontal circle filter. `null` means all of your circles. */
export function CircleChips({
  circles,
  selected,
  onSelect,
}: {
  circles: Circle[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const options: { id: string | null; label: string }[] = [
    { id: null, label: "All circles" },
    ...circles.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` })),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const on = o.id === selected;
        return (
          <Pressable
            key={o.id ?? "all"}
            onPress={() => onSelect(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.paper,
  },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  label: { fontSize: 14, fontWeight: "500", color: color.ink },
  labelOn: { color: color.paper },
});
