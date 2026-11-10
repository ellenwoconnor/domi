// "Get Domi" in three steps (TestFlight, Domi through the TestFlight public link
// in TESTFLIGHT_URL, then open or join), shared by the home page's Get Domi
// section and the invite (/c/…) and shared-listing (/i/…) pages. Design: the
// "domicircles.com beta site" canvas, 2026-11-10.

import { esc, fmt } from "./util.js";

// Apple's TestFlight app in the App Store (needed before a TestFlight link works).
export const TESTFLIGHT_APP_URL = "https://apps.apple.com/app/testflight/id899247664";

// The domi:// button does nothing (or Safari says the address is invalid)
// when Domi isn't installed yet. If the page is still in front 1.5 s after the
// tap, show the hint; leaving the page (the app opened) or Safari's "Open in
// Domi?" prompt taking focus cancels it. Inline, since the page has no script file.
const OPEN_APP_JS =
  "var h=document.getElementById('no-app'),t=setTimeout(function(){if(!document.hidden)h.hidden=false},1500)," +
  "c=function(){clearTimeout(t)};window.addEventListener('pagehide',c,{once:true});" +
  "window.addEventListener('blur',c,{once:true});document.addEventListener('visibilitychange',c,{once:true})";

const copyJs = (text, done = "Copied") =>
  `navigator.clipboard.writeText('${esc(text)}').then(()=>{this.textContent='${done}'})`;

/** Styles for installSteps, included by every page that shows them. */
export const STEPS_CSS = `
.get-note{margin:0;font-size:16px;line-height:1.5;color:var(--soft)}
.timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.timeline li{display:flex;gap:14px}
.timeline .rail{display:flex;flex-direction:column;align-items:center}
.timeline .num{width:34px;height:34px;flex:none;border-radius:50%;background:var(--bay);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.timeline .num.last{background:var(--poppy);color:var(--ink)}
.timeline .line{flex:1;width:2px;background:var(--line,#DDE4EA);margin:6px 0}
.timeline .body{flex:1;min-width:0;padding:5px 0 26px;display:flex;flex-direction:column;gap:10px}
.timeline li:last-child .body{padding-bottom:0}
.step-title{margin:0;font-weight:700;font-size:17px}.step-title span{font-weight:400;color:var(--soft);font-size:15px}
.timeline .meta{margin:0;font-size:14px;color:var(--soft)}.timeline .meta b{color:var(--ink)}
.timeline .button{display:flex;align-items:center;justify-content:center;min-height:50px;padding:0 16px;border-radius:14px;background:var(--bay);color:#fff;font-weight:600;font-size:16px;text-decoration:none}
.timeline .button.secondary{background:var(--fog);color:var(--bay)}
.timeline .button.give{background:var(--poppy);color:var(--ink);font-weight:700}
.hint{margin:0;font-size:15px;color:var(--soft);background:var(--fog);border-radius:14px;padding:12px 14px}.hint[hidden]{display:none}
.code-box{background:var(--fog);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px}
.code-title{margin:0;font-weight:700;font-size:16px}
.code-box .meta{margin:0;font-size:14px;line-height:1.5;color:var(--soft)}
.code-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-radius:12px;padding:10px 12px}
.code{font-weight:800;font-size:22px;letter-spacing:2px;color:var(--bay)}
.copy{border:0;background:var(--bay);color:#fff;font:600 15px Figtree,sans-serif;min-height:40px;padding:0 16px;border-radius:999px;cursor:pointer}
.handoff{display:none;background:var(--blush);border-radius:20px;padding:20px;flex-direction:column;gap:10px}
.handoff p{margin:0}.handoff-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:26px;line-height:1.2}
.url-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-radius:12px;padding:10px 12px}
.handoff .meta{font-size:14px;color:var(--soft)}
.url-row .url{font-weight:700;color:var(--bay);word-break:break-all}
/* On a computer, Domi can't be installed here: point to the iPhone, and leave out the phone steps. */
@media (hover:hover) and (pointer:fine){.handoff{display:flex}.get-note,.timeline{display:none}}`;

/**
 * The three steps. With `code` (an invite or share link): every button also
 * remembers the code for install match (POST /m) and copies it, step 3 opens
 * the app at `openUrl`, and with `domiName` an explained invite-code box
 * follows. `pageUrl` is shown to people on a computer, who can only install on
 * an iPhone.
 */
export function installSteps(env, { pageUrl, openUrl, code, kind, join, domiName, askWho = "the person who invited you", handoffTitle = "Open this on your iPhone", handoffText = "Domi is iPhone only for now. Open this page on your iPhone, and it walks you through installing." } = {}) {
  const link = env?.TESTFLIGHT_URL;
  const keep = code ? ` onclick="keepCode()"` : "";
  const script = code
    ? `<script>function keepCode(){try{navigator.sendBeacon("/m",JSON.stringify({kind:"${kind === "i" ? "i" : "c"}",code:"${esc(code)}"}))}catch(e){}try{navigator.clipboard.writeText("${esc(fmt(code))}")}catch(e){}}</script>`
    : "";
  const handoff = pageUrl
    ? `<div class="handoff"><p class="handoff-title">${esc(handoffTitle)}</p>
        <p>${esc(handoffText)}</p>
        <div class="url-row"><span class="url">${esc(pageUrl.replace(/^https:\/\//, ""))}</span><button class="copy" onclick="${copyJs(pageUrl, "Copied")}">Copy link</button></div>
        <p class="meta">Text or email it to yourself, or AirDrop it.</p></div>`
    : "";
  const step2 = link
    ? `<a class="button"${keep} href="${esc(link)}">Get Domi</a>
          <p class="meta">In TestFlight, tap <b>Accept</b>, then <b>Install</b>.</p>`
    : `<p class="meta">Ask ${esc(askWho)} to send you the Domi test link.</p>`;
  const step3 = code
    ? `<p class="step-title">Come back and join</p>
          <a class="button give" onclick="keepCode();${OPEN_APP_JS}" href="${esc(openUrl)}">${esc(join)}</a>
          <p class="hint" id="no-app" role="status" hidden>Nothing happened? You may not have Domi yet. Do steps 1 and 2 first, then come back and tap again.</p>
          <p class="meta">Opens Domi. Sign in, and you're in.</p>`
    : `<p class="step-title">Open Domi and sign in</p>
          <p class="meta">You'll start in your neighborhood. Got an invite link from a friend? Open it on your iPhone instead, so you join their domi too.</p>`;
  const box = code && domiName
    ? `<div class="code-box">
        <p class="code-title">Your invite code for ${esc(domiName)}</p>
        <p class="meta">This code is your ticket into ${esc(domiName)}. Domi usually picks up your invite on its own, but if it asks for a code when you sign up, paste this. Without it you'll still get into Domi, just not into ${esc(domiName)}.</p>
        <div class="code-row"><span class="code">${esc(fmt(code))}</span><button class="copy" onclick="${copyJs(fmt(code))}">Copy</button></div>
        <p class="meta">Already signed up without it? In Domi, go to Domis, then Join with a code.</p>
      </div>`
    : "";
  const rail = (n, last = false) => `<div class="rail"><span class="num${last ? " last" : ""}">${n}</span>${last ? "" : `<span class="line"></span>`}</div>`;
  return `${script}${handoff}
    <p class="get-note">Domi is in testing, so it installs through TestFlight, Apple's free app for trying new apps. About 2 minutes.</p>
    <ol class="timeline">
      <li>${rail(1)}<div class="body">
          <p class="step-title">Get TestFlight <span>· free, from Apple</span></p>
          <a class="button secondary"${keep} href="${TESTFLIGHT_APP_URL}">Open in the App Store</a>
          <p class="meta">Already have it? Skip to step 2.</p></div></li>
      <li>${rail(2)}<div class="body">
          <p class="step-title">Install Domi</p>
          ${step2}</div></li>
      <li>${rail(3, true)}<div class="body">
          ${step3}</div></li>
    </ol>${box}`;
}
