import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorMessage } from "../../lib/errors";
import { shareUrl } from "../../lib/links";
import { PrimaryButton } from "../../ui/Form";
import { Sheet } from "../../ui/Sheet";
import { space, type } from "../../ui/theme";
import { lowerFirst } from "./format";

type Pending = { itemId: Id<"items">; title: string };

/**
 * "Share outside Domi": each tap makes a new single-use link (good for one
 * request, even from someone outside your circles) and opens the phone's share
 * sheet. The first time, a sheet explains that first. Render `sheet` alongside
 * the button.
 */
export function useShareListing() {
  const create = useMutation(api.shares.create);
  const markIntroSeen = useMutation(api.shares.markIntroSeen);
  const me = useQuery(convexQuery(api.profiles.me, {}));
  const [pending, setPending] = useState<Pending | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const send = async ({ itemId, title }: Pending) => {
    try {
      const code = await create({ itemId });
      await Share.share({
        message: `I'm giving away my ${lowerFirst(title)}. Ask for it on Domi with this link and I'll see it.\n${shareUrl(code)}`,
      });
    } catch (e) {
      Alert.alert("Couldn't make a link", errorMessage(e));
    }
  };

  const share = (itemId: Id<"items">, title: string) => {
    const seen = introDone || me.data?.profile?.shareIntroSeen !== false;
    if (seen) void send({ itemId, title });
    else setPending({ itemId, title });
  };

  const confirm = () => {
    const p = pending;
    setPending(null);
    setIntroDone(true);
    markIntroSeen({}).catch(() => {});
    // Let the sheet slide away before the system share sheet opens.
    if (p) setTimeout(() => void send(p), 400);
  };

  const sheet = (
    <Sheet visible={pending !== null} onClose={() => setPending(null)} title="One link, one person">
      <View style={{ gap: space.md, marginTop: space.sm, marginBottom: space.lg }}>
        <Text style={type.body}>
          Each link lets one person ask for your {pending ? lowerFirst(pending.title) : "listing"}, even if they're not
          nearby.
        </Text>
        <Text style={type.body}>
          Sharing with a few friends? Send each one their own link. Everyone who can already see it can still ask
          too, and you choose who gets it.
        </Text>
      </View>
      <PrimaryButton title="Got it, share" onPress={confirm} />
    </Sheet>
  );

  return { share, sheet };
}
