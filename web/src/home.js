// The domicircles.com home page (/). Ported from the "domicircles.com landing
// page" design canvas (2026-10-25), private-testing version. When Domi is in
// the App Store, swap the invite buttons for the App Store badge.

const ring = (cls) => `<span class="${cls}" aria-hidden="true"><span></span></span>`;
const wordmark = (cls) => `d${ring(cls)}mi`;
const heart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;

const neighbors = [
  ["M", 52, 12, "blush"],
  ["J", 81.4, 29, "bay"],
  ["P", 84, 57.6, "white"],
  ["A", 60.8, 78.8, "blush"],
  ["R", 20, 34.4, "white"],
]
  .map(([i, x, y, tone]) => `<span class="face ${tone}" style="left:${x}%;top:${y}%">${i}</span>`)
  .join("");

const steps = [
  ["fog", `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5" fill="#F2652B" stroke="none"/></svg>`, "Join local circles", "Share with others in your area. Want to share stuff in your building? A group of friends? Collect items for a friend's new baby? Create your own circle and invite others into it."],
  ["blush", `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16v4H4z"/><path d="M6 12v8h12v-8"/><path d="M12 8v12"/><path d="M12 8c-1.5-3-5-3.5-5-1.2C7 8 9 8 12 8z"/><path d="M12 8c1.5-3 5-3.5 5-1.2C17 8 15 8 12 8z"/></svg>`, "Give things away", "Snap a photo and post it to your circles. Neighbors ask for it, you pick who gets it, and you set up pickup in chat."],
  ["fog", heart, "Share a wish", "Need a cup of sugar? Ski clothes for a weekend trip? Post a wish, and a neighbor can offer it to you."],
]
  .map(
    ([tone, icon, title, text], n) => `<li class="step ${tone}">
<div class="step-top"><span class="step-icon">${icon}</span><span class="step-num">0${n + 1}</span></div>
<h3>${title}</h3><p>${text}</p></li>`,
  )
  .join("");

const point = (title, text) => `<div class="point"><p class="point-title">${title}</p><p>${text}</p></div>`;

export const homeHtml = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Domi: good things find a new home nearby</title>
<meta name="description" content="Domi is a free app for exchanging things locally. Post what you don't need, ask for what you don't have, and connect to your village.">
<meta property="og:site_name" content="Domi">
<meta property="og:title" content="Domi: good things find a new home nearby">
<meta property="og:description" content="A free app for exchanging things locally, in circles you choose.">
<meta property="og:url" content="https://domicircles.com/">
<meta property="og:image" content="https://domicircles.com/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Domi: good things find a new home nearby. Free things, from neighbors.">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;800&family=Fraunces:ital,wght@1,400;1,600&display=swap" rel="stylesheet">
<style>
:root{--bay:#1F4E79;--bay-dark:#163A5C;--poppy:#F2652B;--blush:#FDE8DE;--fog:#EAF0F4;--ink:#18222E;--soft:#4C5866;--line:#DDE4EA}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 Figtree,system-ui,sans-serif}
a{color:var(--bay)}a:hover{color:var(--bay-dark)}
h1,h2,h3,p,ul,ol{margin:0}
.serif{font-family:Fraunces,Georgia,serif;font-style:italic}
.wrap{width:100%;max-width:1200px;margin:0 auto;padding-left:24px;padding-right:24px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:56px}
.col{flex:1 1 420px;min-width:0;display:flex;flex-direction:column}
h1,h2{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600}
h2{font-size:clamp(32px,3.6vw,44px);line-height:1.1}
.lead{font-size:18px;color:var(--soft);max-width:500px}
.button{display:inline-flex;align-items:center;min-height:44px;background:var(--bay);color:#fff;text-decoration:none;font-weight:600;border-radius:14px}
.button:hover{color:#fff;background:var(--bay-dark)}
.link{color:var(--bay);text-decoration:none;font-weight:600;font-size:17px;padding:16px 8px}

/* header */
header.wrap{padding-top:24px;padding-bottom:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}
.logo{display:inline-block;font-weight:800;font-size:28px;line-height:1;color:var(--bay);text-decoration:none;letter-spacing:-.5px;white-space:nowrap}
/* The "o" mark, sized to Figtree ExtraBold's own o: 0.54em tall, sitting just below the baseline like a round letter. */
.ring{display:inline-block;position:relative;vertical-align:-.02em;width:.54em;height:.54em;border:.115em solid currentColor;border-radius:50%;margin:0 .02em}
.ring span{position:absolute;inset:0;margin:auto;width:.15em;height:.15em;border-radius:50%;background:var(--poppy)}
.chip-ring{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:2.5px solid #fff;border-radius:50%}
.chip-ring span{width:4px;height:4px;border-radius:50%;background:var(--poppy)}
nav.main{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;font-weight:500;font-size:15px}
nav.main a:not(.button){color:var(--ink);text-decoration:none}
nav.main .button{padding:11px 18px}

/* hero */
.hero{padding-top:48px;padding-bottom:96px}
.hero .col{gap:24px}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-weight:600;font-size:14px;letter-spacing:.4px;color:var(--bay)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--poppy);flex:none}
h1{font-size:clamp(44px,5.4vw,72px);line-height:1.05;letter-spacing:-1px}
.hero-text{font-size:19px;line-height:1.55;color:var(--soft);max-width:520px}
.hero-text b{color:var(--ink);font-weight:600}
.ctas{display:flex;flex-direction:column;gap:14px;padding-top:8px}
.cta-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.cta-row .button{font-size:17px;padding:16px 24px}
.note{font-family:Fraunces,Georgia,serif;font-style:italic;color:var(--soft)}
.art-col{flex:1 1 420px;min-width:0;display:flex;justify-content:center}
.art{position:relative;width:100%;max-width:540px;aspect-ratio:1/1;background:var(--fog);border-radius:32px;overflow:hidden}
.orbit{position:absolute;left:18%;top:12%;width:68%;height:68%;border:2px solid #D3DDE5;border-radius:50%}
.you{position:absolute;left:52%;top:46%;width:20%;height:20%;transform:translate(-50%,-50%);background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(31,78,121,.12)}
.you span{width:58%;height:58%;border:9px solid var(--bay);border-radius:50%;display:flex;align-items:center;justify-content:center}
.you span::after{content:"";width:34%;height:34%;border-radius:50%;background:var(--poppy)}
.face{position:absolute;width:54px;height:54px;transform:translate(-50%,-50%);border-radius:50%;font-weight:600;font-size:19px;display:flex;align-items:center;justify-content:center}
.face.blush{background:var(--blush);color:var(--ink)}.face.bay{background:var(--bay);color:#fff}.face.white{background:#fff;color:var(--bay)}
.wish{position:absolute;left:6%;top:7%;background:#fff;border-radius:999px;padding:8px 14px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(24,34,46,.06)}
svg{fill:none;stroke:var(--bay);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.wish svg{width:16px;height:16px;stroke-width:2}
.card{position:absolute;left:4%;bottom:4%;width:40%;background:#fff;border-radius:16px;padding:8px;box-shadow:0 10px 32px rgba(24,34,46,.10);display:flex;flex-direction:column;gap:8px}
.card-photo{position:relative;aspect-ratio:4/3;background:var(--blush);border-radius:12px;display:flex;align-items:center;justify-content:center}
.card-photo svg{width:46%;height:70%;stroke-width:3}
.free{position:absolute;left:8px;top:8px;background:#fff;border-radius:999px;padding:3px 10px 3px 8px;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px}
.card-text{padding:0 4px 4px;display:flex;flex-direction:column;gap:2px}
.card-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;line-height:1.25}
.card-meta{font-size:12.5px;color:var(--soft)}

/* how it works */
.how{padding-top:24px;padding-bottom:104px;display:flex;flex-direction:column;gap:40px}
.how .sub{font-family:Fraunces,Georgia,serif;font-style:italic;font-size:19px;color:var(--soft);margin-top:8px}
.steps{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.step{border-radius:24px;padding:28px;display:flex;flex-direction:column;gap:14px}
.step.fog{background:var(--fog)}.step.blush{background:var(--blush)}
.step-top{display:flex;align-items:center;justify-content:space-between}
.step-icon{width:52px;height:52px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
.step-icon svg{width:26px;height:26px}
.step-num{font-weight:600;font-size:14px;color:var(--soft)}
.step h3{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:24px;line-height:1.2}
.step p{color:var(--soft)}

/* giving and getting */
.both{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.both .wrap{padding-top:88px;padding-bottom:88px;display:flex;flex-wrap:wrap;gap:48px}
.both h2{flex:1 1 320px;min-width:0;max-width:360px}
.sides{flex:2 1 560px;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:40px 48px}
.side{display:flex;flex-direction:column;gap:24px}
.side h3{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;letter-spacing:.6px;text-transform:uppercase;color:var(--bay)}
.side h3 .dot{width:10px;height:10px}
.side h3 .hollow{width:12px;height:12px;border:2.5px solid var(--bay);border-radius:50%}
.point{display:flex;flex-direction:column;gap:6px}
.point p{color:var(--soft)}.point .point-title{color:var(--ink);font-weight:600;font-size:18px}

/* circles */
.circles{padding-top:104px;padding-bottom:104px}
.circles .col{gap:20px}
.chips{list-style:none;padding:4px 0 0;display:flex;flex-wrap:wrap;gap:10px}
.chips li{background:var(--fog);border-radius:999px;padding:9px 16px;font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.chips li.on{background:var(--bay);color:#fff}
.invite-col{flex:1 1 380px;min-width:0;display:flex;justify-content:center}
.invite{width:100%;max-width:440px;background:var(--blush);border-radius:24px;padding:32px 28px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.faces{display:flex}
.faces span{width:48px;height:48px;border-radius:50%;font-weight:600;font-size:18px;display:flex;align-items:center;justify-content:center;border:3px solid var(--blush)}
.faces span+span{margin-left:-12px}
.invite-title{font-family:Fraunces,Georgia,serif;font-style:italic;font-weight:600;font-size:24px;line-height:1.25}
.invite-meta{font-size:14px;color:var(--soft)}
.code-box{width:100%;background:#fff;border-radius:14px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}
.code{font-weight:800;font-size:22px;letter-spacing:2px;color:var(--bay)}
.code-label{font-weight:600;font-size:14px;color:var(--soft)}

/* closing band */
.closing{padding-bottom:88px}
.band{background:var(--bay);color:#fff;border-radius:32px;padding:clamp(40px,6vw,72px) clamp(24px,5vw,72px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:32px}
.band div{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:12px}
.band h2{font-size:clamp(34px,4vw,52px);line-height:1.08}
.band p{font-size:18px;color:#DCE6EF;max-width:520px}
.band .button{background:#fff;color:var(--bay);font-size:17px;padding:16px 24px}
.band .button:hover{background:var(--fog);color:var(--bay)}

/* footer */
footer.wrap{padding-top:32px;padding-bottom:48px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px 32px;font-size:14px;color:var(--soft)}
.foot-left{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.foot-logo{font-weight:800;font-size:20px;line-height:1;color:var(--bay);white-space:nowrap}
footer nav{display:flex;flex-wrap:wrap;gap:8px 24px}
footer nav a{color:var(--soft)}
</style></head>
<body>
<header class="wrap">
<a class="logo" href="/" aria-label="Domi home">${wordmark("ring")}</a>
<nav class="main" aria-label="Main">
<a href="#how">How it works</a>
<a href="#circles">Circles</a>
<a class="button" href="#invite">Get Domi</a>
</nav>
</header>

<main>
<section class="wrap row hero" aria-labelledby="hero-title">
<div class="col">
<p class="eyebrow"><span class="dot"></span>Free things, from neighbors</p>
<h1 id="hero-title">Good things find a new home nearby.</h1>
<p class="hero-text">Help your stuff find its next owner. <b>Domi</b> is a free app for exchanging things locally. Post what you don't need, ask for what you don't have, and connect to your village.</p>
<div class="ctas">
<div class="cta-row"><a class="button" href="#invite">I have an invite</a><a class="link" href="#how">See how it works</a></div>
<p class="note">Domi is in private testing. Circles open by invite.</p>
</div>
</div>
<div class="art-col">
<div class="art" role="img" aria-label="You in the middle of your circle of neighbors, with a free wooden high chair posted">
<div class="orbit"></div>
<div class="you"><span></span></div>
${neighbors}
<div class="wish">${heart}Wish: a kids' bike</div>
<div class="card">
<div class="card-photo">
<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M18 6h24"/><path d="M20 6v30"/><path d="M40 6v30"/><path d="M12 36h36"/><path d="M8 30h12"/><path d="M20 36L10 76"/><path d="M40 36l10 40"/><path d="M15 56h30"/></svg>
<span class="free"><span class="dot"></span>Free</span>
</div>
<div class="card-text"><span class="card-title">Wooden high chair</span><span class="card-meta">Kensington · 3 neighbors asked</span></div>
</div>
</div>
</div>
</section>

<section class="wrap how" id="how" aria-labelledby="how-title">
<div><h2 id="how-title">How Domi works</h2><p class="sub">Three things, all free.</p></div>
<ol class="steps">${steps}</ol>
</section>

<section class="both" aria-labelledby="both-title">
<div class="wrap">
<h2 id="both-title">Easy to give. <br>Nice to get.</h2>
<div class="sides">
<div class="side">
<h3><span class="dot"></span>Giving</h3>
${point("Share with community, not a drop-off bin.", "Pick the person who'll use it next.")}
${point("Streamline neighborhood pickup.", "No comment threads, no trash on your sidewalk.")}
</div>
<div class="side">
<h3><span class="hollow"></span>Getting</h3>
${point("Why buy new?", "Someone nearby has one they're done with.")}
${point("Ask privately, pass it on later.", "When you've outgrown it, it goes to the next neighbor.")}
</div>
</div>
</div>
</section>

<section class="wrap row circles" id="circles" aria-labelledby="circles-title">
<div class="col">
<h2 id="circles-title">Your neighborhood, and the people you choose.</h2>
<p class="lead">Your village isn't just the people who live next door. Organize as many local sharing circles as you want and invite friends in easily with a link.</p>
<ul class="chips" aria-label="Example circles">
<li class="on">${ring("chip-ring")}Kensington</li>
<li>Maya's baby shower</li>
<li>Cedar St. building</li>
<li>Thursday soccer parents</li>
</ul>
</div>
<div class="invite-col">
<div class="invite">
<div class="faces" aria-hidden="true"><span style="background:var(--bay);color:#fff">M</span><span style="background:#fff;color:var(--bay)">J</span><span style="background:var(--fog);color:var(--bay)">A</span></div>
<p class="invite-title">Maya invited you to<br>Maya's baby shower</p>
<p class="invite-meta">14 people · a circle on Domi</p>
<div class="code-box"><span class="code">K7Q2-M9</span><span class="code-label">Invite code</span></div>
</div>
</div>
</section>

<section class="wrap closing" id="invite" aria-labelledby="invite-title">
<div class="band">
<div>
<h2 id="invite-title">Outgrown, not outrun.</h2>
<p>Domi is in private testing. Got an invite link from a neighbor? Open it on your phone to join their circle.</p>
</div>
<a class="button" href="mailto:support@domicircles.com?subject=Domi%20invite">Ask for an invite</a>
</div>
</section>
</main>

<footer class="wrap">
<div class="foot-left"><span class="foot-logo">${wordmark("ring")}</span><span>© 2026 Domi. Free things, close to home.</span></div>
<nav aria-label="Footer"><a href="/support">Help</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@domicircles.com">support@domicircles.com</a></nav>
</footer>
</body></html>`;
