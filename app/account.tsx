import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { signOutOfProviders } from "../src/features/auth/nativeSignIn";
import { errorMessage } from "../src/lib/errors";
import { ErrorNote } from "../src/ui/Form";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { color, font, space, type } from "../src/ui/theme";

/** Account: sign out, delete account. */
export default function Account() {
  const { signOut } = useAuthActions();
  const deleteAccount = useMutation(api.profiles.deleteAccount);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doSignOut() {
    await signOutOfProviders();
    await signOut();
  }

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your profile, listings, wishes, requests and messages. Anyone you were arranging a pickup with will be told. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount({});
              await signOutOfProviders();
              await signOut().catch(() => {}); // the session is already gone on the server
            } catch (e) {
              setError(errorMessage(e));
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title="Account" />
      <View style={styles.body}>
        <View style={styles.rows}>
          <Row label="Sign out" onPress={doSignOut} />
          <Row label={deleting ? "Deleting…" : "Delete account"} onPress={confirmDelete} last />
        </View>
        <ErrorNote message={error} />
        <Text style={[type.meta, styles.version]}>Domi {Constants.expoConfig?.version ?? ""}</Text>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, onPress, last = false }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && styles.rule, pressed && { opacity: 0.6 }]}
    >
      <Text style={type.body}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.white },
  body: { padding: space.lg, gap: space.xl },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  row: { minHeight: 52, justifyContent: "center" },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  version: { textAlign: "center", fontFamily: font.ui, color: color.inkFaint },
});
