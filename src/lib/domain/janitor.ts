import { annualizedMinor, monthlyMinor } from "./money";
import { daysUntil, noticeDeadline } from "./dates";
import type { JanitorSeverity } from "./enums";
import type { Subscription, SubscriptionAssignment, SubscriptionReview } from "./types";

/**
 * The Stackceipt Janitor — a DETERMINISTIC rules engine (no AI, spec §10.12).
 *
 * Every threshold lives in JANITOR_CONSTANTS so the rules are auditable in one place.
 * A finding is never labelled "savings" unless the amount is mechanically supportable;
 * otherwise estimatedSavingsMinor is null.
 */

export const JANITOR_CONSTANTS = {
  /** Low-utilization rule only fires at/above this seat count. */
  LOW_UTIL_MIN_SEATS: 5,
  /** Utilization below this percent is flagged as low. */
  LOW_UTIL_THRESHOLD_PCT: 60,
  /** More than this many unused seats is "material". */
  MATERIAL_UNUSED_SEATS: 2,
  /** Active subscription not verified within this many days is stale. */
  STALE_VERIFICATION_DAYS: 90,
  /** Grace period after creation before "never verified" is flagged. */
  NEVER_VERIFIED_GRACE_DAYS: 14,
  /** Notice deadline within this many days (or past) is flagged. */
  NOTICE_WARNING_DAYS: 21,
} as const;

export interface JanitorCandidate {
  subscriptionId: string | null;
  ruleKey: string;
  fingerprint: string;
  severity: JanitorSeverity;
  title: string;
  description: string;
  estimatedSavingsMinor: number | null;
  evidence: Record<string, unknown>;
}

export interface JanitorInput {
  organizationId: string;
  today: string;
  renewalWindowDays: number;
  subscriptions: Subscription[];
  assignments: SubscriptionAssignment[];
  reviews: SubscriptionReview[];
}

function fp(organizationId: string, ruleKey: string, key: string): string {
  return `${organizationId}:${ruleKey}:${key}`;
}

/** A subscription is "live" (cost-relevant) when active or trial and not archived. */
function isLive(s: Subscription): boolean {
  return (s.status === "ACTIVE" || s.status === "TRIAL") && !s.archivedAt;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function perSeatSavings(s: Subscription): number | null {
  // Only derive per-seat savings when seats are known, recurring, and > 0.
  if (s.seatsPurchased === null || s.seatsPurchased <= 0) return null;
  if (s.seatsUsed === null) return null;
  if (s.billingCadence === "ONE_TIME") return null;
  const unused = Math.max(s.seatsPurchased - s.seatsUsed, 0);
  if (unused <= 0) return null;
  const annual = annualizedMinor(s.amountMinor, s.billingCadence, s.billingIntervalMonths);
  const perSeatAnnual = Math.floor(annual / s.seatsPurchased);
  return perSeatAnnual * unused;
}

export function runJanitorRules(input: JanitorInput): JanitorCandidate[] {
  const { organizationId, today, renewalWindowDays, subscriptions, assignments, reviews } = input;
  const out: JanitorCandidate[] = [];

  const activeAssignmentsBySub = new Map<string, number>();
  for (const a of assignments) {
    if (a.unassignedAt) continue;
    activeAssignmentsBySub.set(a.subscriptionId, (activeAssignmentsBySub.get(a.subscriptionId) ?? 0) + 1);
  }

  const reviewsBySub = new Map<string, SubscriptionReview[]>();
  for (const r of reviews) {
    const list = reviewsBySub.get(r.subscriptionId) ?? [];
    list.push(r);
    reviewsBySub.set(r.subscriptionId, list);
  }

  for (const s of subscriptions) {
    if (!isLive(s)) continue;
    const subReviews = reviewsBySub.get(s.id) ?? [];
    const activeAssignments = activeAssignmentsBySub.get(s.id) ?? 0;

    // 1. Unowned active subscription
    if (!s.ownerMemberId) {
      out.push({
        subscriptionId: s.id,
        ruleKey: "UNOWNED_SUBSCRIPTION",
        fingerprint: fp(organizationId, "UNOWNED_SUBSCRIPTION", s.id),
        severity: "MEDIUM",
        title: "No accountable owner",
        description: `${s.vendorName} ${s.productName} has no assigned owner. Assign an owner so someone is accountable for renewals and reviews.`,
        estimatedSavingsMinor: null,
        evidence: { subscriptionId: s.id },
      });
    }

    // 2. Missing department
    if (!s.departmentId) {
      out.push({
        subscriptionId: s.id,
        ruleKey: "MISSING_DEPARTMENT",
        fingerprint: fp(organizationId, "MISSING_DEPARTMENT", s.id),
        severity: "LOW",
        title: "No department assigned",
        description: `${s.vendorName} ${s.productName} is not attributed to a department, so it is missing from department cost breakdowns.`,
        estimatedSavingsMinor: null,
        evidence: { subscriptionId: s.id },
      });
    }

    // 3. Missing renewal date (recurring, auto-renewing)
    if (s.billingCadence !== "ONE_TIME" && s.autoRenews && !s.nextRenewalDate) {
      out.push({
        subscriptionId: s.id,
        ruleKey: "MISSING_RENEWAL_DATE",
        fingerprint: fp(organizationId, "MISSING_RENEWAL_DATE", s.id),
        severity: "MEDIUM",
        title: "Auto-renewing with no renewal date",
        description: `${s.vendorName} ${s.productName} auto-renews but has no next renewal date recorded, so it cannot appear in renewal planning.`,
        estimatedSavingsMinor: null,
        evidence: { subscriptionId: s.id },
      });
    }

    // 4. Renewal approaching without a covering review
    if (s.nextRenewalDate) {
      const dUntil = daysUntil(s.nextRenewalDate, today);
      const within = dUntil !== null && dUntil >= 0 && dUntil <= renewalWindowDays;
      const hasRecentReview = subReviews.some(
        (r) => r.status === "COMPLETED" || r.status === "IN_PROGRESS" || r.status === "SCHEDULED",
      );
      if (within && !hasRecentReview) {
        out.push({
          subscriptionId: s.id,
          ruleKey: "RENEWAL_WITHOUT_REVIEW",
          fingerprint: fp(organizationId, "RENEWAL_WITHOUT_REVIEW", s.id),
          severity: "MEDIUM",
          title: "Renewal approaching without a review",
          description: `${s.vendorName} ${s.productName} renews in ${dUntil} days but has no scheduled or completed review.`,
          estimatedSavingsMinor: null,
          evidence: { subscriptionId: s.id, daysUntilRenewal: dUntil },
        });
      }
    }

    // 5. Notice deadline approaching or passed
    if (s.nextRenewalDate && s.autoRenews && s.billingCadence !== "ONE_TIME") {
      const deadline = noticeDeadline(s.nextRenewalDate, s.noticePeriodDays);
      const dDeadline = daysUntil(deadline, today);
      if (dDeadline !== null && dDeadline <= JANITOR_CONSTANTS.NOTICE_WARNING_DAYS) {
        const passed = dDeadline < 0;
        out.push({
          subscriptionId: s.id,
          ruleKey: "NOTICE_DEADLINE",
          fingerprint: fp(organizationId, "NOTICE_DEADLINE", s.id),
          severity: passed ? "HIGH" : "MEDIUM",
          title: passed ? "Cancellation notice deadline passed" : "Cancellation notice deadline approaching",
          description: passed
            ? `The ${s.noticePeriodDays}-day notice window for ${s.vendorName} ${s.productName} has passed; it may auto-renew before it can be cancelled.`
            : `The notice deadline for ${s.vendorName} ${s.productName} is in ${dDeadline} days. Decide before it locks into another term.`,
          estimatedSavingsMinor: null,
          evidence: { subscriptionId: s.id, noticeDeadline: deadline, daysToDeadline: dDeadline },
        });
      }
    }

    // 6. Low seat utilization (>= 5 seats, < 60%)
    if (
      s.seatsPurchased !== null &&
      s.seatsPurchased >= JANITOR_CONSTANTS.LOW_UTIL_MIN_SEATS &&
      s.seatsUsed !== null
    ) {
      const util = (s.seatsUsed / s.seatsPurchased) * 100;
      if (util < JANITOR_CONSTANTS.LOW_UTIL_THRESHOLD_PCT) {
        out.push({
          subscriptionId: s.id,
          ruleKey: "LOW_UTILIZATION",
          fingerprint: fp(organizationId, "LOW_UTILIZATION", s.id),
          severity: "HIGH",
          title: "Low seat utilization",
          description: `${s.vendorName} ${s.productName} is at ${Math.round(util)}% utilization (${s.seatsUsed}/${s.seatsPurchased} seats). Consider reducing the seat count.`,
          estimatedSavingsMinor: perSeatSavings(s),
          evidence: { subscriptionId: s.id, utilizationPercent: Math.round(util), seatsPurchased: s.seatsPurchased, seatsUsed: s.seatsUsed },
        });
      }
    }

    // 7. Material unused seats (> 2 unused)
    if (s.seatsPurchased !== null && s.seatsUsed !== null) {
      const unused = s.seatsPurchased - s.seatsUsed;
      if (unused > JANITOR_CONSTANTS.MATERIAL_UNUSED_SEATS) {
        out.push({
          subscriptionId: s.id,
          ruleKey: "MATERIAL_UNUSED_SEATS",
          fingerprint: fp(organizationId, "MATERIAL_UNUSED_SEATS", s.id),
          severity: "MEDIUM",
          title: "Unused seats",
          description: `${unused} of ${s.seatsPurchased} seats on ${s.vendorName} ${s.productName} are unused.`,
          estimatedSavingsMinor: perSeatSavings(s),
          evidence: { subscriptionId: s.id, unusedSeats: unused },
        });
      }
    }

    // 8. Seat count inconsistency (used or active assignments exceed purchased)
    if (s.seatsPurchased !== null) {
      const usedExceeds = s.seatsUsed !== null && s.seatsUsed > s.seatsPurchased;
      const assignmentsExceed = activeAssignments > s.seatsPurchased;
      if (usedExceeds || assignmentsExceed) {
        out.push({
          subscriptionId: s.id,
          ruleKey: "SEAT_INCONSISTENCY",
          fingerprint: fp(organizationId, "SEAT_INCONSISTENCY", s.id),
          severity: "HIGH",
          title: "Seat count inconsistency",
          description: `${s.vendorName} ${s.productName} has more seats in use (${s.seatsUsed ?? activeAssignments}) than purchased (${s.seatsPurchased}). Verify the true seat count.`,
          estimatedSavingsMinor: null,
          evidence: { subscriptionId: s.id, seatsPurchased: s.seatsPurchased, seatsUsed: s.seatsUsed, activeAssignments },
        });
      }
    }

    // 9. Seats purchased but nobody assigned
    if (s.seatsPurchased !== null && s.seatsPurchased > 0 && activeAssignments === 0) {
      out.push({
        subscriptionId: s.id,
        ruleKey: "NO_ASSIGNED_USERS",
        fingerprint: fp(organizationId, "NO_ASSIGNED_USERS", s.id),
        severity: "LOW",
        title: "No assigned users",
        description: `${s.seatsPurchased} seats are purchased for ${s.vendorName} ${s.productName} but no one is assigned in Stackceipt. This is a tracking risk, not proof of waste.`,
        estimatedSavingsMinor: null,
        evidence: { subscriptionId: s.id, seatsPurchased: s.seatsPurchased },
      });
    }

    // 10. Stale verification
    {
      const verifiedDaysAgo = s.lastVerifiedAt
        ? -(daysUntil(s.lastVerifiedAt.slice(0, 10), today) ?? 0)
        : null;
      const createdDaysAgo = -(daysUntil(s.createdAt.slice(0, 10), today) ?? 0);
      const neverVerified = !s.lastVerifiedAt;
      const stale =
        (verifiedDaysAgo !== null && verifiedDaysAgo > JANITOR_CONSTANTS.STALE_VERIFICATION_DAYS) ||
        (neverVerified && createdDaysAgo > JANITOR_CONSTANTS.NEVER_VERIFIED_GRACE_DAYS);
      if (stale) {
        out.push({
          subscriptionId: s.id,
          ruleKey: "STALE_VERIFICATION",
          fingerprint: fp(organizationId, "STALE_VERIFICATION", s.id),
          severity: "LOW",
          title: neverVerified ? "Never verified" : "Verification is stale",
          description: neverVerified
            ? `${s.vendorName} ${s.productName} has never been verified. Confirm the cost, seats and renewal are still accurate.`
            : `${s.vendorName} ${s.productName} was last verified ${verifiedDaysAgo} days ago. Re-verify to keep the record trustworthy.`,
          estimatedSavingsMinor: null,
          evidence: { subscriptionId: s.id, lastVerifiedAt: s.lastVerifiedAt },
        });
      }
    }

    // 11. Overdue review
    for (const r of subReviews) {
      if ((r.status === "SCHEDULED" || r.status === "IN_PROGRESS")) {
        const d = daysUntil(r.scheduledFor, today);
        if (d !== null && d < 0) {
          out.push({
            subscriptionId: s.id,
            ruleKey: "OVERDUE_REVIEW",
            fingerprint: fp(organizationId, "OVERDUE_REVIEW", `${s.id}:${r.id}`),
            severity: "MEDIUM",
            title: "Overdue review",
            description: `A review of ${s.vendorName} ${s.productName} was scheduled for ${r.scheduledFor} and is ${Math.abs(d)} days overdue.`,
            estimatedSavingsMinor: null,
            evidence: { subscriptionId: s.id, reviewId: r.id, daysOverdue: Math.abs(d) },
          });
        }
      }
    }
  }

  // 12. Possible duplicate (exact normalized vendor + product among live subs)
  const byPair = new Map<string, Subscription[]>();
  for (const s of subscriptions) {
    if (!isLive(s)) continue;
    const key = `${normalizeName(s.vendorName)}|${normalizeName(s.productName)}`;
    const list = byPair.get(key) ?? [];
    list.push(s);
    byPair.set(key, list);
  }
  for (const [key, group] of byPair) {
    if (group.length > 1) {
      const ids = group.map((g) => g.id).sort();
      // One finding per duplicated pair, attached to the earliest-created record.
      const anchor = group.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
      out.push({
        subscriptionId: anchor.id,
        ruleKey: "POSSIBLE_DUPLICATE",
        fingerprint: fp(input.organizationId, "POSSIBLE_DUPLICATE", key),
        severity: "MEDIUM",
        title: "Possible duplicate subscription",
        description: `${group.length} active subscriptions share the vendor/product "${group[0]!.vendorName} ${group[0]!.productName}". Confirm whether this is a duplicate.`,
        estimatedSavingsMinor: null,
        evidence: { subscriptionIds: ids, count: group.length },
      });
    }
  }

  return out;
}

/** Total supportable potential savings across a set of findings (minor units). */
export function totalPotentialSavings(candidates: { estimatedSavingsMinor: number | null }[]): number {
  return candidates.reduce((sum, c) => sum + (c.estimatedSavingsMinor ?? 0), 0);
}

export { monthlyMinor };
