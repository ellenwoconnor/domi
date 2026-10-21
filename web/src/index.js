// domicircles.com: a Cloudflare Worker that
// - serves the files phones check before opening links in the app
//   (/.well-known/apple-app-site-association, /.well-known/assetlinks.json),
// - renders invite pages (/c/<code>) and shared-listing pages (/i/<code>) for
//   people who don't have the app, with link previews for iMessage, WhatsApp
//   and Facebook.
// Data comes from the public Convex queries invites:preview and shares:preview.

const IOS_APP_ID = "8XGZ3GZ28Q.com.ellenwoconnor.domi";
const ANDROID_PACKAGE = "com.ellenwoconnor.domi";
const CODE = /^[0-9A-Za-z-]{4,16}$/;

export default {
  async fetch(request, env) {
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

    const [, kind, code] = path.match(/^\/(c|i)\/([^/]+)$/) ?? [];
    if (kind && CODE.test(code)) {
      const clean = code.toUpperCase().replace(/-/g, "");
      if (kind === "c") {
        const invite = await convexQuery(env, "invites:preview", { code: clean });
        return html(invite ? invitePage(invite, clean) : missingPage("This invite link isn't working", "It may have been replaced with a new one. Ask the person who sent it for a fresh link."), invite ? 200 : 404);
      }
      const share = await convexQuery(env, "shares:preview", { code: clean });
      if (!share) return html(missingPage("This link isn't working", "The listing may have been taken down."), 404);
      if (!share.available) return html(missingPage("This one has already found a home", "Things go fast on Domi. Join your neighbors to catch the next one."));
      return html(sharePage(share, clean));
    }

    if (path === "/") return html(homePage());
    return html(missingPage("Page not found", "Nothing lives here."), 404);
  },
};

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

function getTheApp(openUrl, code) {
  return `
    <a class="button" href="${esc(openUrl)}">Open in Domi</a>
    <div class="code-box">
      <p class="meta">Don't have Domi yet? It's in private testing. Once you're in, enter this code:</p>
      <div class="code-row"><span class="code" id="code">${esc(fmt(code))}</span>
        <button class="copy" onclick="navigator.clipboard.writeText('${esc(code)}').then(()=>{this.textContent='Copied'})">Copy</button>
      </div>
    </div>`;
}

function invitePage(p, code) {
  const title = `${p.invitedBy} invited you to ${p.emoji} ${p.name}`;
  const desc = p.description || `An invite-only circle on Domi, where neighbors give things away for free. ${plural(p.memberCount, "member")}.`;
  return layout({
    title,
    desc,
    body: `
      <div class="card">
        <div class="disc">${esc(p.emoji)}</div>
        <p class="meta">${esc(p.invitedBy)} invited you to</p>
        <h1>${esc(p.name)}</h1>
        ${p.description ? `<p class="caption">${esc(p.description)}</p>` : ""}
        <p class="meta">Invite-only · ${esc(plural(p.memberCount, "member"))}</p>
      </div>
      ${getTheApp(`domi://c/${code}`, code)}`,
  });
}

function sharePage(p, code) {
  const title = `Free: ${p.title}`;
  const desc = `${p.description}`.slice(0, 200);
  return layout({
    title,
    desc,
    image: p.photoUrl,
    body: `
      <div class="listing">
        ${p.photoUrl ? `<img class="photo" src="${esc(p.photoUrl)}" alt="${esc(p.title)}">` : ""}
        <span class="free">Free${p.status === "pending" ? " · pending pickup" : ""}</span>
        <h1>${esc(p.title)}</h1>
        <p class="body">${esc(p.description)}</p>
        <p class="meta">From ${esc(p.ownerName)}${p.circleName ? ` in ${esc(p.circleName)}` : ""}</p>
      </div>
      ${getTheApp(`domi://i/${code}`, code)}`,
  });
}

function missingPage(heading, text) {
  return layout({ title: heading, desc: text, body: `<div class="card"><h1>${esc(heading)}</h1><p class="caption">${esc(text)}</p></div>` });
}

function homePage() {
  return layout({
    title: "Domi: good things, close to home",
    desc: "Give and get secondhand with your neighbors, in circles you choose.",
    body: `<div class="card"><h1>Good things, close to home.</h1><p class="caption">Give and get secondhand with your neighbors. Domi is in private testing.</p></div>`,
  });
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
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800&family=Fraunces:ital,wght@1,400;1,600&display=swap" rel="stylesheet">
<style>
:root{--bay:#1F4E79;--poppy:#F2652B;--blush:#FDE8DE;--fog:#EAF0F4;--ink:#18222E;--soft:#4C5866;--faint:#86919E}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 Figtree,system-ui,sans-serif}
main{max-width:440px;margin:0 auto;padding:24px 20px 48px;display:flex;flex-direction:column;gap:20px}
.logo{font-weight:800;font-size:24px;color:var(--bay);text-decoration:none;display:flex;align-items:flex-end}
.logo i{display:inline-flex;width:14px;height:14px;border:3px solid var(--bay);border-radius:50%;margin:0 1px 4px;align-items:center;justify-content:center}
.logo i:after{content:"";width:4px;height:4px;border-radius:50%;background:var(--poppy)}
h1{font-family:Fraunces,serif;font-style:italic;font-weight:600;font-size:34px;line-height:40px;margin:0}
.caption{font-family:Fraunces,serif;font-style:italic;color:var(--soft);margin:0}
.meta{font-size:13.5px;color:var(--soft);margin:0}.body{margin:0}
.card{background:var(--blush);border-radius:24px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.disc{width:88px;height:88px;border-radius:50%;background:var(--fog);display:flex;align-items:center;justify-content:center;font-size:44px}
.listing{display:flex;flex-direction:column;gap:12px}.photo{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:16px;background:var(--fog)}
.free{align-self:flex-start;background:var(--poppy);color:var(--ink);font-weight:600;font-size:14px;padding:4px 12px;border-radius:999px}
.button{display:block;text-align:center;background:var(--bay);color:#fff;font-weight:600;font-size:17px;padding:16px;border-radius:14px;text-decoration:none}
.code-box{background:var(--fog);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.code-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.code{font-weight:800;font-size:26px;letter-spacing:2px;color:var(--bay)}
.copy{border:0;background:#fff;color:var(--bay);font:600 15px Figtree,sans-serif;padding:8px 14px;border-radius:999px}
</style></head>
<body><main><a class="logo" href="/">d<i></i>mi</a>${body}</main></body></html>`;
}
