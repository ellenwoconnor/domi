import { describe, expect, test } from "vitest";
import { chatRows, dayLabel } from "./rows";

const MIN = 60 * 1000;
const now = new Date(2026, 9, 24, 12, 0).getTime();
const yesterday = new Date(2026, 9, 23, 19, 42).getTime();

describe("chat rows", () => {
  test("day separators, and one time per group of messages", () => {
    const rows = chatRows(
      [
        { id: "a", body: "Hi", mine: true, at: yesterday },
        { id: "b", body: "Thanks!", mine: false, at: yesterday + 20 * MIN },
        { id: "c", body: "Thursday at 6?", mine: false, at: yesterday + 21 * MIN },
        { id: "d", body: "Perfect", mine: true, at: now - 5 * MIN },
      ],
      now,
    );
    expect(rows.map((r) => (r.kind === "day" ? r.label : `${r.key}:${r.firstInGroup ? "F" : ""}${r.lastInGroup ? "L" : ""}`))).toEqual([
      "Yesterday",
      "a:FL",
      "b:F",
      "c:L",
      "Today",
      "d:FL",
    ]);
  });

  test("older days show the date", () => {
    expect(dayLabel(new Date(2026, 9, 20).getTime(), now)).not.toMatch(/Today|Yesterday/);
  });
});
