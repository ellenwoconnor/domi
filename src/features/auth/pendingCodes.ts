import * as SecureStore from "expo-secure-store";

// Invite and share codes the app receives before the person has signed up
// (from a link, or typed). They're redeemed all at once by
// profiles.completeSignup, then cleared. Deep links (M2) call addPendingCode.

export type PendingCodes = { invites: string[]; shares: string[] };

const KEY = "domi.pendingCodes";
const MAX = 10;

export async function getPendingCodes(): Promise<PendingCodes> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PendingCodes>) : {};
    return { invites: parsed.invites ?? [], shares: parsed.shares ?? [] };
  } catch {
    return { invites: [], shares: [] };
  }
}

export async function addPendingCode(kind: "invite" | "share", code: string) {
  const codes = await getPendingCodes();
  const list = kind === "invite" ? codes.invites : codes.shares;
  const clean = code.trim().toUpperCase();
  if (clean && !list.includes(clean)) list.push(clean);
  if (list.length > MAX) list.splice(0, list.length - MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(codes));
}

export async function clearPendingCodes() {
  await SecureStore.deleteItemAsync(KEY);
}
