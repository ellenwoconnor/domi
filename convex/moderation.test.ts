import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { containsBlockedWord } from "./lib/blockedWords";
import { doc, newUser, post, setup } from "./lib/testing.helpers";

describe("blocked words", () => {
  test("catches slurs and explicit terms, whole words, through letter swaps", () => {
    expect(containsBlockedWord("free porn dvds")).toBe(true);
    expect(containsBlockedWord("you F4GG0T")).toBe(true);
    expect(containsBlockedWord("just kill yourself")).toBe(true);
  });

  test("leaves everyday words alone", () => {
    for (const ok of [
      "Rooster figurine (cock-a-doodle)",
      "Garden hoe and rake",
      "Tennis balls",
      "Spic and Span cleaner",
      "Small chink on the rim",
      "Flame retardant blanket",
      "Scunthorpe United scarf",
      "Dick Francis paperbacks",
    ]) {
      expect(containsBlockedWord(ok), ok).toBe(false);
    }
  });

  test("posting, wishing, notes and chat refuse them; report reasons don't", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await expect(post(t, ellen, [ellen.zipCircle], "porn stash")).rejects.toThrow("isn't allowed");
    await expect(
      ellen.as.mutation(api.wishlist.create, { title: "nudes", communityIds: [ellen.zipCircle] }),
    ).rejects.toThrow("isn't allowed");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    await expect(maya.as.mutation(api.requests.create, { itemId, note: "kys" })).rejects.toThrow("isn't allowed");
    const requestId = await maya.as.mutation(api.requests.create, { itemId });
    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
    await expect(
      maya.as.mutation(api.conversations.send, { conversationId, body: "you retard" }),
    ).rejects.toThrow("isn't allowed");
    await maya.as.mutation(api.safety.report, { targetType: "user", targetId: ellen.userId, reason: "Called me a retard" });
  });
});

describe("report alerts and moderation", () => {
  async function reported() {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle], "Crib");
    const reportId = await maya.as.mutation(api.safety.report, {
      targetType: "item",
      targetId: itemId,
      reason: "Spam or scam: asks for a deposit",
    });
    return { t, ellen, maya, itemId, reportId };
  }

  test("a report schedules an email with what was reported and the commands", async () => {
    const { t, reportId } = await reported();
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled.map((s) => s.name)).toContain("moderation:sendReportAlert");
    const { subject, text } = await t.query(internal.moderation.reportDetails, { reportId });
    expect(subject).toBe("Domi report: listing (Spam or scam)");
    expect(text).toContain("Maya reported a listing.");
    expect(text).toContain('Listing "Crib" by Ellen');
    expect(text).toContain(`moderation:removeContent '{"reportId":"${reportId}"}'`);
  });

  test("removeContent takes the listing down and closes the report", async () => {
    const { t, itemId, reportId } = await reported();
    await t.mutation(internal.moderation.removeContent, { reportId });
    expect((await doc(t, itemId))?.status).toBe("removed");
    expect((await t.run((ctx) => ctx.db.get(reportId)))?.status).toBe("reviewed");
  });

  test("suspendAuthor locks the author out and takes their listings down", async () => {
    const { t, ellen, itemId, reportId } = await reported();
    await t.mutation(internal.moderation.suspendAuthor, { reportId });
    expect((await doc(t, itemId))?.status).toBe("removed");
    await expect(post(t, ellen, [ellen.zipCircle], "Lamp")).rejects.toThrow("suspended");
  });

  test("removeContent deletes a reported message; dismiss leaves things as they are", async () => {
    const { t, ellen, maya, itemId } = await reported();
    const requestId = await maya.as.mutation(api.requests.create, { itemId });
    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
    const messageId = await ellen.as.mutation(api.conversations.send, { conversationId, body: "Send $50 first" });
    const reportId = await maya.as.mutation(api.safety.report, { targetType: "message", targetId: messageId, reason: "Spam or scam" });
    await t.mutation(internal.moderation.removeContent, { reportId });
    expect(await t.run((ctx) => ctx.db.get(messageId))).toBeNull();

    const other = await maya.as.mutation(api.safety.report, { targetType: "user", targetId: ellen.userId, reason: "Something else" });
    await t.mutation(internal.moderation.dismiss, { reportId: other });
    expect((await t.run((ctx) => ctx.db.get(other)))?.status).toBe("dismissed");
  });
});
