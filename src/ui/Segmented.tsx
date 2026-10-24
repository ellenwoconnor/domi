import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, space } from "./theme";

/**
 * Two or three text tabs over a hairline, the current one underlined
 * (Browse: Offers / Wishes; My stuff: Giving / Getting). An option can carry
 * a small Bay dot ("something here needs you"); never a count or a red badge.
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
            hitSlop={{ top: 8, bottom: 4 }}
            style={[styles.tab, on && styles.tabOn]}
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
    gap: 24,
    marginHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: space.sm,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabOn: { borderBottomColor: color.ink },
  label: { fontFamily: font.uiMedium, fontSize: 16, color: color.inkSoft },
  labelOn: { fontFamily: font.uiBold, color: color.ink },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.bay },
});
