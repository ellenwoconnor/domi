import type { ReactNode } from "react";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { space } from "./theme";

/**
 * Scrollable form body that behaves with the keyboard, including inside
 * modal sheets: iOS insets the content above the keyboard, dragging the
 * content dismisses the keyboard, and taps on buttons go through while it's
 * open. Put the submit button at the end of the content, not in a fixed bar.
 */
export function FormScroll({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      contentContainerStyle={[styles.body, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
});
