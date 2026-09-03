import { describe, expect, it } from "vitest";
import {
  annualizedMinor,
  chargesPerYear,
  formatMoney,
  isRecurring,
  monthlyMinor,
  sumMinor,
} from "../money";

describe("annualizedMinor", () => {
  it("monthly is amount × 12", () => {
    expect(annualizedMinor(1000, "MONTHLY")).toBe(12000);
  });
  it("quarterly is amount × 4", () => {
    expect(annualizedMinor(1000, "QUARTERLY")).toBe(4000);
  });
  it("annual is amount", () => {
    expect(annualizedMinor(120000, "ANNUAL")).toBe(120000);
  });
  it("custom is amount × 12 ÷ interval (multiply before divide, round half-up)", () => {
    // 1000 charged every 5 months → 1000*12/5 = 2400
    expect(annualizedMinor(1000, "CUSTOM", 5)).toBe(2400);
    // 100 every 7 months → 1200/7 = 171.43 → 171
    expect(annualizedMinor(100, "CUSTOM", 7)).toBe(171);
  });
  it("one-time is excluded from recurring totals", () => {
    expect(annualizedMinor(50000, "ONE_TIME")).toBe(0);
  });
  it("invalid custom interval yields 0", () => {
    expect(annualizedMinor(1000, "CUSTOM", 0)).toBe(0);
    expect(annualizedMinor(1000, "CUSTOM", null)).toBe(0);
  });
  it("handles zero amount", () => {
    expect(annualizedMinor(0, "MONTHLY")).toBe(0);
  });
  it("throws when the result would exceed the JS safe integer range", () => {
    expect(() => annualizedMinor(Number.MAX_SAFE_INTEGER, "MONTHLY")).toThrow();
  });
});

describe("monthlyMinor", () => {
  it("derives monthly from annualized consistently", () => {
    expect(monthlyMinor(1000, "MONTHLY")).toBe(1000);
    expect(monthlyMinor(120000, "ANNUAL")).toBe(10000);
    expect(monthlyMinor(3000, "QUARTERLY")).toBe(1000);
  });
  it("rounds half-up on non-divisible annuals", () => {
    // annual 171 (from custom above) → 171/12 = 14.25 → 14
    expect(monthlyMinor(100, "CUSTOM", 7)).toBe(14);
  });
  it("one-time is zero monthly", () => {
    expect(monthlyMinor(9999, "ONE_TIME")).toBe(0);
  });
});

describe("chargesPerYear / isRecurring", () => {
  it("returns null for one-time", () => {
    expect(chargesPerYear("ONE_TIME")).toBeNull();
    expect(isRecurring("ONE_TIME")).toBe(false);
  });
  it("custom respects interval", () => {
    expect(chargesPerYear("CUSTOM", 6)).toBe(2);
  });
});

describe("sumMinor", () => {
  it("sums integer minor units", () => {
    expect(sumMinor([100, 200, 300])).toBe(600);
  });
  it("handles empty", () => {
    expect(sumMinor([])).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats USD", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
  });
  it("respects showCents=false", () => {
    expect(formatMoney(120000, "USD", { showCents: false })).toBe("$1,200");
  });
  it("degrades gracefully for unknown currency", () => {
    expect(formatMoney(1000, "ZZZ")).toContain("ZZZ");
  });
});
