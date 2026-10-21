import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { color, font, radius, space, type } from "../../ui/theme";

// A short, friendly set for circles. Anything else can be typed.
const EMOJIS = [
  "🍼", "🧸", "👶", "🏡", "🏘️", "🌳", "🌻", "🪴", "🐶", "🐱",
  "📚", "🎨", "🧶", "🧩", "🎸", "⚽️", "🚲", "🏕️", "⛰️", "🌊",
  "🍎", "🥕", "🍳", "☕️", "🍋", "🎉", "🏫", "🎒", "🛠️", "🪑",
  "👗", "🧥", "❤️", "⭐️", "🌈", "🦋", "🐝", "🌙", "☀️", "🕊️",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const custom = value && !EMOJIS.includes(value);
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.label}>Emoji</Text>
      <View style={styles.grid}>
        {EMOJIS.map((e) => {
          const on = e === value;
          return (
            <Pressable
              key={e}
              onPress={() => onChange(e)}
              accessibilityRole="button"
              accessibilityLabel={e}
              accessibilityState={{ selected: on }}
              style={[styles.cell, on && styles.cellOn]}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.otherRow}>
        <Text style={type.meta}>Or type any emoji:</Text>
        <TextInput
          value={custom ? value : ""}
          onChangeText={(t) => {
            const first = [...t.trim()].slice(0, 2).join(""); // keep it to one emoji-ish
            if (first) onChange(first);
          }}
          style={[styles.other, custom && styles.cellOn]}
          placeholder="🙂"
          placeholderTextColor={color.inkFaint}
          maxLength={8}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 22, // circles mean people
    backgroundColor: color.fog,
    alignItems: "center",
    justifyContent: "center",
  },
  cellOn: { backgroundColor: color.blush, borderWidth: 2, borderColor: color.bay },
  emoji: { fontSize: 22 },
  otherRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  other: {
    width: 56,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.fog,
    textAlign: "center",
    fontSize: 22,
    fontFamily: font.ui,
  },
});
