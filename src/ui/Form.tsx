import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { color, font, radius, space, type } from "./theme";

// Form primitives shared by onboarding, profile, and sign-in.

export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <TextInput placeholderTextColor={color.inkFaint} style={[styles.input, style]} {...input} />
      {hint ? <Text style={type.meta}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  busy = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={off ? undefined : onPress}
      style={[styles.primary, off && styles.off]}
    >
      {busy ? <ActivityIndicator color={color.white} /> : <Text style={type.button}>{title}</Text>}
    </Pressable>
  );
}

export function TextButton({
  title,
  onPress,
  tone = "bay",
}: {
  title: string;
  onPress: () => void;
  tone?: "bay" | "ink";
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={[styles.textButtonLabel, tone === "ink" && { color: color.ink }]}>{title}</Text>
    </Pressable>
  );
}

/** Calm inline error: Fog background, Ink text (no red, per the brand). */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={[type.meta, styles.error]}>{message}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  input: {
    backgroundColor: color.fog,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    height: 48,
    fontFamily: font.ui,
    fontSize: 16,
    color: color.ink,
  },
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  off: { opacity: 0.45 },
  textButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { fontFamily: font.uiSemi, fontSize: 16, color: color.bay },
  error: { color: color.ink, backgroundColor: color.fog, padding: space.md, borderRadius: radius.control },
});
