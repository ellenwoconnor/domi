import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, invite, newUser, photo, post, setup } from "./lib/testing.helpers";

const lines = (rows: { title: string; status: string; needsYou: boolean; ended: boolean }[]) =>
  rows.map((r) => [r.title, r.status, r.needsYou, r.ended]);

describe("My stuff", () => {
  test("giving: requests need you, a pick shows who it's going to, a message needs you again", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const crib = await post(t, ellen, [ellen.zipCircle], "Crib");
    await post(t, ellen, [ellen.zipCircle], "Rug");
    const mayaReq = await maya.as.mutation(api.requests.create, { itemId: crib });
    await sam.as.mutation(api.requests.create, { itemId: crib });

    expect(lines(await ellen.as.query(api.mystuff.giving, {}))).toEqual([
      ["Crib", "2 people asked. Choose one.", true, false],
      ["Rug", "No requests yet", false, false],
    ]);
    expect(await ellen.as.query(api.mystuff.needsYou, {})).toEqual({ giving: 1, getting: 0, total: 1 });

    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId: mayaReq });
    expect((await ellen.as.query(api.mystuff.giving, {}))[0]).toMatchObject({
      title: "Crib",
      status: "Going to Maya",
      needsYou: false,
    });

    await maya.as.mutation(api.conversations.send, { conversationId, body: "5pm?" });
    expect((await ellen.as.query(api.mystuff.giving, {}))[0]).toMatchObject({
      status: "New message from Maya",
      needsYou: true,
      conversationId,
    });

    await ellen.as.mutation(api.items.markPickedUp, { itemId: crib });
    expect(lines(await ellen.as.query(api.mystuff.giving, {}))).toEqual([
      ["Rug", "No requests yet", false, false],
      ["Crib", "Picked up by Maya", false, true],
    ]);
  });

  test("getting: being chosen needs you until you reply; others see a gentle ending", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const crib = await post(t, ellen, [ellen.zipCircle], "Crib");
    const mayaReq = await maya.as.mutation(api.requests.create, { itemId: crib });
    await sam.as.mutation(api.requests.create, { itemId: crib });

    expect(lines(await maya.as.query(api.mystuff.getting, {}))).toEqual([
      ["Crib", "You asked. Ellen hasn't chosen yet.", false, false],
    ]);

    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId: mayaReq });
    expect(lines(await maya.as.query(api.mystuff.getting, {}))).toEqual([
      ["Crib", "Ellen chose you. Reply to plan pickup.", true, false],
    ]);
    expect(lines(await sam.as.query(api.mystuff.getting, {}))).toEqual([
      ["Crib", "You asked. It's on hold for someone else.", false, false],
    ]);

    await maya.as.mutation(api.conversations.send, { conversationId, body: "Thank you!" });
    expect((await maya.as.query(api.mystuff.getting, {}))[0].status).toBe("Pickup with Ellen");
    await ellen.as.mutation(api.conversations.send, { conversationId, body: "123 Elm St." });
    expect((await maya.as.query(api.mystuff.getting, {}))[0]).toMatchObject({
      status: "New message from Ellen",
      needsYou: true,
    });

    await ellen.as.mutation(api.items.markPickedUp, { itemId: crib });
    expect(lines(await maya.as.query(api.mystuff.getting, {}))).toEqual([["Crib", "Picked up. Enjoy!", false, true]]);
    expect(lines(await sam.as.query(api.mystuff.getting, {}))).toEqual([["Crib", "Went to someone else", false, true]]);
  });

  test("wishes: offers need the wisher; the offerer waits", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const wishId = await maya.as.mutation(api.wishlist.create, {
      title: "Balance bike",
      communityIds: [maya.zipCircle],
    });
    expect(lines(await maya.as.query(api.mystuff.getting, {}))).toEqual([
      ["Balance bike", "No offers yet", false, false],
    ]);

    const offerId = await sam.as.mutation(api.wishlist.offer, {
      wishId,
      title: "Strider bike",
      description: "Red",
      photos: [await photo(t)],
    });
    expect((await maya.as.query(api.mystuff.getting, {}))[0]).toMatchObject({
      kind: "wish",
      status: "1 neighbor offered one",
      needsYou: true,
      wishId,
    });
    expect((await sam.as.query(api.mystuff.giving, {}))[0]).toMatchObject({
      title: "Strider bike",
      status: "Offered for Maya's wish. Waiting for them to choose.",
      needsYou: false,
    });

    // Once picked, the wish row gives way to the pickup row.
    await maya.as.mutation(api.wishlist.pickOffer, { itemId: offerId });
    expect(lines(await maya.as.query(api.mystuff.getting, {}))).toEqual([
      ["Strider bike", "Sam chose you. Reply to plan pickup.", true, false],
    ]);
  });

  test("each person sees only their own stuff", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await post(t, ellen, [ellen.zipCircle]);
    expect(await maya.as.query(api.mystuff.giving, {})).toEqual([]);
    expect(await maya.as.query(api.mystuff.getting, {})).toEqual([]);
    await expect(t.query(api.mystuff.giving, {})).rejects.toThrow();
  });

  test("a circle shows who started it", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const c = await circle(ellen);
    await invite(ellen, maya, c);
    expect((await maya.as.query(api.communities.get, { communityId: c })).startedBy).toBe("Ellen");
    expect((await ellen.as.query(api.communities.get, { communityId: c })).startedBy).toBe("you");
    expect((await ellen.as.query(api.communities.get, { communityId: ellen.zipCircle })).startedBy).toBeNull();
  });
});
