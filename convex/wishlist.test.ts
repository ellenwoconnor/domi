import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { circle, doc, eventsFor, newUser, photo, setup, type T, type U } from "./lib/testing.helpers";
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
    expect((await sam.as.query(api.wishlist.browse, {}))[0]).toMatchObject({ offerCount: null, myOfferId: samOffer, pending: false });

    // The offerer's listing says which wish it answers; the wisher sees it too.
    expect((await sam.as.query(api.items.get, { itemId: samOffer })).wish).toMatchObject({
      title: "Stroller",
      wisher: { displayName: "Maya" },
    });
    expect((await maya.as.query(api.items.get, { itemId: samOffer })).wish?.id).toBe(wishId);

    // Pick one: pending + thread; can't pick a second at the same time.
    const conv = await maya.as.mutation(api.wishlist.pickOffer, { itemId: samOffer });
    expect((await doc(t, samOffer))?.status).toBe("pending");
    expect((await eventsFor(t, sam.userId)).at(-1)?.body).toBe(
      "Maya chose your City stroller! Message Maya to arrange pickup.",
    );
    await expect(maya.as.mutation(api.wishlist.pickOffer, { itemId: joOffer })).rejects.toThrow("already picked");
    // While pickup is arranged, everyone sees the wish as pending.
    expect((await jo.as.query(api.wishlist.browse, {}))[0].pending).toBe(true);
    expect((await maya.as.query(api.wishlist.get, { wishId })).pending).toBe(true);
    await sam.as.mutation(api.conversations.send, { conversationId: conv, body: "Tomorrow?" });

    await sam.as.mutation(api.items.markPickedUp, { itemId: samOffer });
    expect((await doc(t, wishId))?.status).toBe("fulfilled");
    expect((await doc(t, joOffer))?.status).toBe("removed");
    expect((await eventsFor(t, jo.userId)).at(-1)?.body).toBe("Maya's all set. Thank you for offering!");
    expect((await jo.as.query(api.mystuff.giving, {}))[0]).toMatchObject({
      title: "Jogging stroller",
      status: "Maya's all set. Thanks for offering!",
      ended: true,
    });
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

  test("the offerer un-picks: the offer ends, the wisher is told gently and can pick another", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const jo = await newUser(t, "Jo");
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Cello", communityIds: [maya.zipCircle] });
    const samOffer = await offer(t, sam, wishId, "Cello");
    const joOffer = await offer(t, jo, wishId, "Cello");
    await maya.as.mutation(api.wishlist.pickOffer, { itemId: samOffer });
    await sam.as.mutation(api.items.unpick, { itemId: samOffer });

    expect((await doc(t, samOffer))?.status).toBe("removed");
    expect((await eventsFor(t, maya.userId)).at(-1)).toMatchObject({ type: "unpicked", body: "Sam cancelled this exchange." });
    await expect(maya.as.mutation(api.wishlist.pickOffer, { itemId: samOffer })).rejects.toThrow();
    // Maya still sees the ended offer (closed for her), but it's gone from her wish's offers.
    expect((await maya.as.query(api.items.get, { itemId: samOffer })).myRequest?.status).toBe("cancelled");
    expect((await maya.as.query(api.wishlist.offers, { wishId })).map((o) => o.id)).toEqual([joOffer]);
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
    expect((await eventsFor(t, sam.userId)).at(-1)?.body).toBe("Maya doesn't need one anymore. Thanks for offering.");
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

describe("no thanks to an offer", () => {
  async function wishWithOffers() {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const jun = await newUser(t, "Jun");
    const priya = await newUser(t, "Priya");
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Cup of sugar", communityIds: [maya.zipCircle] });
    const junOffer = await offer(t, jun, wishId, "Half a bag of sugar");
    const priyaOffer = await offer(t, priya, wishId, "Sugar cubes");
    return { t, maya, jun, priya, wishId, junOffer, priyaOffer };
  }

  test("with a note: the offer ends, the offerer gets a push with the note and can't offer again", async () => {
    const { t, maya, jun, priya, wishId, junOffer } = await wishWithOffers();
    await expect(priya.as.mutation(api.wishlist.declineOffer, { itemId: junOffer })).rejects.toThrow("not found");
    await expect(jun.as.mutation(api.wishlist.declineOffer, { itemId: junOffer })).rejects.toThrow("not found");

    await maya.as.mutation(api.wishlist.declineOffer, { itemId: junOffer, note: "  Found some already. Thanks!  " });
    const ended = await doc(t, junOffer);
    expect(ended).toMatchObject({ status: "removed", declineNote: "Found some already. Thanks!" });
    expect(ended?.declinedAt).toBeDefined();
    expect((await maya.as.query(api.wishlist.offers, { wishId })).map((o) => o.title)).toEqual(["Sugar cubes"]);

    const event = (await eventsFor(t, jun.userId)).at(-1);
    expect(event).toMatchObject({ type: "offer_declined", body: "Maya: “Found some already. Thanks!”" });
    expect(event?.pushDueAt).toBeDefined();

    const row = (await jun.as.query(api.mystuff.giving, {})).find((r) => r.itemId === junOffer);
    expect(row).toMatchObject({ status: "Maya: “Found some already. Thanks!”", ended: true, shareAgain: true });
    expect((await jun.as.query(api.items.get, { itemId: junOffer })).offerEnding).toMatchObject({
      who: "Maya",
      note: "Found some already. Thanks!",
    });

    await expect(offer(t, jun, wishId, "Brown sugar")).rejects.toThrow("already offered");
  });

  test("without a note: a quiet event, and the gentle line", async () => {
    const { t, maya, jun, junOffer } = await wishWithOffers();
    await maya.as.mutation(api.wishlist.declineOffer, { itemId: junOffer, note: "   " });
    const event = (await eventsFor(t, jun.userId)).at(-1);
    expect(event).toMatchObject({ type: "offer_declined", body: "Maya's all set. Thanks for offering!" });
    expect(event?.pushDueAt).toBeUndefined();
    expect((await doc(t, junOffer))?.declineNote).toBeUndefined();
  });

  test("a picked offer is withdrawn, not declined; the others read as on hold", async () => {
    const { t, maya, jun, priya, junOffer, priyaOffer } = await wishWithOffers();
    await maya.as.mutation(api.wishlist.pickOffer, { itemId: priyaOffer });
    await expect(maya.as.mutation(api.wishlist.declineOffer, { itemId: priyaOffer })).rejects.toThrow("isn't available");
    expect((await jun.as.query(api.mystuff.giving, {})).find((r) => r.itemId === junOffer)?.status).toBe(
      "Maya's set for now. Yours is ready if plans change.",
    );
    expect((await jun.as.query(api.items.get, { itemId: junOffer })).onHold).toBe(true);
    expect((await priya.as.query(api.items.get, { itemId: priyaOffer })).onHold).toBe(false);
    // Declining a waiting offer still works while another is picked.
    await maya.as.mutation(api.wishlist.declineOffer, { itemId: junOffer });
    expect((await doc(t, junOffer))?.status).toBe("removed");
  });

  test("share with others: the ended offer becomes a public listing and hands over its photos", async () => {
    const { t, maya, jun, priya, junOffer } = await wishWithOffers();
    await expect(
      jun.as.mutation(api.items.create, {
        title: "x",
        description: "",
        photos: [await photo(t)],
        communityIds: [jun.zipCircle],
        fromOfferId: junOffer,
      }),
    ).rejects.toThrow("can't be shared again"); // still a live offer

    await maya.as.mutation(api.wishlist.declineOffer, { itemId: junOffer });
    const old = (await doc(t, junOffer))!;
    await expect(
      priya.as.mutation(api.items.create, {
        title: "x",
        description: "",
        photos: [await photo(t)],
        communityIds: [priya.zipCircle],
        fromOfferId: junOffer,
      }),
    ).rejects.toThrow("not found");

    const itemId = await jun.as.mutation(api.items.create, {
      title: "Half a bag of sugar",
      description: "Unopened",
      photos: old.photos,
      communityIds: [jun.zipCircle],
      fromOfferId: junOffer,
    });
    expect(await doc(t, itemId)).toMatchObject({ status: "available", visibility: "public", photos: old.photos });
    const after = await doc(t, junOffer);
    expect(after?.sharedAgainAt).toBeDefined();
    expect(after?.photosPurgedAt).toBeDefined(); // the photo cleanup leaves the shared photos alone
    expect(await t.run(async (ctx) => await ctx.db.system.get(old.photos[0]))).not.toBeNull();
    // The ended offer's row gives way to the new listing.
    const rows = await jun.as.query(api.mystuff.giving, {});
    expect(rows.some((r) => r.itemId === junOffer)).toBe(false);
    expect(rows.some((r) => r.itemId === itemId)).toBe(true);
    // Only once.
    await expect(
      jun.as.mutation(api.items.create, {
        title: "again",
        description: "",
        photos: [await photo(t)],
        communityIds: [jun.zipCircle],
        fromOfferId: junOffer,
      }),
    ).rejects.toThrow("can't be shared again");
  });

  test("when the wish comes true, other offerers get the gentle line too", async () => {
    const { t, maya, jun, priya, junOffer, priyaOffer } = await wishWithOffers();
    const conv = await maya.as.mutation(api.wishlist.pickOffer, { itemId: priyaOffer });
    expect(conv).toBeDefined();
    await priya.as.mutation(api.items.markPickedUp, { itemId: priyaOffer });
    expect((await eventsFor(t, jun.userId)).at(-1)?.body).toBe("Maya's all set. Thank you for offering!");
    expect((await jun.as.query(api.mystuff.giving, {})).find((r) => r.itemId === junOffer)).toMatchObject({
      status: "Maya's all set. Thanks for offering!",
      shareAgain: true,
    });
  });

  test("the wisher edits words, note and domis while the wish is open; nobody else can", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Stroller", communityIds: [maya.zipCircle] });
    await maya.as.mutation(api.wishlist.update, { wishId, title: "Jogging stroller", description: "Any brand" });
    const w = await sam.as.query(api.wishlist.get, { wishId });
    expect([w.title, w.description]).toEqual(["Jogging stroller", "Any brand"]);
    await maya.as.mutation(api.wishlist.update, { wishId, description: "" });
    expect((await maya.as.query(api.wishlist.get, { wishId })).description).toBeNull();
    await expect(sam.as.mutation(api.wishlist.update, { wishId, title: "Mine now" })).rejects.toThrow("not found");
    await expect(maya.as.mutation(api.wishlist.update, { wishId, title: "  " })).rejects.toThrow();
    await expect(maya.as.mutation(api.wishlist.update, { wishId, communityIds: [] })).rejects.toThrow("Pick who sees it");
    await maya.as.mutation(api.wishlist.remove, { wishId });
    await expect(maya.as.mutation(api.wishlist.update, { wishId, title: "Again" })).rejects.toThrow("can't be edited");
  });

  test("a domi can't be dropped once someone in it has offered; an edit tells nobody", async () => {
    const t = await setup();
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const shower = await circle(maya);
    const wishId = await maya.as.mutation(api.wishlist.create, { title: "Stroller", communityIds: [maya.zipCircle, shower] });
    await offer(t, sam, wishId); // Sam is in the neighborhood, not the domi
    await expect(maya.as.mutation(api.wishlist.update, { wishId, communityIds: [shower] })).rejects.toThrow("someone there has offered");
    await maya.as.mutation(api.wishlist.update, { wishId, communityIds: [maya.zipCircle] });
    expect((await maya.as.query(api.wishlist.get, { wishId })).circles.map((c) => c.id)).toEqual([maya.zipCircle]);
    const before = (await eventsFor(t, sam.userId)).length;
    await maya.as.mutation(api.wishlist.update, { wishId, title: "Double stroller" });
    expect((await eventsFor(t, sam.userId)).length).toBe(before);
    expect((await maya.as.query(api.wishlist.offers, { wishId })).length).toBe(1);
    await expect(maya.as.mutation(api.wishlist.update, { wishId, communityIds: [] })).rejects.toThrow("Pick who sees it");
  });
});
