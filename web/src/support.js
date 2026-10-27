// Domi's help page, served at /support. The questions and answers live in
// faq.json, which the support agent (support-agent/) reads too, so the page and
// the bot always say the same thing. Edit answers there; this file only lays
// out the page. Keep answers in step with docs/spec.md and the Terms.

import faq from "./faq.json" with { type: "json" };
import { CONTACT_EMAIL } from "./legal.js";

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Plain text from faq.json → HTML: paragraphs, "- " lists, [text](url) links, linked support email. */
function render(text) {
  const inline = (s) =>
    escape(s)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replaceAll(CONTACT_EMAIL, `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`);
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      return lines.every((l) => l.startsWith("- "))
        ? `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`
        : `<p>${inline(block)}</p>`;
    })
    .join("");
}

const mail = `<a href="mailto:${CONTACT_EMAIL}?subject=Domi%20help">${CONTACT_EMAIL}</a>`;

const sections = faq.sections
  .map(
    (s) =>
      `<h2 id="${s.id}">${escape(s.title)}</h2><div class="faq">${s.items
        .map((i) => `<details><summary>${escape(i.q)}</summary><div class="answer">${render(i.a)}</div></details>`)
        .join("")}</div>`,
  )
  .join("\n\n");

const toc = faq.sections.map((s) => `<a href="#${s.id}">${escape(s.title)}</a>`).join("");

export const supportBody = `
<h1>Help &amp; support</h1>
<p class="caption">Answers to common questions, and how to reach a person.</p>

<div class="contact">
  <p><b>Need help?</b> Email ${mail}. We're a small team and usually reply within two days.</p>
  <p class="meta">If someone is in danger, call 911 first. To report a person or listing, use Report in the app. We review reports within 24 hours.</p>
</div>

<nav class="toc" aria-label="Topics">${toc}</nav>

<h2>Domi in a minute</h2>
<p>Domi is a free app for giving things away to people near you. Everyone starts in a <b>home circle</b> for their zip code, and you can start or join <b>invite-only circles</b> with people you choose, like friends, your building or a school group.</p>
<ul>
<li><b>Give.</b> Post something with a photo. Neighbors tap Request, you pick one person, and Domi opens a private chat to plan pickup.</li>
<li><b>Get.</b> Request things posted in your circles, or post a <b>wish</b> for something you need and let neighbors offer one.</li>
<li><b>My stuff.</b> Everything you're giving or getting, with a dot on anything that needs you.</li>
</ul>

${sections}

<div class="contact">
  <p><b>Didn't find your answer?</b> Email ${mail} and a person will get back to you.</p>
</div>
`;
