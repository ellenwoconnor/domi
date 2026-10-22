import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space } from "./theme";

/**
 * Two or three options in a Fog track (Browse: Free / Wishes; My stuff:
 * Giving / Getting). An option can carry a small Bay dot ("something here
 * needs you"); never a count or a red badge.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; dot?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.dot ? `${o.label}, something needs you` : o.label}
            style={[styles.seg, on && styles.segOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
            {o.dot ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    marginHorizontal: space.lg,
    padding: 3,
    borderRadius: radius.control,
    backgroundColor: color.fog,
  },
  seg: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 36,
    borderRadius: radius.control - 3,
    alignItems: "center",
    justifyContent: "center",
  },
  segOn: {
    backgroundColor: color.white,
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  label: { fontFamily: font.uiMedium, fontSize: 15, color: color.inkSoft },
  labelOn: { fontFamily: font.uiSemi, color: color.bay },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.bay },
});
