import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { doc, eventsFor, newUser, post, setup } from "./lib/testing.helpers";

async function pickedPair() {
  const t = await setup();
  const ellen = await newUser(t, "Ellen");
  const maya = await newUser(t, "Maya");
  const itemId = await post(t, ellen, [ellen.zipCircle]);
  const requestId = await maya.as.mutation(api.requests.create, { itemId });
  const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
  return { t, ellen, maya, itemId, requestId, conversationId };
}

describe("threads and messaging (M4)", () => {
  test("the two participants chat; the other side is notified", async () => {
    const { t, ellen, maya, conversationId } = await pickedPair();
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Can I come at 5?" });
    await ellen.as.mutation(api.conversations.send, { conversationId, body: "Sure, 123 Elm St." });
    const msgs = await maya.as.query(api.conversations.messages, { conversationId });
    expect(msgs.map((m) => [m.body, m.mine])).toEqual([
      ["Can I come at 5?", true],
      ["Sure, 123 Elm St.", false],
    ]);
    expect((await eventsFor(t, ellen.userId)).at(-1)).toMatchObject({
      type: "new_message",
      body: "New message about the Crib",
    });
    const [summary] = await maya.as.query(api.conversations.mine, {});
    expect(summary).toMatchObject({ role: "recipient", other: { displayName: "Ellen" }, unread: 1 });
    await maya.as.mutation(api.conversations.markRead, { conversationId });
    expect((await maya.as.query(api.conversations.mine, {}))[0].unread).toBe(0);
  });

  test("a third account cannot read or write the thread", async () => {
    const { t, conversationId } = await pickedPair();
    const sam = await newUser(t, "Sam");
    await expect(sam.as.query(api.conversations.messages, { conversationId })).rejects.toThrow("not found");
    await expect(sam.as.query(api.conversations.get, { conversationId })).rejects.toThrow("not found");
    await expect(sam.as.mutation(api.conversations.send, { conversationId, body: "hi" })).rejects.toThrow(
      "not found",
    );
    expect(await sam.as.query(api.conversations.mine, {})).toEqual([]);
  });

  test("a closed thread refuses new messages", async () => {
    const { ellen, maya, itemId, conversationId } = await pickedPair();
    await ellen.as.mutation(api.items.unpick, { itemId });
    await expect(maya.as.mutation(api.conversations.send, { conversationId, body: "?" })).rejects.toThrow("closed");
  });

  test("block stops messages, hides each other's listings, and frees the item", async () => {
    const { t, ellen, maya, itemId, requestId, conversationId } = await pickedPair();
    await maya.as.mutation(api.safety.block, { userId: ellen.userId });
    await expect(ellen.as.mutation(api.conversations.send, { conversationId, body: "hello?" })).rejects.toThrow();
    expect((await doc(t, requestId))?.status).toBe("withdrawn");
    expect((await doc(t, itemId))?.status).toBe("available");
    expect(await maya.as.query(api.items.browse, {})).toEqual([]);
    await expect(maya.as.query(api.items.get, { itemId })).rejects.toThrow("not found");
    await expect(maya.as.mutation(api.requests.create, { itemId })).rejects.toThrow("not found");
    // Works in both directions.
    const lamp = await post(t, maya, [maya.zipCircle], "Lamp");
    await expect(ellen.as.query(api.items.get, { itemId: lamp })).rejects.toThrow("not found");
    expect((await ellen.as.query(api.communities.members, { communityId: ellen.zipCircle })).map((m) => m.displayName)).toEqual(["Ellen"]);

    await maya.as.mutation(api.safety.unblock, { userId: ellen.userId });
    expect((await maya.as.query(api.items.get, { itemId })).status).toBe("available");
  });

  test("reports are recorded for review", async () => {
    const { t, maya, itemId } = await pickedPair();
    await maya.as.mutation(api.safety.report, { targetType: "item", targetId: itemId, reason: "Not free" });
    await expect(
      maya.as.mutation(api.safety.report, { targetType: "item", targetId: "nope", reason: "x" }),
    ).rejects.toThrow();
    const reports = await t.run((ctx) => ctx.db.query("reports").collect());
    expect(reports).toMatchObject([{ targetType: "item", targetId: itemId, status: "open" }]);
  });
});
