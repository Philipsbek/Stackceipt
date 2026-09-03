/**
 * Date utilities (see master spec §10.10, §11).
 *
 * Business dates (renewals, notice deadlines, due dates) are calendar-only values
 * stored as PostgreSQL `date` and represented here as 'YYYY-MM-DD' strings.
 * All arithmetic happens on UTC-midnight anchors so it is timezone-drift free.
 * Timezone matters only for (a) deriving "today" in the org's zone and (b) display.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC-midnight Date for a 'YYYY-MM-DD' calendar date. */
function anchor(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function addDays(dateStr: string, days: number): string {
  const d = anchor(dateStr);
  d.setTime(d.getTime() + days * MS_PER_DAY);
  return toISODate(d);
}

/** Whole-day difference `to - from` (positive if `to` is later). */
export function diffDays(fromStr: string, toStr: string): number {
  return Math.round((anchor(toStr).getTime() - anchor(fromStr).getTime()) / MS_PER_DAY);
}

/**
 * Notice deadline = renewal date − notice period (days).
 * The last day on which cancellation notice can be given before auto-renewal.
 */
export function noticeDeadline(
  renewalDate: string | null | undefined,
  noticePeriodDays: number,
): string | null {
  if (!renewalDate || !isValidISODate(renewalDate)) return null;
  return addDays(renewalDate, -Math.max(0, noticePeriodDays));
}

/** Today's calendar date in a given IANA timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fall through to UTC
  }
  return toISODate(now);
}

/** True when `date` falls within [today, today + windowDays] inclusive. */
export function isWithinWindow(
  date: string | null | undefined,
  today: string,
  windowDays: number,
): boolean {
  if (!date || !isValidISODate(date)) return false;
  const delta = diffDays(today, date);
  return delta >= 0 && delta <= windowDays;
}

export function isPast(
  date: string | null | undefined,
  today: string,
): boolean {
  if (!date || !isValidISODate(date)) return false;
  return diffDays(today, date) < 0;
}

/** Days until `date` from `today` (negative = overdue), or null if unknown. */
export function daysUntil(
  date: string | null | undefined,
  today: string,
): number | null {
  if (!date || !isValidISODate(date)) return null;
  return diffDays(today, date);
}

export type Urgency = "overdue" | "urgent" | "soon" | "upcoming" | "none";

/** Bucket a target date by urgency relative to today. */
export function urgencyBucket(
  date: string | null | undefined,
  today: string,
  windowDays: number,
): Urgency {
  const d = daysUntil(date, today);
  if (d === null) return "none";
  if (d < 0) return "overdue";
  if (d <= 14) return "urgent";
  if (d <= 30) return "soon";
  if (d <= windowDays) return "upcoming";
  return "none";
}

/** Format a calendar date for display in the org timezone. */
export function formatDate(
  dateStr: string | null | undefined,
  options?: { timezone?: string; locale?: string; style?: "medium" | "short" | "long" },
): string {
  if (!dateStr || !isValidISODate(dateStr)) return "—";
  const { locale = "en-US", style = "medium" } = options ?? {};
  const dateStyle = style;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeZone: "UTC", // calendar dates render as-is, no zone shift
    }).format(anchor(dateStr));
  } catch {
    return dateStr;
  }
}

/** Format a UTC timestamp for display in the org timezone. */
export function formatDateTime(
  iso: string | null | undefined,
  options?: { timezone?: string; locale?: string },
): string {
  if (!iso) return "—";
  const { timezone = "UTC", locale = "en-US" } = options ?? {};
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/** Relative phrasing like "in 12 days" / "3 days ago" / "today". */
export function relativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
