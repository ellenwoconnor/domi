// domicircles.com: a Cloudflare Worker that
// - serves the files phones check before opening links in the app
//   (/.well-known/apple-app-site-association, /.well-known/assetlinks.json),
// - renders invite pages (/c/<code>) and shared-listing pages (/i/<code>) for
//   people who don't have the app, with link previews for iMessage, WhatsApp
//   and Facebook,
// - serves a shared listing's photo (/p/<code>) from Cloudflare's cache, so
//   page visits and link previews don't each download it from Convex (whose
//   file bandwidth is the paid kind).
// - serves the home page (/, in home.js) and its link-preview image (/og.png),
// - serves the Terms of Service (/terms) and Privacy Policy (/privacy), which
//   the app links to (src/features/legal.ts). Their text is in legal.js.
// - serves the help page and FAQ (/support, text in support.js).
// - serves /beta, which explains the TestFlight test version and how to
//   install it; invite and listing pages show the same steps. The TestFlight
//   public link comes from the TESTFLIGHT_URL var (wrangler.toml).
// Data comes from the public Convex queries invites:preview and shares:preview.

import { homeHtml } from "./home.js";
import { OG_IMAGE_BASE64 } from "./og-image.js";
import { privacyBody, termsBody } from "./legal.js";
import { supportBody } from "./support.js";

const IOS_APP_ID = "8XGZ3GZ28Q.com.ellenwoconnor.domi";
const ANDROID_PACKAGE = "com.ellenwoconnor.domi";
const CODE = /^[0-9A-Za-z-]{4,16}$/;
// Apple's TestFlight app in the App Store (needed before a TestFlight link works).
export const TESTFLIGHT_APP_URL = "https://apps.apple.com/app/testflight/id899247664";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/.well-known/apple-app-site-association" || path === "/apple-app-site-association") {
      return json({
        applinks: {
          details: [{ appIDs: [IOS_APP_ID], components: [{ "/": "/c/*" }, { "/": "/i/*" }] }],
        },
      });
    }
    if (path === "/.well-known/assetlinks.json") {
      const fingerprints = (env.ANDROID_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return json(
        fingerprints.length
          ? [
              {
                relation: ["delegate_permission/common.handle_all_urls"],
                target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
              },
            ]
          : [],
      );
    }

    const [, photoCode] = path.match(/^\/p\/([^/]+)$/) ?? [];
    if (photoCode && CODE.test(photoCode)) return sharePhoto(env, ctx, photoCode.toUpperCase().replace(/-/g, ""));

    const [, kind, code] = path.match(/^\/(c|i)\/([^/]+)$/) ?? [];
    if (kind && CODE.test(code)) {
      const clean = code.toUpperCase().replace(/-/g, "");
      if (kind === "c") {
        const invite = await convexQuery(env, "invites:preview", { code: clean });
        return html(invite ? invitePage(invite, clean, env) : missingPage("This invite link isn't working", "It may have been replaced with a new one. Ask the person who sent it for a fresh link."), invite ? 200 : 404);
      }
      const share = await convexQuery(env, "shares:preview", { code: clean });
      if (!share) return html(missingPage("This link isn't working", "The listing may have been taken down."), 404);
      if (!share.available) return html(missingPage("This one has already found a home", "Things go fast on Domi. Join your neighbors to catch the next one."));
      return html(sharePage(share, clean, url.origin, env));
    }

    if (path === "/") return html(homeHtml);
    if (path === "/beta") return html(betaPage(env));
    if (path === "/og.png") return ogImage();
    if (path === "/terms") return html(legalPage("Terms of Service", "The rules for using Domi.", termsBody));
    if (path === "/support" || path === "/help") return html(legalPage("Help & support", "Answers to common questions about Domi, and how to reach us.", supportBody));
    if (path === "/privacy") return html(legalPage("Privacy Policy", "What Domi collects, who sees it, and how to delete it.", privacyBody));
    return html(missingPage("Page not found", "Nothing lives here."), 404);
  },
};

export const OG_IMAGE_URL = "https://domicircles.com/og.png";

function ogImage() {
  const bytes = Uint8Array.from(atob(OG_IMAGE_BASE64), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
}

export async function convexQuery(env, path, args) {
  if (!env.CONVEX_URL) throw new Error("CONVEX_URL is not set");
  const res = await fetch(`${env.CONVEX_URL.replace(/\/$/, "")}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.status === "success" ? body.value : null;
}

function json(value) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const fmt = (code) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * How to get the test version, kept short: a one-line note, then three steps
 * (TestFlight, Domi through the TestFlight public link in TESTFLIGHT_URL, then
 * back to this link). `join` is the last button's label for invite/share pages.
 */
export function installSteps(env, { openUrl, code, join, askWho = "the person who invited you" } = {}) {
  const link = env?.TESTFLIGHT_URL;
  const getDomi = link
    ? `<p><b>Get Domi.</b> Tap the button, then tap <b>Accept</b> and <b>Install</b>.</p>
        <a class="button" href="${esc(link)}">Get Domi</a>`
    : `<p><b>Get Domi.</b> Ask ${esc(askWho)} to send you the Domi test link.</p>`;
  const last = code
    ? `<li><p><b>Come back to this page</b> and tap the button.</p>
        <a class="button" href="${esc(openUrl)}">${esc(join)}</a>
        <p class="meta">Or type this code in Domi: <b class="code-inline">${esc(fmt(code))}</b>
          <button class="copy" onclick="navigator.clipboard.writeText('${esc(code)}').then(()=>{this.textContent='Copied'})">Copy</button></p></li>`
    : `<li><p><b>Open Domi</b> and sign in with Apple or Google.</p></li>`;
  return `
    <p class="note">Domi isn't in the App Store yet. It's open to friends and family for now, and we'd love to know what you think. Here's how to get it on your iPhone:</p>
    <ol class="steps">
      <li><p><b>Get TestFlight.</b> It's Apple's free app for trying new apps.</p>
        <a class="button secondary" href="${TESTFLIGHT_APP_URL}">Get TestFlight</a></li>
      <li>${getDomi}</li>
      ${last}
    </ol>`;
}

function betaPage(env) {
  return layout({
    title: "You're invited to try Domi",
    desc: "Domi is a free app for giving things away to the people near you. Here's how to get it.",
    body: `
      <p class="intro">You're invited to try <b>Domi</b>, a free app for giving things away to the people near you.</p>
      ${installSteps(env, { askWho: "the person who sent you here" })}`,
  });
}

function invitePage(p, code, env) {
  const title = `${p.invitedBy} invited you to ${p.emoji} ${p.name}`;
  const desc = p.description || `An invite-only circle on Domi, where neighbors give things away for free. ${plural(p.memberCount, "member")}.`;
  return layout({
    title,
    desc,
    body: `
      <p class="intro">${esc(p.invitedBy)} invited you to join <b>${esc(p.name)}</b>, a circle on Domi. Domi is an app for sharing things with the people near you.</p>
      <div class="card">
        <div class="disc">${esc(p.emoji)}</div>
        <h1>${esc(p.name)}</h1>
        ${p.description ? `<p class="caption">${esc(p.description)}</p>` : ""}
        <p class="meta">Invite-only · ${esc(plural(p.memberCount, "member"))}</p>
      </div>
      ${installSteps(env, { openUrl: `domi://c/${code}`, code, join: `Join ${p.name}`, askWho: p.invitedBy })}`,
  });
}

/**
 * The listing's photo, through Cloudflare's cache. Each request still checks
 * the listing is shared and available (one cheap Convex query), so a removed
 * listing's photo stops showing; only the bytes come from the cache.
 */
async function sharePhoto(env, ctx, code) {
  const share = await convexQuery(env, "shares:preview", { code });
  if (!share?.available || !share.photoUrl) {
    return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=60" } });
  }
  const cache = globalThis.caches?.default;
  const key = new Request(share.photoUrl);
  let hit = cache ? await cache.match(key) : undefined;
  if (!hit) {
    const upstream = await fetch(share.photoUrl);
    if (!upstream.ok) return new Response("Not found", { status: 404 });
    hit = new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        "cache-control": "public, max-age=604800", // the photo behind a storage URL never changes
      },
    });
    if (cache) {
      const put = cache.put(key, hit.clone());
      if (ctx?.waitUntil) ctx.waitUntil(put);
      else await put;
    }
  }
  // Browsers and link-preview services may keep it for an hour.
  return new Response(hit.body, {
    headers: { "content-type": hit.headers.get("content-type") ?? "image/jpeg", "cache-control": "public, max-age=3600" },
  });
}

function sharePage(p, code, origin, env) {
  const title = `Free: ${p.title}`;
  const desc = `${p.description}`.slice(0, 200);
  const photo = p.photoUrl ? `${origin}/p/${code}` : null;
  return layout({
    title,
    desc,
    image: photo,
    body: `
      <p class="intro"><b>${esc(p.ownerName)}</b> is giving this away on Domi, an app for sharing things with the people near you.</p>
      <div class="listing">
        ${photo ? `<img class="photo" src="${esc(photo)}" alt="${esc(p.title)}">` : ""}
        <span class="free">Free${p.status === "pending" ? " · pending pickup" : ""}</span>
        <h1>${esc(p.title)}</h1>
        <p class="body">${esc(p.description)}</p>
        <p class="meta">From ${esc(p.ownerName)}${p.circleName ? ` in ${esc(p.circleName)}` : ""}</p>
      </div>
      ${installSteps(env, { openUrl: `domi://i/${code}`, code, join: "See it in Domi", askWho: p.ownerName })}`,
  });
}

function missingPage(heading, text) {
  return layout({ title: heading, desc: text, body: `<div class="card"><h1>${esc(heading)}</h1><p class="caption">${esc(text)}</p></div>` });
}

function legalPage(title, desc, body) {
  return layout({ title, desc, body: `<article class="legal">${body}</article>` });
}


function layout({ title, desc, image, body }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Domi</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:site_name" content="Domi">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image ?? OG_IMAGE_URL)}"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800&family=Fraunces:ital,wght@1,400;1,600&display=swap" rel="stylesheet">
<style>
:root{--bay:#1F4E79;--poppy:#F2652B;--blush:#FDE8DE;--fog:#EAF0F4;--ink:#18222E;--soft:#4C5866;--faint:#86919E}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 Figtree,system-ui,sans-serif}
main{max-width:440px;margin:0 auto;padding:24px 20px 48px;display:flex;flex-direction:column;gap:20px}
.logo{align-self:flex-start;font-weight:800;font-size:24px;line-height:1;color:var(--bay);text-decoration:none;white-space:nowrap}
.logo i{display:inline-block;position:relative;vertical-align:-.02em;width:.54em;height:.54em;border:.115em solid currentColor;border-radius:50%;margin:0 .02em}
.logo i:after{content:"";position:absolute;inset:0;margin:auto;width:.15em;height:.15em;border-radius:50%;background:var(--poppy)}
h1{font-family:Fraunces,serif;font-style:italic;font-weight:600;font-size:34px;line-height:40px;margin:0}
.caption{font-family:Fraunces,serif;font-style:italic;color:var(--soft);margin:0}
.intro{font-size:17px;margin:0}.intro b{font-weight:600}
.meta{font-size:13.5px;color:var(--soft);margin:0}.body{margin:0}
.card{background:var(--blush);border-radius:24px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.disc{width:88px;height:88px;border-radius:50%;background:var(--fog);display:flex;align-items:center;justify-content:center;font-size:44px}
.listing{display:flex;flex-direction:column;gap:12px}.photo{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:16px;background:var(--fog)}
.free{align-self:flex-start;background:var(--poppy);color:var(--ink);font-weight:600;font-size:14px;padding:4px 12px;border-radius:999px}
.button{display:block;text-align:center;background:var(--bay);color:#fff;font-weight:600;font-size:17px;padding:16px;border-radius:14px;text-decoration:none}
.code-box{background:var(--fog);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.code-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.code{font-weight:800;font-size:26px;letter-spacing:2px;color:var(--bay)}
.legal{display:flex;flex-direction:column;gap:12px}.legal h1{font-size:30px;line-height:36px}
.legal h2{font-size:18px;font-weight:600;margin:16px 0 0}.legal p,.legal ul{margin:0}.legal ul{padding-left:20px;display:flex;flex-direction:column;gap:6px}
.legal a,footer a{color:var(--bay)}
footer{font-size:13.5px;color:var(--faint);display:flex;gap:16px;justify-content:center;padding-top:8px}
.contact{background:var(--fog);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px}
.toc{display:flex;flex-wrap:wrap;gap:8px}.toc a{background:var(--fog);color:var(--bay);text-decoration:none;font-size:14px;font-weight:600;padding:6px 12px;border-radius:999px}
.faq{display:flex;flex-direction:column}.faq details{border-bottom:1px solid var(--fog)}
.faq summary{cursor:pointer;font-weight:600;padding:12px 24px 12px 0;list-style:none;position:relative}.faq summary::-webkit-details-marker{display:none}
.faq summary:after{content:"+";position:absolute;right:4px;top:10px;color:var(--bay);font-size:20px;line-height:1.2}.faq details[open] summary:after{content:"\\2212"}
.answer{padding:0 0 14px;display:flex;flex-direction:column;gap:8px;color:var(--soft)}.answer ul{padding-left:20px;margin:0}.legal h2[id]{scroll-margin-top:16px}
.note{margin:0;font-size:17px}
.steps{list-style:none;counter-reset:step;margin:0;padding:0;display:flex;flex-direction:column;gap:22px}
.steps li{counter-increment:step;position:relative;padding-left:44px;display:flex;flex-direction:column;gap:10px}
.steps li p{margin:0;font-size:17px}.steps li p.meta{font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.steps li:before{content:counter(step);position:absolute;left:0;top:-2px;width:32px;height:32px;border-radius:50%;background:var(--bay);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:17px}
.button.secondary{background:var(--fog);color:var(--bay)}
.code-inline{font-weight:800;color:var(--bay);letter-spacing:1px}
.copy{border:0;background:var(--fog);color:var(--bay);font:600 15px Figtree,sans-serif;padding:8px 14px;border-radius:999px}
</style></head>
<body><main><a class="logo" href="/">d<i></i>mi</a>${body}<footer><a href="/support">Help</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></footer></main></body></html>`;
}
