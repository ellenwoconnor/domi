import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { doc, eventsFor, newUser, photo, setup, type T, type U } from "./lib/testing.helpers";
import type { Id } from "./_generated/dataModel";

async function offer(t: T, u: U, wishId: Id<"wishlistItems">, title = "Stroller") {
  return await u.as.mutation(api.wishlist.offer, {
    wishId,
    title,
    description: "Barely used",
    photos: [await photo(t)],
  });
}

describe("wishes and offers", () => {
  test("offers accumulate privately; the wisher picks one; picked up fulfills the wish", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const jo = await newUser(t, "Jo");
    const wishId = await maya.as.mutation(api.wishlist.create, {
      title: "Stroller",
      communityIds: [maya.zipCircle],
    });
    expect((await sam.as.query(api.wishlist.browse, {})).map((w) => w.title)).toEqual(["Stroller"]);
    await expect(maya.as.mutation(api.wishlist.offer, { wishId, title: "x", description: "y", photos: [await photo(t)] })).rejects.toThrow("own wish");

    const samOffer = await offer(t, sam, wishId, "City stroller");
    const joOffer = await offer(t, jo, wishId, "Jogging stroller");
    await expect(offer(t, sam, wishId)).rejects.toThrow("already offered");
    expect((await eventsFor(t, maya.userId)).map((e) => e.type)).toEqual(["wish_offer", "wish_offer"]);

    // Offers are visible only to the offerer and the wisher, and not in feeds.
    expect((await maya.as.query(api.wishlist.offers, { wishId })).map((o) => o.title).sort()).toEqual([
      "City stroller",
      "Jogging stroller",
    ]);
    await expect(jo.as.query(api.items.get, { itemId: samOffer })).rejects.toThrow("not found");
    await expect(sam.as.query(api.wishlist.offers, { wishId })).rejects.toThrow("not found");
    expect(await maya.as.query(api.items.browse, {})).toEqual([]);
    expect((await maya.as.query(api.wishlist.mine, {}))[0].offerCount).toBe(2);
    expect((await sam.as.query(api.wishlist.browse, {}))[0]).toMatchObject({ offerCount: null, myOfferId: samOffer });

    // Pick one: pending + thread; can't pick a second at the same time.
    const conv = await maya.as.mutation(api.wishlist.pickOffer, { itemId: samOffer });
    expect((await doc(t, samOffer))?.status).toBe("pending");
    expect((await eventsFor(t, sam.userId)).at(-1)?.body).toBe(
      "Maya chose your City stroller! Message Maya to arrange pickup.",
    );
    await expect(maya.as.mutation(api.wishlist.pickOffer, { itemId: joOffer })).rejects.toThrow("already picked");
    await sam.as.mutation(api.conversations.send, { conversationId: conv, body: "Tomorrow?" });

    await sam.as.mutation(api.items.markPickedUp, { itemId: samOffer });
    expect((await doc(t, wishId))?.status).toBe("fulfilled");
    expect((await doc(t, joOffer))?.status).toBe("removed");
    expect((await eventsFor(t, jo.userId)).at(-1)?.body).toBe("Maya's wish was fulfilled. Thanks for offering!");
    expect(await sam.as.query(api.wishlist.browse, {})).toEqual([]);
  });

  test("if the pick falls through, the wisher can pick another offer", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const jo = await newUser(t, "Jo");
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Crib", communityIds: [maya.zipCircle] });
    const samOffer = await offer(t, sam, wishId, "Crib");
    const joOffer = await offer(t, jo, wishId, "Crib");
    await maya.as.mutation(api.wishlist.pickOffer, { itemId: samOffer });
    const [req] = await maya.as.query(api.requests.mine, {});
    await maya.as.mutation(api.requests.withdraw, { requestId: req.id });
    expect((await doc(t, samOffer))?.status).toBe("available");
    expect((await eventsFor(t, sam.userId)).at(-1)?.type).toBe("offer_unpicked");
    await maya.as.mutation(api.wishlist.pickOffer, { itemId: joOffer });
    expect((await doc(t, joOffer))?.status).toBe("pending");
  });

  test("removing a wish removes its offers and tells the offerers", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Crib", communityIds: [maya.zipCircle] });
    const samOffer = await offer(t, sam, wishId, "Crib");
    await maya.as.mutation(api.wishlist.remove, { wishId });
    expect((await doc(t, samOffer))?.status).toBe("removed");
    expect((await eventsFor(t, sam.userId)).at(-1)?.body).toBe("Maya removed the wish.");
  });

  test("wishes outside your circles are invisible", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya", { zip: "94610" });
    const nora = await newUser(t, "Nora", { zip: "94705" });
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Crib", communityIds: [maya.zipCircle] });
    expect(await nora.as.query(api.wishlist.browse, {})).toEqual([]);
    await expect(nora.as.query(api.wishlist.get, { wishId })).rejects.toThrow("not found");
    await expect(offer(t, nora, wishId)).rejects.toThrow("not found");
  });
});
