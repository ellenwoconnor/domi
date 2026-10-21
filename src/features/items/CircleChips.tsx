import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { CircleMark } from "../../ui/Logo";
import { color, font, radius, space } from "../../ui/theme";
import { circleLabel, type Circle } from "./mockData";

/** Circle selector. `null` means all of your circles. Zip circles carry the mark. */
export function CircleChips({
  circles,
  selected,
  onSelect,
}: {
  circles: Circle[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const options: { id: string | null; label: string; mark: boolean }[] = [
    { id: null, label: "All circles", mark: false },
    ...circles.map((c) => ({ id: c.id, label: circleLabel(c), mark: c.kind === "zip" })),
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
            {o.mark ? <CircleMark size={14} tone={on ? "white" : "bay"} /> : null}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.fog,
  },
  chipOn: { backgroundColor: color.bay },
  label: { fontFamily: font.uiMedium, fontSize: 14, color: color.ink },
  labelOn: { color: color.white },
});
