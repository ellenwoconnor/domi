import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { eventsFor, newUser, post, setup } from "./lib/testing.helpers";

describe("listing share links", () => {
  test("Buy Nothing flow: owner shares; a newcomer from another zip signs up with the code and requests", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen", { zip: "94610" });
    const itemId = await post(t, ellen, [ellen.zipCircle], "Crib");
    const code = await ellen.as.mutation(api.shares.getOrCreate, { itemId });
    expect(await ellen.as.mutation(api.shares.getOrCreate, { itemId })).toBe(code); // one link per item

    // Signed-out read-only page.
    const page = await t.query(api.shares.preview, { code });
    expect(page).toMatchObject({ available: true, title: "Crib", ownerName: "Ellen", circleName: "📍 Oakland · 94610" });
    expect(page?.available && page.photoUrl).toBeTruthy();

    const nora = await newUser(t, "Nora", { zip: "94705", shareCodes: [code] });
    expect(nora.signup.shares[0].result).toEqual({ ok: true, itemId });
    expect((await nora.as.query(api.items.get, { itemId })).title).toBe("Crib");
    await nora.as.mutation(api.requests.create, { itemId, note: "Saw this on Buy Nothing!" });
    expect((await eventsFor(t, ellen.userId)).at(-1)?.type).toBe("request_created");
    // It grants that one listing, not the circle.
    const other = await post(t, ellen, [ellen.zipCircle], "Lamp");
    await expect(nora.as.query(api.items.get, { itemId: other })).rejects.toThrow("not found");
  });

  test("only the owner can share; ended listings show as unavailable", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    await expect(maya.as.mutation(api.shares.getOrCreate, { itemId })).rejects.toThrow("not found");
    const code = await ellen.as.mutation(api.shares.getOrCreate, { itemId });
    await ellen.as.mutation(api.items.remove, { itemId });
    expect(await t.query(api.shares.preview, { code })).toEqual({ code, available: false });
    expect(await maya.as.mutation(api.shares.redeem, { code })).toEqual({ ok: false, reason: "unavailable" });
  });

  test("revoked links stop working for new people", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const nora = await newUser(t, "Nora", { zip: "94705" });
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const code = await ellen.as.mutation(api.shares.getOrCreate, { itemId });
    await ellen.as.mutation(api.shares.revoke, { itemId });
    expect(await t.query(api.shares.preview, { code })).toBeNull();
    expect(await nora.as.mutation(api.shares.redeem, { code })).toEqual({ ok: false, reason: "revoked" });
  });
});
