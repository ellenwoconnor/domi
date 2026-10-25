// Local clock time for a person, from the phone's time zone (sent with the
// push token and on app open). Used to keep circle activity pushes out of the
// night and to one a day.

const DEFAULT_TZ = "America/Los_Angeles"; // first circles are in the Bay Area

export const QUIET_START_HOUR = 21; // 9pm
export const QUIET_END_HOUR = 8; // 8am

type Who = { timeZone?: string; utcOffsetMinutes?: number };

/** Local date (yyyy-mm-dd) and minutes since local midnight. */
export function localClock(at: number, who: Who): { date: string; minutes: number } {
  const tz = who.timeZone ?? (who.utcOffsetMinutes === undefined ? DEFAULT_TZ : undefined);
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(at));
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
      return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
    } catch {
      // unknown zone or no Intl time zone data: fall through to the offset
    }
  }
  const shifted = new Date(at + (who.utcOffsetMinutes ?? -8 * 60) * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function isQuiet(at: number, who: Who) {
  const { minutes } = localClock(at, who);
  return minutes >= QUIET_START_HOUR * 60 || minutes < QUIET_END_HOUR * 60;
}

/** The next local 8:00am strictly after `at` (today's if it's still early morning). */
export function nextMorning(at: number, who: Who) {
  const { minutes } = localClock(at, who);
  let wait = QUIET_END_HOUR * 60 - minutes;
  if (wait <= 0) wait += 24 * 60;
  return at - (at % 60_000) + wait * 60_000;
}

export function sameLocalDay(a: number, b: number, who: Who) {
  return localClock(a, who).date === localClock(b, who).date;
}
