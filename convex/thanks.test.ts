import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { doc, eventsFor, newUser, post, setup } from "./lib/testing.helpers";

async function handoff({ pickedUp = true } = {}) {
  const t = await setup();
  const ellen = await newUser(t, "Ellen");
  const maya = await newUser(t, "Maya");
  const itemId = await post(t, ellen, [ellen.zipCircle]);
  const requestId = await maya.as.mutation(api.requests.create, { itemId });
  const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
  if (pickedUp) await ellen.as.mutation(api.items.markPickedUp, { itemId });
  return { t, ellen, maya, itemId, requestId, conversationId };
}

describe("thank-you poppy", () => {
  test("the person who got the item sends one poppy; the giver is told and both see it", async () => {
    const { t, ellen, maya, itemId, conversationId } = await handoff();
    await maya.as.mutation(api.thanks.send, { conversationId, note: "  Thank you! The baby loves it. " });
    expect(await doc(t, itemId)).toMatchObject({ thankNote: "Thank you! The baby loves it." });
    expect((await eventsFor(t, ellen.userId)).at(-1)).toMatchObject({
      type: "thanked",
      actorId: maya.userId,
      conversationId,
      title: "Maya sent you a poppy",
      body: "“Thank you! The baby loves it.”",
    });
    // Only the giver hears about it.
    expect((await eventsFor(t, maya.userId)).some((e) => e.type === "thanked")).toBe(false);
    for (const who of [ellen, maya]) {
      const c = await who.as.query(api.conversations.get, { conversationId });
      expect(c.thanks).toMatchObject({ note: "Thank you! The baby loves it." });
    }
    const [giving] = await ellen.as.query(api.mystuff.giving, {});
    expect(giving).toMatchObject({ status: "Maya sent you a poppy", poppy: true });
    const [getting] = await maya.as.query(api.mystuff.getting, {});
    expect(getting).toMatchObject({ status: "Picked up. You sent a poppy.", poppy: true });
  });

  test("the note is optional", async () => {
    const { t, ellen, maya, itemId, conversationId } = await handoff();
    expect((await maya.as.query(api.mystuff.getting, {}))[0].status).toBe("Picked up. Send Ellen a poppy?");
    await maya.as.mutation(api.thanks.send, { conversationId });
    expect((await doc(t, itemId))?.thankNote).toBeUndefined();
    expect((await eventsFor(t, ellen.userId)).at(-1)).toMatchObject({ body: "A thank-you for the Crib." });
  });

  test("only once, only after pickup, and never by the giver or anyone else", async () => {
    const before = await handoff({ pickedUp: false });
    await expect(before.maya.as.mutation(api.thanks.send, { conversationId: before.conversationId })).rejects.toThrow(
      "once it's picked up",
    );

    const { t, ellen, maya, conversationId } = await handoff();
    await expect(ellen.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
    const sam = await newUser(t, "Sam");
    await expect(sam.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
    await maya.as.mutation(api.thanks.send, { conversationId });
    await expect(maya.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("already sent");
  });

  test("notes are screened and capped", async () => {
    const { maya, conversationId } = await handoff();
    await expect(maya.as.mutation(api.thanks.send, { conversationId, note: "x".repeat(141) })).rejects.toThrow(
      "140 characters",
    );
    await expect(maya.as.mutation(api.thanks.send, { conversationId, note: "porn stash" })).rejects.toThrow(
      "isn't allowed",
    );
  });

  test("not after a block", async () => {
    const { maya, ellen, conversationId } = await handoff();
    await ellen.as.mutation(api.safety.block, { userId: maya.userId });
    await expect(maya.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
  });
});
