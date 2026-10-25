// Run with: npm run test:web
import assert from "node:assert/strict";
import { test } from "node:test";
import worker, { esc } from "./index.js";

const env = { CONVEX_URL: "https://test.convex.cloud", ANDROID_SHA256: "" };

function mockConvex(values) {
  globalThis.fetch = async (_url, init) => {
    const { path, args } = JSON.parse(init.body);
    const value = values[path]?.(args);
    return new Response(JSON.stringify({ status: "success", value: value ?? null }));
  };
}

const get = (path) => worker.fetch(new Request(`https://domicircles.com${path}`), env);

test("apple-app-site-association lists the app and both link paths", async () => {
  const res = await get("/.well-known/apple-app-site-association");
  assert.equal(res.headers.get("content-type"), "application/json");
  const body = await res.json();
  assert.deepEqual(body.applinks.details[0].appIDs, ["8XGZ3GZ28Q.com.ellenwoconnor.domi"]);
  assert.deepEqual(body.applinks.details[0].components, [{ "/": "/c/*" }, { "/": "/i/*" }]);
});

test("assetlinks is empty until a fingerprint is configured", async () => {
  assert.deepEqual(await (await get("/.well-known/assetlinks.json")).json(), []);
  const res = await worker.fetch(new Request("https://domicircles.com/.well-known/assetlinks.json"), {
    ...env,
    ANDROID_SHA256: "AA:BB",
  });
  assert.equal((await res.json())[0].target.sha256_cert_fingerprints[0], "AA:BB");
});

test("invite page shows the circle, the code, and a link preview", async () => {
  mockConvex({
    "invites:preview": ({ code }) =>
      code === "7K2MQX9P" ? { code, name: "Baby Shower", emoji: "🍼", description: null, memberCount: 12, invitedBy: "Sam" } : null,
  });
  const res = await get("/c/7k2m-qx9p");
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /og:title" content="Sam invited you to 🍼 Baby Shower"/);
  assert.match(html, /7K2M-QX9P/);
  assert.match(html, /domi:\/\/c\/7K2MQX9P/);
  assert.match(html, /12 members/);
  assert.match(html, /Sam invited you to join <b>Baby Shower<\/b>, a circle on Domi\. Domi is an app for sharing things with the people near you\./);
  assert.equal((await get("/c/NOPENOPE")).status, 404);
});

test("shared listing page shows the photo, or 'found a home' once it's gone", async () => {
  mockConvex({
    "shares:preview": ({ code }) =>
      code === "AAAABBBB"
        ? { code, available: true, title: "Crib", description: "Oak", status: "available", photoUrl: "https://x/p.jpg", ownerName: "Ellen", circleName: "📍 Berkeley · 94707", postedAt: 1 }
        : { code, available: false },
  });
  const html = await (await get("/i/AAAABBBB")).text();
  assert.match(html, /og:image" content="https:\/\/domicircles.com\/p\/AAAABBBB"/); // the cached route, not Convex
  assert.ok(!html.includes("https://x/p.jpg"));
  assert.match(html, /Free: Crib/);
  assert.match(html, /<b>Ellen<\/b> is giving this away on Domi/);
  assert.match(await (await get("/i/CCCCDDDD")).text(), /already found a home/);
});

test("user text is escaped", async () => {
  assert.equal(esc(`<script>"x"</script>`), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  mockConvex({
    "invites:preview": ({ code }) => ({ code, name: "<b>x</b>", emoji: "🍼", description: null, memberCount: 1, invitedBy: "<i>" }),
  });
  const html = await (await get("/c/ABCDEFGH")).text();
  assert.ok(!html.includes("<b>x</b>"));
});

test("listing photo is fetched from Convex once, then served from the cache", async () => {
  const stored = new Map();
  globalThis.caches = {
    default: {
      match: async (req) => stored.get(req.url)?.clone(),
      put: async (req, res) => void stored.set(req.url, res),
    },
  };
  let photoFetches = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) === "https://x/p.jpg") {
      photoFetches++;
      return new Response("jpeg", { headers: { "content-type": "image/jpeg" } });
    }
    const { args } = JSON.parse(init.body);
    const value =
      args.code === "AAAABBBB"
        ? { code: "AAAABBBB", available: true, title: "Crib", photoUrl: "https://x/p.jpg" }
        : { code: args.code, available: false };
    return new Response(JSON.stringify({ status: "success", value }));
  };
  for (let i = 0; i < 3; i++) {
    const res = await get("/p/AAAABBBB");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/jpeg");
    assert.equal(await res.text(), "jpeg");
  }
  assert.equal(photoFetches, 1);
  assert.equal((await get("/p/CCCCDDDD")).status, 404); // taken down: no photo
  delete globalThis.caches;
});
