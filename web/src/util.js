// Small helpers shared by the page modules.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** 7K2MQX9P → 7K2M-QX9P */
export const fmt = (code) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);
