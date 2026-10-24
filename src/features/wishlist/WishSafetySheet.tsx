import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Id } from "../../../convex/_generated/dataModel";
import { Sheet, SheetAction, sheetStyles } from "../../ui/Sheet";
import { color } from "../../ui/theme";
import { BlockSheet, type BlockTarget } from "../safety/BlockSheet";
import { ReportSheet, type ReportTarget } from "../safety/ReportSheet";

export type WishSafetyTarget = { wishId: string; userId: Id<"users">; displayName: string };

/** Long-press a wish (or its "…"): report the wish, or block the person. */
export function WishSafetySheet({ target, onClose }: { target: WishSafetyTarget | null; onClose: () => void }) {
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  return (
    <>
      <Sheet visible={!!target} onClose={onClose}>
        <View>
          <SheetAction
            icon={<Ionicons name="flag-outline" size={22} color={color.inkSoft} />}
            label="Report this wish"
            onPress={() => {
              if (target) setReport({ type: "wishlist_item", id: target.wishId, label: "this wish" });
              onClose();
            }}
          />
          <SheetAction
            icon={<Ionicons name="ban-outline" size={22} color={color.inkSoft} />}
            label={`Block ${target?.displayName ?? ""}`}
            last
            onPress={() => {
              if (target) setBlock({ userId: target.userId, displayName: target.displayName });
              onClose();
            }}
          />
        </View>
        <Pressable onPress={onClose} style={sheetStyles.secondary} accessibilityRole="button">
          <Text style={sheetStyles.secondaryText}>Cancel</Text>
        </Pressable>
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} />
      <BlockSheet target={block} onClose={() => setBlock(null)} />
    </>
  );
}
