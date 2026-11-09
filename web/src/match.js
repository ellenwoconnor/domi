// Install match: lets Domi find the invite (or shared listing) a new person
// tapped before they had the app, so they don't have to carry a code across.
//
// - POST /m {kind, code}: sent by an invite or listing page when someone taps
//   Get TestFlight, Get Domi or the open-in-Domi button. If the code is real,
//   it's kept for an hour under a salted SHA-256 hash of the visitor's IP
//   address (the address itself is never stored).
// - GET /m: asked by the app on its sign-in screen. A hit for the same
//   network returns the code once and forgets it. The app then asks the person
//   "Is that you?" before using it, since people on one Wi-Fi share an address.
//
// Needs the MATCHES KV binding (wrangler.toml); without it both do nothing.
// MATCH_SALT (a Worker secret) is optional but keeps hashes from being
// guessable from a list of IP addresses.

const TTL_SECONDS = 3600;
const CODE = /^[0-9A-Z]{8}$/;

export async function rememberCode(request, env, lookup) {
  const done = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (!env.MATCHES) return done;
  const key = await keyFor(request, env);
  if (!key) return done;
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done;
  }
  const kind = body?.kind === "c" || body?.kind === "i" ? body.kind : null;
  const code = typeof body?.code === "string" ? body.code.toUpperCase().replace(/-/g, "") : "";
  if (!kind || !CODE.test(code)) return done;
  // Only codes that work, so the store can't be filled with junk.
  if (!(await lookup(kind, code))) return done;
  await env.MATCHES.put(key, JSON.stringify({ kind, code }), { expirationTtl: TTL_SECONDS });
  return done;
}

export async function matchCode(request, env) {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (!env.MATCHES) return new Response("{}", { headers });
  const key = await keyFor(request, env);
  const hit = key ? await env.MATCHES.get(key) : null;
  if (!hit) return new Response("{}", { headers });
  await env.MATCHES.delete(key);
  return new Response(hit, { headers });
}

async function keyFor(request, env) {
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return null;
  const data = new TextEncoder().encode(`${env.MATCH_SALT ?? "domi-install-match"}|${ip}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return "m:" + Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
