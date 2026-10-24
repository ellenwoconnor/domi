import { useMutation } from "convex/react";
import { Alert, Share } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "../../lib/errors";
import { shareUrl } from "../../lib/links";

/**
 * "Share outside Domi": a link to a read-only page for this listing (for a
 * Buy Nothing group, a group chat). Anyone who joins Domi from it can ask for it.
 */
export function useShareListing() {
  const getOrCreate = useMutation(api.shares.getOrCreate);
  return async (itemId: Id<"items">, title: string) => {
    try {
      const code = await getOrCreate({ itemId });
      const url = shareUrl(code);
      await Share.share({ message: `Free to a neighbor: ${title}. Ask for it on Domi:\n${url}` });
    } catch (e) {
      Alert.alert("Couldn't make a link", errorMessage(e));
    }
  };
}
