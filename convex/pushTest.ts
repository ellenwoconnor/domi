import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";

// A test notification, for checking delivery by hand. Internal only: run it
// from a terminal, never from the app.
//   npx convex run --prod pushTest:send '{"name": "Ellen"}'
// Sends "Domi test" to every phone registered for people with that display
// name, waits a few seconds, and returns what Expo and Apple said back.

export const tokensFor = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const people = (await ctx.db.query("profiles").collect()).filter(
      (p) => p.displayName.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    const out = [];
    for (const p of people) {
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", p.userId))
        .collect();
      for (const t of tokens) out.push({ person: p.displayName, token: t.token, registered: new Date(t.updatedAt).toISOString() });
    }
    return out;
  },
});

async function expo(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export const send = internalAction({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const tokens: { person: string; token: string; registered: string }[] = await ctx.runQuery(
      internal.pushTest.tokensFor,
      { name },
    );
    if (tokens.length === 0) return `No phones registered for anyone named "${name}".`;
    const sent = await expo(
      "send",
      tokens.map((t) => ({ to: t.token, title: "Domi test", body: "If you see this, notifications work.", sound: "default" })),
    );
    const tickets: any[] = sent.body?.data ?? [];
    const ids = tickets.filter((t) => t?.status === "ok").map((t) => t.id);
    await new Promise((r) => setTimeout(r, 8000)); // let Apple answer
    const receipts = ids.length ? (await expo("getReceipts", { ids })).body?.data ?? {} : {};
    return tokens.map((t, i) => ({
      person: t.person,
      phone: `${t.token.slice(0, 32)}…`,
      registered: t.registered,
      expo: tickets[i] ?? sent,
      apple: tickets[i]?.id ? (receipts[tickets[i].id] ?? "no receipt yet (try again in a minute)") : null,
    }));
  },
});
