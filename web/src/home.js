// The domicircles.com home page (/). From the "Domi homepage: domi-first
// mockup" canvas (2026-11-10), after a persona panel on the beta page: the
// hillside on top, domis first (private groups are what sets Domi apart),
// "Too good to toss", "How Domi works" as a swipe row on phones (three across
// on computers), "No race. No pile-on.", "Made locally, with love", and a
// Get Domi section (#get, also where /beta goes) with the TestFlight steps. When Domi is in the App Store, swap the steps
// for the App Store badge.

import { faviconLink, poppy } from "./poppy.js";
import { installSteps, STEPS_CSS } from "./install.js";

// The domi flower (the app's thank-you poppy, src/features/thanks/thanksPaths.ts), for the hillside.
const FLOWER = `<g id="flower">
<path d="M95.68,174.17 C59.72,208.9 45.33,284.17 52.52,300" stroke="#1F4E79" stroke-width="7" stroke-linecap="round" fill="none"/>
<path fill="#F2652B" stroke="#fff" stroke-width="5" d="M100,170C140.52,146.1 150.2,94.19 136.07,67.93C123.75,56.5 100.36,54.04 85.94,62.66C66.66,85.41 65.33,138.2 100,170Z"/>
<path fill="#F2652B" stroke="#fff" stroke-width="5" d="M100,170C151.55,170.17 194.8,125.48 199.98,91.92C196.83,73.77 177.96,57.93 159.53,57.98C127.38,68.91 90.88,119.27 100,170Z"/>
<path fill="#F2652B" stroke="#fff" stroke-width="5" d="M100,170C138.25,199.42 193.99,189.85 215.55,167.16C222.77,151.51 217.08,128.69 203.35,118.26C173.67,108.35 119.96,126.07 100,170Z"/>
<path fill="#1F4E79" d="M109.7,181.48C107.32,183.79 100.72,180.82 94.96,174.86C89.21,168.9 86.48,162.21 88.86,159.9C91.24,157.6 97.84,160.57 103.6,166.53C109.35,172.49 112.08,179.18 109.7,181.48Z"/></g>`;
const plant = (x, y, r, s) => `<use href="#flower" transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-52.5 -300)"/>`;

const hillside = `<svg class="hill" viewBox="0 140 390 190" role="img" aria-label="Domi flowers growing on a hillside below a few houses">
<defs>${FLOWER}</defs>
<g fill="none" stroke="#1F4E79" stroke-width="2" stroke-linejoin="round">
<path d="M232 168 v-14 l10 -9 l10 9 v14 z"/><path d="M258 168 v-18 l12 -10 l12 10 v18 z"/><path d="M288 168 v-12 l8 -7 l8 7 v12 z"/></g>
<path d="M0 190 C 90 140, 180 178, 240 168 S 350 150, 390 160 V 330 H 0 Z" fill="#D6E2EB"/>
${plant(64, 182, -16, 0.17)}${plant(150, 178, -22, 0.15)}${plant(196, 202, -18, 0.22)}
<path d="M0 250 C 100 214, 200 240, 280 228 S 360 220, 390 224 V 330 H 0 Z" fill="#fff"/>
${plant(300, 300, -14, 0.46)}${plant(360, 296, -24, 0.36)}</svg>`;

const domiRow = (emoji, tone, name, count, last = false) =>
  `<div class="mini-row${last ? "" : " rule"}"><span class="mini-badge ${tone}">${emoji}</span><span class="mini-name">${name}</span><span class="mini-count">${count}</span></div>`;

const cards = [
  [
    "fog",
    `<div class="mini mini-list">${domiRow("🌱", "blush", "Hopkins St. gardeners", "23 people")}${domiRow("🏢", "blush", "Cedar St. building", "9 people")}${domiRow("📍", "fog", "Kensington", "212 neighbors", true)}</div>`,
    "Start a domi",
    "Name it, send the link to your people, and share with just them. Your neighborhood is always there too.",
  ],
  [
    "fog",
    `<div class="mini mini-listing"><div class="mini-photo"><span class="free">Free</span></div><p class="mini-title">Cordless drill</p><p class="mini-meta">Cedar St. building · 2 asked</p></div>`,
    "Give things away",
    "Snap a photo. People ask privately, you pick who gets it, and you set up pickup in one chat.",
  ],
  [
    "fog",
    `<div class="mini mini-wish"><p class="mini-title">Moving boxes</p><p class="mini-meta">About 20, by Saturday</p><div class="mini-foot"><span class="mini-meta">Jordan</span><span class="have"><span class="dot"></span>I have this</span></div></div>`,
    "Share a wish",
    "Furnishing a new place? Ski clothes for one trip? Post a wish, and someone can offer it to you.",
  ],
]
  .map(
    ([tone, picture, title, text], n) => `<li class="how-card ${tone}">
<div class="how-pic" aria-hidden="true">${picture}</div>
<div class="how-text"><span class="how-num">0${n + 1}</span><h3>${title}</h3><p>${text}</p></div></li>`,
  )
  .join("");

const examples = [
  ["Your building", "The lobby giveaway, without the lobby."],
  ["Your kid's class", "Share stuff with other parents, or their teachers."],
  ["Your church", "Keep the coat drive going all year long."],
  ["Move-out week", "The couch goes to the next tenant, not the curb."],
  ["Your crew", "Camping gear, tools, the ski jacket for one trip."],
  ["Family", "The cousin hand-me-down chain, organized."],
]
  .map(([name, text]) => `<li><span class="ex-name">${name}</span><p>${text}</p></li>`)
  .join("");

const point = (title, text) => `<div class="point"><p class="point-title">${title}</p><p>${text}</p></div>`;

export function homeHtml(env) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Domi: good things find a new home nearby</title>
<meta name="description" content="Domi is a free app for passing things on to your people: your building, your kid's class, your family, and your neighborhood.">
<meta property="og:site_name" content="Domi">
<meta property="og:title" content="Domi: good things find a new home nearby">
<meta property="og:description" content="A free app for giving and getting things nearby, with your neighbors and the people you choose.">
<meta property="og:url" content="https://domicircles.com/">
<meta property="og:image" content="https://domicircles.com/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Domi: good things find a new home nearby. Free things, from neighbors.">
<meta name="twitter:card" content="summary_large_image">
${faviconLink}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Fraunces:ital,wght@1,400;1,600&display=swap" rel="stylesheet">
<style>
:root{--bay:#1F4E79;--bay-dark:#163A5C;--poppy:#F2652B;--blush:#FDE8DE;--fog:#EAF0F4;--ink:#18222E;--soft:#4C5866;--line:#DDE4EA}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 Figtree,system-ui,sans-serif}
a{color:var(--bay)}a:hover{color:var(--bay-dark)}
h1,h2,h3,p,ul,ol{margin:0}
.serif,h1,h2,h3{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
.top{background:var(--fog)}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 0}
.logo{font-weight:800;font-size:24px;line-height:1;color:var(--bay);text-decoration:none;white-space:nowrap}
.logo .poppy{display:inline-block;width:1.2em;height:1.2em;vertical-align:-.25em;margin-right:.16em}
nav{display:flex;align-items:center;gap:24px;font-weight:500;font-size:15px}
nav .text{display:none;color:var(--ink);text-decoration:none}
.pill{display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:12px;background:var(--bay);color:#fff;font-weight:600;text-decoration:none}
.pill:hover{color:#fff;background:var(--bay-dark)}
.hero{display:flex;flex-direction:column}
.hill{display:block;width:calc(100% + 40px);margin:0 -20px;height:auto}
.hero-text{display:flex;flex-direction:column;gap:18px;padding:8px 20px 4px;margin:0 -20px;background:#fff}
.eyebrow{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;color:var(--bay)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--poppy);flex:none}
h1{font-size:clamp(40px,6vw,64px);line-height:1.08;letter-spacing:-.5px}
.lead{font-size:18px;line-height:1.5;color:var(--soft);max-width:540px}.lead b{color:var(--ink);font-weight:600}
.cta{display:flex;align-items:center;justify-content:center;min-height:56px;border-radius:14px;background:var(--bay);color:#fff;font-weight:600;font-size:17px;text-decoration:none}
.cta:hover{color:#fff;background:var(--bay-dark)}
.cta-sub{display:flex;flex-direction:column;align-items:center;gap:6px}
.cta-sub a{font-weight:600;text-decoration:none;padding:4px}
.note{font-size:14px;line-height:1.5;color:var(--soft);text-align:center}
section{padding-top:56px}
h2{font-size:clamp(30px,4vw,40px);line-height:1.15}
.sub{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:17px;color:var(--soft);margin-top:4px}
.how-row{list-style:none;padding:0 20px 4px;margin:16px -20px 0;display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 20px;scrollbar-width:none}
.how-row::-webkit-scrollbar{display:none}
.how-card{flex:none;width:min(300px,82vw);scroll-snap-align:start;border-radius:24px;overflow:hidden;display:flex;flex-direction:column}
.how-card.fog{background:var(--fog)}.how-card.blush{background:var(--blush)}
.how-pic{height:150px;display:flex;align-items:center;justify-content:center}
.how-text{padding:0 22px 24px;display:flex;flex-direction:column;gap:6px}
.how-num{font-size:13px;font-weight:700;letter-spacing:1px;color:var(--bay)}
.how-text h3{font-family:Figtree,system-ui,sans-serif;font-style:normal;font-weight:700;font-size:21px}.how-text p{font-size:16px;line-height:1.5;color:var(--soft)}
.dots{display:flex;justify-content:center;gap:8px;margin-top:12px}.dots span{width:8px;height:8px;border-radius:4px;background:var(--line)}.dots span:first-child{width:20px;background:var(--bay)}
.mini{background:#fff;border-radius:16px}
.mini-list{width:262px;padding:6px 12px}
.mini-row{display:flex;align-items:center;gap:9px;height:38px}.mini-row.rule{border-bottom:1px solid var(--fog)}
.mini-badge{width:24px;height:24px;border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center}.mini-badge.fog{background:var(--fog)}.mini-badge.blush{background:var(--blush)}
.mini-name{flex:1;font-weight:600;font-size:13px}.mini-count{font-size:11px;color:var(--soft)}
.mini-listing{width:160px;padding:10px;display:flex;flex-direction:column;gap:6px;transform:rotate(-2deg)}
.mini-photo{height:70px;border-radius:10px;background:var(--fog);position:relative}
.free{position:absolute;left:6px;top:6px;height:20px;padding:0 8px;border-radius:999px;background:var(--poppy);font-weight:700;font-size:11px;display:flex;align-items:center}
.mini-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:15px}
.mini-meta{font-size:11px;line-height:1.35;color:var(--soft)}
.mini-wish{width:180px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;transform:rotate(1.5deg)}
.mini-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.have{height:24px;padding:0 9px;border-radius:999px;background:var(--fog);color:var(--bay);font-weight:600;font-size:11px;display:flex;align-items:center;gap:5px}.have .dot{width:6px;height:6px}
.give-get{display:flex;flex-direction:column;gap:22px}
.points{display:flex;flex-direction:column;gap:14px}
.label{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;letter-spacing:1px;color:var(--bay)}
.ring{width:8px;height:8px;border-radius:50%;border:2px solid var(--bay)}
.point-title{font-weight:600;font-size:17px}.point p:not(.point-title){font-size:15px;color:var(--soft)}
.domis{display:flex;flex-direction:column;gap:18px}
.domis p.lead{font-size:17px}
.invite{background:var(--blush);border-radius:24px;padding:22px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.faces{display:flex}.faces span{width:34px;height:34px;border-radius:50%;border:2px solid var(--blush);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bay);background:#fff}
.faces span+span{margin-left:-8px}.faces .bay{background:var(--bay);color:#fff}.faces .fog{background:var(--fog)}
.invite-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:21px}.invite small{font-size:13px;color:var(--soft)}
.get{margin-top:56px;background:var(--fog);padding:36px 0 40px}
.get-inner{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.get .button.secondary{background:#fff}
.get .timeline .body{padding-bottom:22px}
.trouble{align-self:center;font-weight:600;font-size:15px}
footer{display:flex;flex-wrap:wrap;gap:18px;padding:24px 0 32px;font-size:14px}footer span{color:var(--soft);margin-left:auto}
${STEPS_CSS}
.ctas{display:flex;flex-direction:column;gap:10px}
.cta.outline{background:#fff;color:var(--bay);border:2px solid var(--bay)}.cta.outline:hover{background:var(--fog);color:var(--bay-dark)}
.note{text-align:left}
.examples{list-style:none;padding:0;margin:28px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));column-gap:32px;row-gap:18px}
.examples li{border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:2px}
.ex-name{font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--bay)}
.examples p{font-size:15px;color:var(--soft)}
.toss{display:flex;flex-direction:column;gap:20px}
.toss .lead{font-size:18px}
.thanks{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:20px;padding:16px 18px;max-width:360px}
.thanks .poppy{width:32px;height:32px;flex:none}
.thanks-title{font-weight:600;font-size:15px}.thanks-note{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:15px;color:var(--soft)}
.made{max-width:620px;margin:0 auto;border-top:1px solid var(--line);padding-top:48px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.made .poppy{width:36px;height:36px}
.made h2{font-size:clamp(28px,3.4vw,34px)}
.made p{font-size:17px;color:var(--soft)}
.made .tag{font-family:Fraunces,Georgia,serif;font-style:italic;color:var(--bay)}
@media (min-width:900px){
  .wrap{padding:0 32px}
  header{padding:24px 0}.logo{font-size:28px}nav .text{display:inline}
  .hero{flex-direction:row-reverse;align-items:center;gap:56px;padding:16px 0 64px}
  .hill{flex:1 1 420px;min-width:0;width:auto;margin:0;border-radius:28px}
  .hero-text{flex:1 1 520px;padding:0;margin:0;background:none;gap:20px}
  h1{font-size:clamp(44px,4.4vw,60px)}
  .lead{font-size:19px}
  .cta{align-self:flex-start;padding:0 28px}.cta-sub{align-items:flex-start}.note{text-align:left}
  .ctas{flex-direction:row;gap:12px}
  .toss{flex-direction:row;align-items:center;gap:48px}.toss>div:first-child{flex:1 1 460px}.thanks{flex:0 1 340px}
  section{padding-top:80px}
  .how-row{overflow:visible;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
  .how-card{width:auto}.dots{display:none}
  .give-get{flex-direction:row;gap:48px}.give-get h2{flex:1 1 300px}.points{flex:1 1 260px}
  .domis{flex-direction:row;align-items:center;gap:48px}.domis>div{flex:1 1 420px}.invite{flex:1 1 360px;padding:32px}
}
</style></head>
<body>
<div class="top"><div class="wrap">
<header><a class="logo" href="/" aria-label="Domi home">${poppy("poppy")}domi</a>
<nav><a class="text" href="#domis">Domis</a><a class="text" href="#how">How it works</a><a class="pill" href="#get">Get Domi</a></nav></header>
<div class="hero">${hillside}
<div class="hero-text">
<span class="eyebrow"><span class="dot"></span>Free things, from your people</span>
<h1>Good things find a new home nearby.</h1>
<p class="lead">Start a domi for the people you already share with: your building, your kid's class, your family. Post what you don't need, they ask privately, and you pick who gets it. <b>Your whole neighborhood is there too.</b></p>
<div class="ctas"><a class="cta" href="#get">Get Domi for iPhone</a><a class="cta outline" href="#domis">Start a domi</a></div>
<p class="note">Free. iPhone only while we test.<br>Starting in Berkeley, El Cerrito, Albany and Kensington.</p>
</div></div>
</div></div>

<main class="wrap">
<section id="domis">
<div class="domis">
<div><h2>Your neighborhood, and the people you choose.</h2>
<p class="lead" style="margin-top:16px">A domi is your circle of people. You start in your neighborhood, and you can make private domis for the people you already share with. Invite them with a link in the group chat you already have.</p>
<p class="sub" style="margin-top:12px">Domi is Latin for “at home.”</p></div>
<div class="invite"><div class="faces"><span class="bay">S</span><span>J</span><span class="fog">A</span></div>
<p class="invite-title">Sam invited you to Hopkins St. gardeners</p><small>23 people · invite only</small></div>
</div>
<ul class="examples">${examples}</ul>
</section>

<section class="toss">
<div><h2>Too good to toss.</h2>
<p class="lead" style="margin-top:16px">Bin's full? Missed the return window? Outgrown, but loved? Pass it on to someone nearby, and know where it went.</p></div>
<div class="thanks">${poppy("poppy")}<div><p class="thanks-title">Maya sent you a thank-you.</p><p class="thanks-note">“Ellie hasn't taken the jacket off since Saturday!”</p></div></div>
</section>

<section id="how">
<h2>How Domi works</h2>
<p class="sub">Three things, all free.</p>
<ol class="how-row">${cards}</ol>
<div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
</section>

<section class="give-get">
<h2>No race.<br>No pile-on.</h2>
<div class="points"><span class="label"><span class="dot"></span>WHEN YOU ASK</span>
${point("Checking late isn't too late.", "The giver picks, so it's never first come, first served.")}
${point("Ask privately.", "Your request goes to the giver, not a public thread.")}</div>
<div class="points"><span class="label"><span class="ring"></span>WHEN YOU GIVE</span>
${point("No “is this still available?”", "No pile on the curb, and no trip to the drop-off.")}
${point("Post once, text it to anyone.", "Send a listing to a friend who isn't on Domi yet.")}</div>
</section>

<section>
<div class="made">${poppy("poppy")}
<h2>Made locally, with love.</h2>
<p>Domi is independent and started with a simple idea: neighbors who pass things along end up knowing each other.</p>
<p class="tag">The best part happens offline, not in comment threads.</p></div>
</section>
</main>

<section id="get" class="get"><div class="wrap"><div class="get-inner">
<h2>Get Domi</h2>
${installSteps(env, { pageUrl: "https://domicircles.com", askWho: "the person who sent you here" })}
<a class="trouble" href="/support">Trouble installing?</a>
</div></div></section>

<footer class="wrap"><a href="/support">Help</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><span>© 2026 Domi Circles. Free things, close to home.</span></footer>
</body></html>`;
}
