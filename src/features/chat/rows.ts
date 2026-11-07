// Turns a thread's messages into what the chat screen draws: day separators,
// and groups of messages from the same person close together in time, with
// the time shown once under each group.

export type ChatMessage = { id: string; body: string; mine: boolean; at: number };

export type ChatRow =
  | { kind: "day"; key: string; label: string }
  | { kind: "message"; key: string; message: ChatMessage; firstInGroup: boolean; lastInGroup: boolean; time: string }
  | { kind: "flower"; key: string; at: number };

const GROUP_GAP_MS = 10 * 60 * 1000;

function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function dayLabel(at: number, now = Date.now()) {
  if (sameDay(at, now)) return "Today";
  if (sameDay(at, now - 24 * 60 * 60 * 1000)) return "Yesterday";
  const d = new Date(at);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function timeLabel(at: number) {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function together(a: ChatMessage, b: ChatMessage) {
  return a.mine === b.mine && sameDay(a.at, b.at) && Math.abs(b.at - a.at) < GROUP_GAP_MS;
}

/** Rows oldest first. `flowerAt`: when a domi flower was sent; it sits among the messages by time. */
export function chatRows(messages: ChatMessage[], now = Date.now(), flowerAt?: number): ChatRow[] {
  const rows: ChatRow[] = [];
  let flowerPlaced = flowerAt === undefined;
  messages.forEach((m, i) => {
    if (!flowerPlaced && m.at > flowerAt!) {
      rows.push({ kind: "flower", key: "flower", at: flowerAt! });
      flowerPlaced = true;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !sameDay(prev.at, m.at)) rows.push({ kind: "day", key: `day:${m.id}`, label: dayLabel(m.at, now) });
    rows.push({
      kind: "message",
      key: m.id,
      message: m,
      firstInGroup: !prev || !together(prev, m),
      lastInGroup: !next || !together(m, next),
      time: timeLabel(m.at),
    });
  });
  if (!flowerPlaced) rows.push({ kind: "flower", key: "flower", at: flowerAt! });
  return rows;
}
