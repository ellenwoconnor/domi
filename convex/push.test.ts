import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { circle, eventsFor, invite, newUser, post, setup, type T, type U } from "./lib/testing.helpers";
import { DAY_MS } from "./lib/validate";
import { matchesWish } from "./lib/wishMatch";

// 10:00am Pacific on a Tuesday.
const MORNING = Date.parse("2026-10-27T17:00:00Z");
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MORNING);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function device(user: U, token = `ExponentPushToken[${user.userId}]`) {
  await user.as.mutation(api.activity.registerPushToken, { token, platform: "ios", timeZone: "America/Los_Angeles" });
  return token;
}

async function claim(t: T) {
  return (await t.mutation(internal.push.claim, {})).messages;
}

async function pushesFor(t: T, user: U) {
  return (await eventsFor(t, user.userId)).filter((e) => e.pushDueAt !== undefined || e.pushResult === "sent");
}

describe("which events push (R1)", () => {
  test("an action event pushes to the recipient's devices; a no-action one doesn't", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const ellenToken = await device(ellen);
    await device(sam);
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const mayaReq = await maya.as.mutation(api.requests.create, { itemId });
    await sam.as.mutation(api.requests.create, { itemId });

    const messages = await claim(t);
    expect(messages.filter((m) => m.to === ellenToken)).toHaveLength(2);
    expect(messages[0]).toMatchObject({ body: "Maya requested your Crib", data: { open: "item", itemId } });

    await ellen.as.mutation(api.items.selectRecipient, { requestId: mayaReq });
    // Maya has no device: logged as no_device. Sam's "pending elsewhere" doesn't push at all.
    expect(await claim(t)).toEqual([]);
    const mayaPicked = (await eventsFor(t, maya.userId)).find((e) => e.type === "picked");
    expect(mayaPicked?.pushResult).toBe("no_device");
    const samPending = (await eventsFor(t, sam.userId)).find((e) => e.type === "pending_elsewhere");
    expect(samPending?.pushDueAt).toBeUndefined();
    expect(samPending?.pushResult).toBeUndefined();
  });

  test("a claimed push is never sent twice", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await device(ellen);
    await maya.as.mutation(api.requests.create, { itemId: await post(t, ellen, [ellen.zipCircle]) });
    expect(await claim(t)).toHaveLength(1);
    expect(await claim(t)).toHaveLength(0);
  });
});

describe("chat pushes merge (R2)", () => {
  async function chat() {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const itemId = await post(t, ellen, [ellen.zipCircle]);
    const requestId = await maya.as.mutation(api.requests.create, { itemId });
    const conversationId = await ellen.as.mutation(api.items.selectRecipient, { requestId });
    await claim(t);
    await device(ellen);
    return { t, ellen, maya, conversationId };
  }

  test("several messages in a row are one push with a count", async () => {
    const { t, ellen, maya, conversationId } = await chat();
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Hi!" });
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Is it still there?" });
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Could come at 5" });
    expect(await pushesFor(t, ellen)).toHaveLength(1);
    const [m] = await claim(t);
    expect(m).toMatchObject({ title: "Maya", body: "3 new messages: Could come at 5", data: { open: "chat", conversationId } });
  });

  test("a message soon after a push waits out the 2 minutes, then covers what's unread", async () => {
    const { t, maya, ellen, conversationId } = await chat();
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Hi!" });
    vi.advanceTimersByTime(1_000);
    expect((await claim(t))[0].body).toBe("Hi!");
    vi.advanceTimersByTime(30_000);
    await maya.as.mutation(api.conversations.send, { conversationId, body: "Still there?" });
    expect(await claim(t)).toEqual([]); // not yet
    vi.advanceTimersByTime(90_000);
    expect((await claim(t))[0].body).toBe("Still there?");

    // Read before the wait is up: no push.
    vi.advanceTimersByTime(10_000);
    await maya.as.mutation(api.conversations.send, { conversationId, body: "ok" });
    await ellen.as.mutation(api.conversations.markRead, { conversationId });
    vi.advanceTimersByTime(3 * 60_000);
    expect(await claim(t)).toEqual([]);
    expect((await eventsFor(t, ellen.userId)).at(-1)?.pushResult).toBe("skipped");
  });
});

describe("sending to Expo (R6)", () => {
  test("flush sends one batch and drops tokens Expo says are dead", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await device(ellen, "ExponentPushToken[old-phone]");
    await device(ellen, "ExponentPushToken[new-phone]");
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const sent = JSON.parse(init.body) as { to: string }[];
      return new Response(
        JSON.stringify({
          data: sent.map((m) =>
            m.to.includes("old")
              ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } }
              : { status: "ok", id: "ticket-1" },
          ),
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    await maya.as.mutation(api.requests.create, { itemId: await post(t, ellen, [ellen.zipCircle]) });
    await t.action(internal.push.flush, {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toHaveLength(2);
    const tokens = await t.run((ctx) => ctx.db.query("pushTokens").collect());
    expect(tokens.map((x) => x.token)).toEqual(["ExponentPushToken[new-phone]"]);
  });

  test("sign-out removes only my token; taps are logged only by the recipient", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const token = await device(ellen);
    await maya.as.mutation(api.activity.unregisterPushToken, { token });
    expect(await t.run((ctx) => ctx.db.query("pushTokens").collect())).toHaveLength(1);
    await ellen.as.mutation(api.activity.unregisterPushToken, { token });
    expect(await t.run((ctx) => ctx.db.query("pushTokens").collect())).toHaveLength(0);

    await maya.as.mutation(api.requests.create, { itemId: await post(t, ellen, [ellen.zipCircle]) });
    const [e] = await eventsFor(t, ellen.userId);
    await maya.as.mutation(api.activity.markOpened, { eventId: e._id });
    expect((await eventsFor(t, ellen.userId))[0].openedAt).toBeUndefined();
    await ellen.as.mutation(api.activity.markOpened, { eventId: e._id });
    expect((await eventsFor(t, ellen.userId))[0]).toMatchObject({ openedAt: MORNING, readAt: MORNING });
  });
});

describe("wish match", () => {
  test("words", () => {
    expect(matchesWish("Bugaboo stroller", "stroller")).toBe(true);
    expect(matchesWish("Stroller", "Jogging strollers")).toBe(true);
    expect(matchesWish("Board games", "Board book")).toBe(false);
    expect(matchesWish("Kids books", "books")).toBe(true);
    expect(matchesWish("Crib", "High chair")).toBe(false);
  });

  test("a new listing that matches pushes to the wisher right away", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const wishlistItemId = await maya.as.mutation(api.wishlist.create, { title: "Stroller", communityIds: [maya.zipCircle] });
    const itemId = await post(t, ellen, [ellen.zipCircle], "Bugaboo stroller");
    await post(t, ellen, [ellen.zipCircle], "Crib");
    const matches = (await eventsFor(t, maya.userId)).filter((e) => e.type === "wish_match");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ itemId, wishlistItemId, body: "Ellen posted Bugaboo stroller", pushDueAt: MORNING });
  });
});

describe("circle activity pushes (R3)", () => {
  async function run(t: T) {
    await t.mutation(internal.circleActivity.processDue, {});
  }
  const activity = async (t: T, u: U) => (await eventsFor(t, u.userId)).filter((e) => e.type === "circle_activity");

  test("new listings in a 3-hour window make one push naming one of them", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    await post(t, ellen, [ellen.zipCircle], "Crib");
    vi.advanceTimersByTime(HOUR);
    await post(t, ellen, [ellen.zipCircle], "Stroller");
    await run(t);
    expect(await activity(t, maya)).toHaveLength(0); // window still open
    vi.advanceTimersByTime(2 * HOUR);
    await run(t);
    const [push] = await activity(t, maya);
    expect(push).toMatchObject({ body: "New from Ellen: Stroller + 1 more", communityId: maya.zipCircle });
    expect(await activity(t, ellen)).toHaveLength(0); // never about your own posts
  });

  test("at most one a day, never at night; then 5 per circle and back-off", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const postAndRun = async (title: string) => {
      await post(t, ellen, [ellen.zipCircle], title);
      vi.advanceTimersByTime(3 * HOUR);
      await run(t);
    };
    await postAndRun("Crib"); // 1pm push
    await postAndRun("Lamp"); // 4pm: already had one today, waits for 8am
    expect(await activity(t, maya)).toHaveLength(1);
    vi.setSystemTime(Date.parse("2026-10-28T15:00:00Z")); // 8am next day
    await run(t);
    expect(await activity(t, maya)).toHaveLength(2);

    // Posted at 7pm: the window ends at 10pm, so it waits for the morning.
    vi.setSystemTime(Date.parse("2026-10-29T02:00:00Z"));
    await postAndRun("Desk");
    expect(await activity(t, maya)).toHaveLength(2);
    vi.setSystemTime(Date.parse("2026-10-29T15:30:00Z"));
    await run(t);
    expect(await activity(t, maya)).toHaveLength(3);

    for (const title of ["Rug", "Bike"]) {
      vi.advanceTimersByTime(DAY_MS);
      await postAndRun(title);
    }
    expect(await activity(t, maya)).toHaveLength(5);
    const zip = await t.run((ctx) =>
      ctx.db.query("memberships").filter((q) => q.eq(q.field("userId"), maya.userId)).first(),
    );
    expect(zip?.welcomePushesSent).toBe(5);

    // Welcome is used up. Maya never opened the app: back-off from signup (3 days have passed).
    vi.advanceTimersByTime(DAY_MS);
    await postAndRun("Chair");
    expect(await activity(t, maya)).toHaveLength(6);
    vi.advanceTimersByTime(DAY_MS);
    await postAndRun("Toys"); // next step is 7 days after signup
    expect(await activity(t, maya)).toHaveLength(6);

    // She opens the app: back-off restarts at 3 days.
    await maya.as.mutation(api.activity.touch, { timeZone: "America/Los_Angeles" });
    vi.advanceTimersByTime(DAY_MS);
    await postAndRun("Books");
    expect(await activity(t, maya)).toHaveLength(6);
  });

  test("seen things, muted circles and blocked people don't count; wishes do", async () => {
    const t = await setup();
    const ellen = await newUser(t, "Ellen");
    const maya = await newUser(t, "Maya");
    const sam = await newUser(t, "Sam");
    const shower = await circle(ellen, "Baby Shower", "🍼");
    await invite(ellen, maya, shower);
    await invite(ellen, sam, shower);
    await maya.as.mutation(api.communities.setMuted, { communityId: maya.zipCircle, muted: true });

    await post(t, ellen, [ellen.zipCircle], "Crib"); // muted circle for Maya
    await post(t, ellen, [shower], "Lamp");
    vi.advanceTimersByTime(HOUR);
    await maya.as.mutation(api.activity.touch, {}); // she saw the lamp
    vi.advanceTimersByTime(3 * HOUR);
    await run(t);
    expect(await activity(t, maya)).toHaveLength(0);

    await maya.as.mutation(api.safety.block, { userId: sam.userId });
    await sam.as.mutation(api.wishlist.create, { title: "Bike", communityIds: [shower] });
    await ellen.as.mutation(api.wishlist.create, { title: "High chair", communityIds: [shower] });
    vi.advanceTimersByTime(3 * HOUR);
    await run(t);
    const [push] = await activity(t, maya);
    expect(push).toMatchObject({ title: "🍼 Baby Shower", body: "Ellen wishes for: High chair. Have one?" });
  });
});
