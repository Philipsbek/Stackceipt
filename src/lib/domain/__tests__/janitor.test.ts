import { describe, expect, it } from "vitest";
import { runJanitorRules, type JanitorInput } from "../janitor";
import type { Subscription } from "../types";

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: "s-1",
    organizationId: "org-1",
    departmentId: "d-1",
    ownerMemberId: "m-1",
    vendorName: "Acme",
    productName: "Suite",
    description: null,
    category: "Productivity",
    websiteUrl: null,
    status: "ACTIVE",
    billingCadence: "MONTHLY",
    billingIntervalMonths: null,
    amountMinor: 10000,
    currency: "USD",
    startDate: "2025-01-01",
    nextRenewalDate: "2026-12-01",
    endDate: null,
    autoRenews: true,
    noticePeriodDays: 30,
    seatsPurchased: 10,
    seatsUsed: 8,
    contractReference: null,
    notes: null,
    lastReviewedAt: null,
    lastVerifiedAt: "2026-08-01T00:00:00.000Z",
    createdByMemberId: "m-1",
    archivedAt: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function input(subscriptions: Subscription[], overrides: Partial<JanitorInput> = {}): JanitorInput {
  return {
    organizationId: "org-1",
    today: "2026-09-01",
    renewalWindowDays: 90,
    subscriptions,
    assignments: [],
    reviews: [],
    ...overrides,
  };
}

function keys(subscriptions: Subscription[], overrides: Partial<JanitorInput> = {}) {
  return runJanitorRules(input(subscriptions, overrides)).map((c) => c.ruleKey);
}

describe("janitor rules", () => {
  it("flags unowned subscription", () => {
    expect(keys([sub({ ownerMemberId: null })])).toContain("UNOWNED_SUBSCRIPTION");
  });
  it("flags missing department", () => {
    expect(keys([sub({ departmentId: null })])).toContain("MISSING_DEPARTMENT");
  });
  it("flags missing renewal date on auto-renewing recurring sub", () => {
    expect(keys([sub({ nextRenewalDate: null, autoRenews: true })])).toContain("MISSING_RENEWAL_DATE");
  });
  it("does not flag missing renewal on one-time", () => {
    expect(keys([sub({ nextRenewalDate: null, billingCadence: "ONE_TIME", seatsPurchased: null, seatsUsed: null })])).not.toContain("MISSING_RENEWAL_DATE");
  });
  it("flags renewal approaching without review", () => {
    expect(keys([sub({ nextRenewalDate: "2026-10-01" })])).toContain("RENEWAL_WITHOUT_REVIEW");
  });
  it("flags passed notice deadline as HIGH", () => {
    const findings = runJanitorRules(input([sub({ nextRenewalDate: "2026-09-05", noticePeriodDays: 30 })]));
    const notice = findings.find((f) => f.ruleKey === "NOTICE_DEADLINE");
    expect(notice?.severity).toBe("HIGH");
  });
  it("flags low utilization only at >= 5 seats and < 60%", () => {
    expect(keys([sub({ seatsPurchased: 10, seatsUsed: 4 })])).toContain("LOW_UTILIZATION");
    expect(keys([sub({ seatsPurchased: 4, seatsUsed: 1 })])).not.toContain("LOW_UTILIZATION");
    expect(keys([sub({ seatsPurchased: 10, seatsUsed: 9 })])).not.toContain("LOW_UTILIZATION");
  });
  it("computes supportable per-seat savings for low utilization", () => {
    // annual = 10000*12 = 120000; per seat = 12000; unused = 6 → 72000
    const findings = runJanitorRules(input([sub({ seatsPurchased: 10, seatsUsed: 4 })]));
    const low = findings.find((f) => f.ruleKey === "LOW_UTILIZATION");
    expect(low?.estimatedSavingsMinor).toBe(72000);
  });
  it("flags material unused seats (> 2)", () => {
    expect(keys([sub({ seatsPurchased: 10, seatsUsed: 7 })])).toContain("MATERIAL_UNUSED_SEATS");
    expect(keys([sub({ seatsPurchased: 10, seatsUsed: 9 })])).not.toContain("MATERIAL_UNUSED_SEATS");
  });
  it("flags seat inconsistency when used exceeds purchased", () => {
    expect(keys([sub({ seatsPurchased: 5, seatsUsed: 8 })])).toContain("SEAT_INCONSISTENCY");
  });
  it("flags no assigned users when seats purchased but none assigned", () => {
    expect(keys([sub({ seatsPurchased: 5, seatsUsed: 0 })], { assignments: [] })).toContain("NO_ASSIGNED_USERS");
  });
  it("flags stale verification past 90 days", () => {
    expect(keys([sub({ lastVerifiedAt: "2026-01-01T00:00:00.000Z" })])).toContain("STALE_VERIFICATION");
  });
  it("flags never-verified after grace period", () => {
    expect(keys([sub({ lastVerifiedAt: null, createdAt: "2025-01-01T00:00:00.000Z" })])).toContain("STALE_VERIFICATION");
  });
  it("flags exact duplicate vendor+product among active subs", () => {
    const a = sub({ id: "s-a", vendorName: "Figma", productName: "Org", createdAt: "2025-01-01T00:00:00.000Z" });
    const b = sub({ id: "s-b", vendorName: "  figma ", productName: "org", createdAt: "2025-02-01T00:00:00.000Z" });
    const found = runJanitorRules(input([a, b])).filter((f) => f.ruleKey === "POSSIBLE_DUPLICATE");
    expect(found).toHaveLength(1);
    expect(found[0]!.subscriptionId).toBe("s-a");
  });
  it("ignores archived/cancelled subscriptions", () => {
    expect(keys([sub({ status: "ARCHIVED", ownerMemberId: null, archivedAt: "2026-01-01T00:00:00.000Z" })])).toHaveLength(0);
  });
  it("is idempotent: fingerprints are stable across runs", () => {
    const i = input([sub({ ownerMemberId: null })]);
    const run1 = runJanitorRules(i).map((c) => c.fingerprint).sort();
    const run2 = runJanitorRules(i).map((c) => c.fingerprint).sort();
    expect(run1).toEqual(run2);
  });
});
