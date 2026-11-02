// POST /internal/report-alert: Convex (convex/moderation.ts) calls this when
// someone files a report, and we email it to the developer with Cloudflare
// Email Routing's send_email binding (REPORT_EMAIL in wrangler.toml).
//
// Secrets (npx wrangler secret put …):
//   REPORT_ALERT_SECRET  shared with the Convex env var of the same name
//   REPORT_ALERT_TO      where alerts go; must be a verified destination
//                        address in Cloudflare Email Routing
// Sent from alerts@domicircles.com (domicircles.com has Email Routing on).

export const ALERT_FROM = "alerts@domicircles.com";

export async function reportAlert(request, env, EmailMessageClass) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.REPORT_ALERT_SECRET || auth !== `Bearer ${env.REPORT_ALERT_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.REPORT_ALERT_TO || !env.REPORT_EMAIL) return new Response("Email not configured", { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const subject = String(body?.subject ?? "Domi report").slice(0, 200);
  const text = String(body?.text ?? "").slice(0, 20000);

  const EmailMessage = EmailMessageClass ?? (await import("cloudflare:email")).EmailMessage;
  const raw = mime({ from: ALERT_FROM, to: env.REPORT_ALERT_TO, subject, text });
  await env.REPORT_EMAIL.send(new EmailMessage(ALERT_FROM, env.REPORT_ALERT_TO, raw));
  return new Response("Sent");
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

export function mime({ from, to, subject, text }) {
  const body = b64(text).replace(/.{76}/g, "$&\r\n");
  return [
    `From: Domi alerts <${from}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@domicircles.com>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}
