import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, doc, eventsFor, invite, newUser, post, setup } from "./lib/testing.helpers";

async function handoff({ pickedUp = false } = {}) {
  const t = await setup();
  const ellen = await newUser(t, "Ellen");
  const maya = await newUser(t, "Maya");
  const itemId = await post(t, ellen, [ellen.zipCircle]);
  const requestId = await maya.as.mutation(api.requests.create, { itemId });
  const conversationId = await ellen.as.mutation(api.items.selectRecipient, {
    requestId,
  });
  if (pickedUp) await ellen.as.mutation(api.items.markPickedUp, { itemId });
  return { t, ellen, maya, itemId, requestId, conversationId };
}

describe("domi flower", () => {
  test("sent at pickup time, before the giver marks it picked up", async () => {
    const { t, ellen, maya, itemId, conversationId } = await handoff();
    await maya.as.mutation(api.thanks.send, {
      conversationId,
      note: "  Just got home with it. Thank you! ",
    });
    expect(await doc(t, conversationId)).toMatchObject({
      thankNote: "Just got home with it. Thank you!",
    });
    expect((await eventsFor(t, ellen.userId)).at(-1)).toMatchObject({
      type: "thanked",
      actorId: maya.userId,
      conversationId,
      title: "Maya sent you a domi flower",
      body: "“Just got home with it. Thank you!”",
    });
    // Only the giver hears about it.
    expect((await eventsFor(t, maya.userId)).some((e) => e.type === "thanked")).toBe(false);
    for (const who of [ellen, maya]) {
      const c = await who.as.query(api.conversations.get, { conversationId });
      expect(c.thanks).toMatchObject({
        note: "Just got home with it. Thank you!",
      });
    }
    // My stuff marks it with the icon only; the push and the chat already said it.
    expect((await ellen.as.query(api.mystuff.giving, {}))[0]).toMatchObject({ status: "Going to Maya", poppy: true });
    await ellen.as.mutation(api.items.markPickedUp, { itemId });
    expect((await ellen.as.query(api.mystuff.giving, {}))[0]).toMatchObject({ status: "Picked up by Maya", poppy: true });
    expect((await maya.as.query(api.mystuff.getting, {}))[0]).toMatchObject({ status: "Picked up. Enjoy!", poppy: true });
  });

  test("or after the giver marks it picked up; the note is optional", async () => {
    const { t, ellen, maya, conversationId } = await handoff({
      pickedUp: true,
    });
    // No nudge in My stuff; the flower is offered in the chat.
    expect((await maya.as.query(api.mystuff.getting, {}))[0]).toMatchObject({
      status: "Picked up. Enjoy!",
      needsYou: false,
      poppy: false,
    });
    await maya.as.mutation(api.thanks.send, { conversationId });
    expect((await doc(t, conversationId))?.thankNote).toBeUndefined();
    expect((await eventsFor(t, ellen.userId)).at(-1)).toMatchObject({
      body: "A thank-you for the Crib.",
    });
  });

  test("the picked-up push opens the chat and doesn't ask for thanks", async () => {
    const { t, maya, conversationId } = await handoff({ pickedUp: true });
    const e = (await eventsFor(t, maya.userId)).find((x) => x.type === "picked_up");
    expect(e).toMatchObject({
      conversationId,
      title: "Enjoy the Crib!",
      body: "Ellen marked it picked up.",
    });
    expect(e?.pushDueAt).toBeDefined();
  });

  test("only once, only by the recipient, and not after an un-pick", async () => {
    const { t, ellen, maya, conversationId } = await handoff();
    await expect(ellen.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
    const sam = await newUser(t, "Sam");
    await expect(sam.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
    await maya.as.mutation(api.thanks.send, { conversationId });
    await expect(maya.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("already sent");

    const other = await handoff();
    await other.ellen.as.mutation(api.items.unpick, { itemId: other.itemId });
    await expect(
      other.maya.as.mutation(api.thanks.send, {
        conversationId: other.conversationId,
      }),
    ).rejects.toThrow("closed");
  });

  test("notes are screened and capped", async () => {
    const { maya, conversationId } = await handoff();
    await expect(
      maya.as.mutation(api.thanks.send, {
        conversationId,
        note: "x".repeat(141),
      }),
    ).rejects.toThrow("140 characters");
    await expect(maya.as.mutation(api.thanks.send, { conversationId, note: "porn stash" })).rejects.toThrow(
      "isn't allowed",
    );
  });

  test("not after a block", async () => {
    const { maya, ellen, conversationId } = await handoff();
    await ellen.as.mutation(api.safety.block, { userId: maya.userId });
    await expect(maya.as.mutation(api.thanks.send, { conversationId })).rejects.toThrow("not found");
  });
  test("counted for every domi the item was shared in, never for a person", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const shower = await circle(ellen);
    await invite(ellen, maya, shower);
    const itemId = await post(t, ellen, [ellen.zipCircle, shower]);
    const requestId = await maya.as.mutation(api.requests.create, { itemId });
    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
    expect((await maya.as.query(api.communities.get, { communityId: shower })).flowerCount).toBe(0);
    await maya.as.mutation(api.thanks.send, { conversationId });
    for (const communityId of [ellen.zipCircle, shower]) {
      expect((await maya.as.query(api.communities.get, { communityId })).flowerCount).toBe(1);
    }
  });
});
