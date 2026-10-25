/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("appConfig", () => {
  test("init seeds welcome_message and get reads it", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.init.default, {});
    const row = await t.query(api.appConfig.get, { key: "welcome_message" });
    expect(row?.value).toBe("Hello from Convex 👋");
  });

  test("init is idempotent", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.init.default, {});
    await t.mutation(internal.init.default, {});
    const rows = await t.run((ctx) => ctx.db.query("appConfig").collect());
    expect(rows).toHaveLength(2);
  });

  test("get returns null for a missing key", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.appConfig.get, { key: "nope" })).toBeNull();
  });

  test("init moves an existing deployment to the current terms version", async () => {
    const t = convexTest(schema, modules);
    await t.run((ctx) => ctx.db.insert("appConfig", { key: "terms_version", value: "2026-10-21" }));
    await t.mutation(internal.init.default, {});
    const terms = await t.query(api.appConfig.get, { key: "terms_version" });
    expect(terms?.value).toBe("2026-10-24");
  });
});
