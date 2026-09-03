import { describe, expect, it } from "vitest";
import {
  addDays,
  daysUntil,
  diffDays,
  isValidISODate,
  isWithinWindow,
  noticeDeadline,
  todayInTimezone,
  urgencyBucket,
} from "../dates";

describe("isValidISODate", () => {
  it("accepts valid dates", () => {
    expect(isValidISODate("2026-01-15")).toBe(true);
  });
  it("rejects invalid formats and dates", () => {
    expect(isValidISODate("2026-1-5")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("not-a-date")).toBe(false);
  });
});

describe("addDays / diffDays", () => {
  it("adds and subtracts days across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("crosses year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("diffDays is directional", () => {
    expect(diffDays("2026-01-01", "2026-01-10")).toBe(9);
    expect(diffDays("2026-01-10", "2026-01-01")).toBe(-9);
  });
  it("handles leap year (2028)", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("noticeDeadline", () => {
  it("subtracts the notice period from the renewal date", () => {
    expect(noticeDeadline("2026-06-01", 30)).toBe("2026-05-02");
  });
  it("returns null for missing/invalid renewal", () => {
    expect(noticeDeadline(null, 30)).toBeNull();
    expect(noticeDeadline("bad", 30)).toBeNull();
  });
});

describe("isWithinWindow / daysUntil", () => {
  const today = "2026-03-01";
  it("detects a date inside the window", () => {
    expect(isWithinWindow("2026-03-20", today, 30)).toBe(true);
  });
  it("excludes past and beyond-window dates", () => {
    expect(isWithinWindow("2026-02-01", today, 30)).toBe(false);
    expect(isWithinWindow("2026-05-01", today, 30)).toBe(false);
  });
  it("daysUntil is negative when overdue", () => {
    expect(daysUntil("2026-02-25", today)).toBe(-4);
  });
});

describe("urgencyBucket", () => {
  const today = "2026-03-01";
  it("buckets by proximity", () => {
    expect(urgencyBucket("2026-02-20", today, 90)).toBe("overdue");
    expect(urgencyBucket("2026-03-10", today, 90)).toBe("urgent");
    expect(urgencyBucket("2026-03-25", today, 90)).toBe("soon");
    expect(urgencyBucket("2026-05-01", today, 90)).toBe("upcoming");
    expect(urgencyBucket("2026-12-01", today, 90)).toBe("none");
  });
});

describe("todayInTimezone", () => {
  it("rolls the date forward in an ahead-of-UTC zone late at night", () => {
    // 2026-03-01 23:30 UTC is already 2026-03-02 in Tokyo (UTC+9).
    const now = new Date("2026-03-01T23:30:00.000Z");
    expect(todayInTimezone("Asia/Tokyo", now)).toBe("2026-03-02");
    expect(todayInTimezone("UTC", now)).toBe("2026-03-01");
  });
  it("stays on the prior date in a behind-UTC zone early morning UTC", () => {
    const now = new Date("2026-03-02T04:00:00.000Z");
    // Los Angeles (UTC-8) is still 2026-03-01 20:00.
    expect(todayInTimezone("America/Los_Angeles", now)).toBe("2026-03-01");
  });
});
