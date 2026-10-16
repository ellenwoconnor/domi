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
    expect(rows).toHaveLength(1);
  });

  test("get returns null for a missing key", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.appConfig.get, { key: "nope" })).toBeNull();
  });
});
