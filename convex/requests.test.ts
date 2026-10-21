import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { doc, eventsFor, newUser, post, setup } from "./lib/testing.helpers";

describe("requests and the item lifecycle (M4)", () => {
  test("request with a note; the owner sees it; you can't request your own item or twice", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    await expect(ellen.as.mutation(api.requests.create, { itemId })).rejects.toThrow("your own");
    await maya.as.mutation(api.requests.create, { itemId, note: "For my twins!" });
    await expect(maya.as.mutation(api.requests.create, { itemId })).rejects.toThrow("already");
    await expect(maya.as.mutation(api.requests.create, { itemId, note: "x".repeat(141) })).rejects.toThrow();

    const list = await ellen.as.query(api.requests.forItem, { itemId });
    expect(list).toMatchObject([{ note: "For my twins!", requester: { displayName: "Maya" }, status: "open" }]);
    await expect(maya.as.query(api.requests.forItem, { itemId })).rejects.toThrow("not found");
    const [event] = await eventsFor(t, ellen.userId);
    expect(event.body).toBe('Maya requested your Crib: "For my twins!"');
  });

  test("open requests are capped at 5", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    for (let i = 0; i < 5; i++) {
      await maya.as.mutation(api.requests.create, { itemId: await post(t, ellen, [ellen.zipCircle], `Thing ${i}`) });
    }
    const sixth = await post(t, ellen, [ellen.zipCircle], "Thing 6");
    await expect(maya.as.mutation(api.requests.create, { itemId: sixth })).rejects.toThrow("up to 5");
  });

  test("pick → pending with a thread; others stay in line; un-pick → available again", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const rMaya = await maya.as.mutation(api.requests.create, { itemId });
    const rSam = await sam.as.mutation(api.requests.create, { itemId });

    await expect(maya.as.mutation(api.items.selectRecipient, { requestId: rSam })).rejects.toThrow("not found");
    const conv = await ellen.as.mutation(api.items.selectRecipient, { requestId: rMaya });
    expect((await doc(t, itemId))?.status).toBe("pending");
    expect((await doc(t, rMaya))?.status).toBe("selected");
    expect((await doc(t, rSam))?.status).toBe("open");
    expect((await eventsFor(t, maya.userId)).at(-1)?.body).toBe(
      "You were picked for the Crib! Message Ellen to arrange pickup.",
    );
    expect((await eventsFor(t, sam.userId)).at(-1)?.type).toBe("pending_elsewhere");

    // Requests are still allowed while pending, and the item shows as pending.
    const kai = await newUser(t, "Kai");
    expect((await kai.as.query(api.items.get, { itemId })).status).toBe("pending");
    await kai.as.mutation(api.requests.create, { itemId });

    await ellen.as.mutation(api.items.unpick, { itemId });
    expect((await doc(t, itemId))?.status).toBe("available");
    expect((await doc(t, rMaya))?.status).toBe("cancelled");
    expect((await doc(t, conv))?.closedAt).toBeDefined();
    expect((await eventsFor(t, maya.userId)).at(-1)?.type).toBe("unpicked");

    // The owner picks the next person from the same line.
    await ellen.as.mutation(api.items.selectRecipient, { requestId: rSam });
    expect((await doc(t, itemId))?.status).toBe("pending");
  });

  test("recipient withdraws → owner is told and the item is available", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await maya.as.mutation(api.requests.withdraw, { requestId: r });
    expect((await doc(t, itemId))?.status).toBe("available");
    expect((await eventsFor(t, ellen.userId)).at(-1)?.body).toBe("Maya can't take the Crib anymore.");
  });

  test("mark picked up → gone; recipient and the line hear about it", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    const rSam = await sam.as.mutation(api.requests.create, { itemId });
    await expect(ellen.as.mutation(api.items.markPickedUp, { itemId })).rejects.toThrow("Pick a recipient");
    await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await ellen.as.mutation(api.items.markPickedUp, { itemId });
    expect((await doc(t, itemId))?.status).toBe("gone");
    expect((await doc(t, rSam))?.status).toBe("closed");
    expect((await eventsFor(t, maya.userId)).at(-1)?.body).toBe("Hope you enjoy the Crib!");
    expect((await eventsFor(t, sam.userId)).at(-1)?.type).toBe("picked_up_elsewhere");
    expect(await ellen.as.query(api.items.browse, {})).toEqual([]);
  });

  test("removing a listing tells open and selected requesters", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const r = await maya.as.mutation(api.requests.create, { itemId });
    await sam.as.mutation(api.requests.create, { itemId });
    const conv = await ellen.as.mutation(api.items.selectRecipient, { requestId: r });
    await ellen.as.mutation(api.items.remove, { itemId });
    for (const u of [maya, sam]) {
      expect((await eventsFor(t, u.userId)).at(-1)?.type).toBe("item_removed");
    }
    expect((await doc(t, conv))?.closedAt).toBeDefined();
    // Requesters can still open the removed listing; others can't.
    expect((await maya.as.query(api.items.get, { itemId })).status).toBe("removed");
    const kai = await newUser(t, "Kai");
    await expect(kai.as.query(api.items.get, { itemId })).rejects.toThrow("not found");
  });
});
