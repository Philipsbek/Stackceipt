import { createClient } from "@/lib/supabase/server";
import { runJanitorRules, type JanitorCandidate } from "@/lib/domain/janitor";
import { todayInTimezone } from "@/lib/domain/dates";
import type {
  JanitorFinding,
  Organization,
  Subscription,
  SubscriptionAssignment,
  SubscriptionReview,
} from "@/lib/domain/types";

/**
 * Compute every finding the deterministic engine currently produces from live
 * data (unfiltered). The `id` is the fingerprint, which encodes the underlying
 * state — so a finding that is later resolved/dismissed and then recurs after
 * the data changes gets a new fingerprint and reappears.
 */
export async function computeFindings(org: Organization): Promise<JanitorFinding[]> {
  const supabase = await createClient();

  const [{ data: subs }, { data: assigns }, { data: reviews }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("organization_id", org.id),
    supabase.from("subscription_members").select("*").eq("organization_id", org.id),
    supabase.from("subscription_reviews").select("*").eq("organization_id", org.id),
  ]);

  const today = todayInTimezone(org.timezone);
  const candidates = runJanitorRules({
    organizationId: org.id,
    today,
    renewalWindowDays: org.renewalWindowDays,
    subscriptions: (subs ?? []).map(mapSub),
    assignments: (assigns ?? []).map(mapAssignment),
    reviews: (reviews ?? []).map(mapReview),
  });

  return candidates.map((c) => candidateToFinding(c, today));
}

/**
 * The open findings shown in the UI: computed candidates minus any that have
 * been persisted as RESOLVED or DISMISSED (matched by fingerprint).
 */
export async function listFindings(org: Organization): Promise<JanitorFinding[]> {
  const supabase = await createClient();
  const [candidates, { data: persisted }] = await Promise.all([
    computeFindings(org),
    supabase
      .from("janitor_findings")
      .select("fingerprint, status")
      .eq("organization_id", org.id)
      .in("status", ["RESOLVED", "DISMISSED"]),
  ]);
  const hidden = new Set((persisted ?? []).map((r: { fingerprint: string }) => r.fingerprint));
  return candidates.filter((f) => !hidden.has(f.fingerprint));
}

function candidateToFinding(c: JanitorCandidate, today: string): JanitorFinding {
  return {
    id: c.fingerprint,
    organizationId: c.fingerprint.split(":")[0] ?? "",
    subscriptionId: c.subscriptionId,
    ruleKey: c.ruleKey,
    fingerprint: c.fingerprint,
    severity: c.severity,
    title: c.title,
    description: c.description,
    estimatedSavingsMinor: c.estimatedSavingsMinor,
    status: "OPEN",
    evidence: c.evidence,
    detectedAt: `${today}T00:00:00Z`,
    lastSeenAt: `${today}T00:00:00Z`,
    resolvedAt: null,
    resolvedByMemberId: null,
    dismissedUntil: null,
    dismissalReason: null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSub(r: any): Subscription {
  return {
    id: r.id, organizationId: r.organization_id, departmentId: r.department_id, ownerMemberId: r.owner_member_id,
    vendorName: r.vendor_name, productName: r.product_name, description: r.description, category: r.category,
    websiteUrl: r.website_url, status: r.status, billingCadence: r.billing_cadence,
    billingIntervalMonths: r.billing_interval_months, amountMinor: Number(r.amount_minor), currency: r.currency,
    startDate: r.start_date, nextRenewalDate: r.next_renewal_date, endDate: r.end_date, autoRenews: r.auto_renews,
    noticePeriodDays: r.notice_period_days, seatsPurchased: r.seats_purchased, seatsUsed: r.seats_used,
    contractReference: r.contract_reference, notes: r.notes, lastReviewedAt: r.last_reviewed_at,
    lastVerifiedAt: r.last_verified_at, createdByMemberId: r.created_by_member_id, archivedAt: r.archived_at,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function mapAssignment(r: any): SubscriptionAssignment {
  return {
    id: r.id, organizationId: r.organization_id, subscriptionId: r.subscription_id, memberId: r.member_id,
    assignedByMemberId: r.assigned_by_member_id, assignedAt: r.assigned_at, unassignedAt: r.unassigned_at, notes: r.notes,
  };
}
function mapReview(r: any): SubscriptionReview {
  return {
    id: r.id, organizationId: r.organization_id, subscriptionId: r.subscription_id, scheduledFor: r.scheduled_for,
    assignedToMemberId: r.assigned_to_member_id, status: r.status, decision: r.decision, summary: r.summary,
    recommendedSeats: r.recommended_seats, completedByMemberId: r.completed_by_member_id, completedAt: r.completed_at,
    createdByMemberId: r.created_by_member_id, createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { mapSub as mapSubscriptionRow, mapAssignment as mapAssignmentRow, mapReview as mapReviewRow };
