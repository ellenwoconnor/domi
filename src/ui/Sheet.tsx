import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, font, radius, space, type } from "./theme";

// A drag past this distance, or a quick flick down, closes the sheet.
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.8;

/** A bottom sheet over a dimmed screen. Swiping it down or tapping the scrim closes it (VoiceOver: the escape gesture). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const drag = useRef(new Animated.Value(0)).current;
  // The responder is made once, so it reads the latest onClose through a ref.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);

  const pan = useMemo(() => {
    const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    return PanResponder.create({
      // Claim only clear downward drags, so taps, typing and horizontal scrolling inside the sheet keep working.
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
          Keyboard.dismiss();
          Animated.timing(drag, { toValue: Dimensions.get("window").height, duration: 180, useNativeDriver: true }).start(() =>
            closeRef.current(),
          );
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  }, [drag]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          {...pan.panHandlers}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[styles.sheet, { paddingBottom: insets.bottom + space.lg, transform: [{ translateY: drag }] }]}
        >
          <View style={styles.grabber} />
          {title ? <Text style={[type.title, { fontSize: 24, lineHeight: 30 }]}>{title}</Text> : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One row in an action sheet: icon, label, optional detail line. */
export function SheetAction({
  icon,
  label,
  detail,
  onPress,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  detail?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, !last && styles.actionLine, pressed && { opacity: 0.6 }]}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        {detail ? <Text style={type.meta}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export const sheetStyles = StyleSheet.create({
  primary: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.bay,
    alignItems: "center",
    justifyContent: "center",
  },
  // A giving moment: Poppy, with Ink text.
  give: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.poppy,
    alignItems: "center",
    justifyContent: "center",
  },
  giveText: { fontFamily: font.uiSemi, fontSize: 17, color: color.ink },
  secondary: {
    height: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: font.uiSemi, color: color.ink, fontSize: 16 },
});

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(24,34,46,0.35)" },
  sheet: {
    backgroundColor: color.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.line,
    marginBottom: space.xs,
  },
  action: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: space.sm },
  actionLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  actionLabel: { fontFamily: font.uiSemi, fontSize: 16, color: color.ink },
});
