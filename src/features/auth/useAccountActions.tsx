import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { Sheet, sheetStyles } from "../../ui/Sheet";
import { color, radius, type } from "../../ui/theme";
import { unregisterDevice } from "../push/push";
import { setAccountClosing } from "./closing";
import { signOutOfProviders } from "./nativeSignIn";

/**
 * Sign out and delete account, shared by You and the updated-terms screen.
 * `confirmDelete` opens the "Delete your account?" sheet; render `deleteSheet` on the screen.
 */
export function useAccountActions() {
  const { signOut } = useAuthActions();
  const deleteAccount = useMutation(api.profiles.deleteAccount);
  const unregister = useMutation(api.activity.unregisterPushToken);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doSignOut() {
    await unregisterDevice(unregister);
    await signOutOfProviders();
    await signOut();
  }

  async function doDelete() {
    setDeleting(true);
    setError(null);
    setAccountClosing(true);
    try {
      await unregisterDevice(unregister).catch(() => {});
      await deleteAccount({});
    } catch (e) {
      // Nothing was deleted (one transaction), so stay on this screen.
      setAccountClosing(false);
      setError(errorMessage(e));
      setDeleting(false);
      setConfirming(false);
      return;
    }
    // The account is gone; these only tidy up, and the root layout lifts the cover once signed out.
    await signOutOfProviders().catch(() => {});
    await signOut().catch(() => {}); // the session is already gone on the server
  }

  const deleteSheet = (
    <Sheet visible={confirming} onClose={() => !deleting && setConfirming(false)} title="Delete your account?">
      <Text style={type.body}>
        This permanently deletes your profile, listings, wishes, requests and messages. Anyone you were arranging a pickup
        with will be told. This can't be undone.
      </Text>
      <Pressable
        onPress={doDelete}
        disabled={deleting}
        accessibilityRole="button"
        style={({ pressed }) => [styles.delete, pressed && { opacity: 0.8 }]}
      >
        {deleting ? <ActivityIndicator color={color.white} /> : <Text style={type.button}>Delete my account</Text>}
      </Pressable>
      <Pressable
        onPress={() => setConfirming(false)}
        disabled={deleting}
        accessibilityRole="button"
        style={sheetStyles.secondary}
      >
        <Text style={sheetStyles.secondaryText}>Keep my account</Text>
      </Pressable>
    </Sheet>
  );

  return { doSignOut, confirmDelete: () => setConfirming(true), deleteSheet, deleting, error };
}

const styles = StyleSheet.create({
  // Destructive, but the palette has no red: solid Ink, set apart from Bay actions.
  delete: {
    height: 54,
    borderRadius: radius.control,
    backgroundColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
