import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert } from "react-native";
import { api } from "../../../convex/_generated/api";
import { errorMessage } from "../../lib/errors";
import { unregisterDevice } from "../push/push";
import { signOutOfProviders } from "./nativeSignIn";

/** Sign out and delete account, shared by You and the updated-terms screen. */
export function useAccountActions() {
  const { signOut } = useAuthActions();
  const deleteAccount = useMutation(api.profiles.deleteAccount);
  const unregister = useMutation(api.activity.unregisterPushToken);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doSignOut() {
    await unregisterDevice(unregister);
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
            setError(null);
            try {
              await unregisterDevice(unregister);
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

  return { doSignOut, confirmDelete, deleting, error };
}
