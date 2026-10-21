// Public links. The website (web/) serves these paths and the app opens them
// directly when installed (Universal Links / App Links, configured in app.json).

export const LINK_HOST = "domicircles.com";
export const LINK_BASE = `https://${LINK_HOST}`;

/** 7K2MQX9P → 7K2M-QX9P, easier to read aloud and type. */
export function formatCode(code: string) {
  const c = code.toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export const inviteUrl = (code: string) => `${LINK_BASE}/c/${code}`;
export const shareUrl = (code: string) => `${LINK_BASE}/i/${code}`;
