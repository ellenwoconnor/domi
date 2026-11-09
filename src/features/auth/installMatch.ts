import { LINK_BASE } from "../../lib/links";

export type InstallMatch = { kind: "invite" | "share"; code: string };

/**
 * Asks domicircles.com whether this network just tapped an invite or listing
 * link there (web/src/match.js). A hit is handed out once, so this is only
 * called on the sign-in screen when no code is saved yet. Never throws.
 */
export async function checkInstallMatch(): Promise<InstallMatch | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${LINK_BASE}/m`, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { kind?: string; code?: string };
    if ((body.kind === "c" || body.kind === "i") && typeof body.code === "string" && /^[0-9A-Z]{8}$/.test(body.code)) {
      return { kind: body.kind === "c" ? "invite" : "share", code: body.code };
    }
  } catch {
    // Offline, slow or no match: the code box at signup is the fallback.
  } finally {
    clearTimeout(timer);
  }
  return null;
}
