import { Share } from "react-native";
import type { Id } from "../../../convex/_generated/dataModel";
import { convex } from "../../lib/convex";
import { api } from "../../../convex/_generated/api";
import { inviteUrl } from "../../lib/links";

/** Opens the share sheet with my invite link for a custom circle. */
export async function shareInvite(circle: { id: Id<"communities">; name: string; emoji: string }) {
  const code = await convex.mutation(api.invites.getOrCreate, { communityId: circle.id });
  await Share.share({
    message: `Join me in ${circle.emoji} ${circle.name} on Domi, where neighbors give things away for free.\n${inviteUrl(code)}`,
  });
}
