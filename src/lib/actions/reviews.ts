"use server";

import { revalidatePath } from "next/cache";
import { announce, appendAudit, DEMO_READONLY_ERROR, notify, resolveActor } from "./_shared";
import { REVIEW_DECISIONS, REVIEW_DECISION_LABELS, type ReviewDecision } from "@/lib/domain/enums";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  if (message.includes("review_completion_shape")) return "A decision and summary are required to complete a review.";
  return "Something went wrong. Please try again.";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function scheduleReviewAction(
  orgSlug: string,
  input: { subscriptionId: string; scheduledFor: string; assignedToMemberId?: string },
): Promise<ActionResult> {
  const subscriptionId = (input.subscriptionId ?? "").trim();
  const scheduledFor = (input.scheduledFor ?? "").trim();
  if (!subscriptionId) return { error: "Choose a subscription to review." };
  if (!ISO_DATE.test(scheduledFor)) return { error: "Choose a valid date." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can schedule reviews." };
  const { supabase, orgId, memberId } = actor;

  const assignee = (input.assignedToMemberId ?? "").trim();
  const assignedTo = assignee && assignee !== "none" ? assignee : null;

  const { data, error } = await supabase
    .from("subscription_reviews")
    .insert({
      organization_id: orgId,
      subscription_id: subscriptionId,
      scheduled_for: scheduledFor,
      assigned_to_member_id: assignedTo,
      status: "SCHEDULED",
      created_by_member_id: memberId,
    })
    .select("id, subscriptions(vendor_name, product_name)")
    .single();

  if (error || !data) return { error: friendly(error?.message ?? "insert failed") };
  const id = data.id as string;
  const sub = (data as unknown as { subscriptions?: { vendor_name: string; product_name: string } }).subscriptions;
  const label = sub ? `${sub.vendor_name} ${sub.product_name}` : "a subscription";

  await appendAudit(supabase, orgId, "review.scheduled", "subscription_review", id, null, { scheduled_for: scheduledFor }, {});
  if (assignedTo && assignedTo !== memberId) {
    await notify(supabase, orgId, [assignedTo], {
      type: "REVIEW_ASSIGNED",
      title: "A review was assigned to you",
      body: `Review ${label} by ${scheduledFor}.`,
      href: `/app/${orgSlug}/reviews`,
      entityType: "review",
      entityId: id,
    });
  }
  await announce(supabase, orgId, {
    title: "Review scheduled",
    body: `A review of ${label} was scheduled for ${scheduledFor}.`,
    href: `/app/${orgSlug}/reviews`,
    entityType: "review",
    entityId: id,
  });
  revalidatePath(`/app/${orgSlug}/reviews`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true, id };
}

export async function completeReviewAction(
  orgSlug: string,
  reviewId: string,
  input: { decision: ReviewDecision; summary: string; recommendedSeats?: number | null },
): Promise<ActionResult> {
  const summary = (input.summary ?? "").trim();
  if (summary.length < 3) return { error: "A short summary is required." };
  if (!REVIEW_DECISIONS.includes(input.decision)) return { error: "Choose a decision." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  const { supabase, orgId, memberId, role } = actor;

  const { data: rev } = await supabase
    .from("subscription_reviews")
    .select("id, status, subscription_id, assigned_to_member_id, subscriptions(vendor_name, product_name)")
    .eq("organization_id", orgId)
    .eq("id", reviewId)
    .maybeSingle();
  if (!rev) return { error: "Review not found" };
  if (rev.status === "COMPLETED" || rev.status === "CANCELLED") return { error: "This review is already closed." };
  const isAssignee = rev.assigned_to_member_id === memberId;
  if (role !== "OWNER" && role !== "ADMIN" && !isAssignee) {
    return { error: "Only owners, admins, or the assignee can complete this review." };
  }

  const recommendedSeats =
    input.recommendedSeats != null && Number.isFinite(input.recommendedSeats) && input.recommendedSeats >= 0
      ? Math.floor(input.recommendedSeats)
      : null;

  const { data: updated, error } = await supabase
    .from("subscription_reviews")
    .update({
      status: "COMPLETED",
      decision: input.decision,
      summary,
      recommended_seats: recommendedSeats,
      completed_by_member_id: memberId,
      completed_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .eq("id", reviewId)
    .in("status", ["SCHEDULED", "IN_PROGRESS"])
    .select("id");

  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This review was already closed." };

  // Stamp the subscription so "Last reviewed" reflects reality (no other change).
  if (rev.subscription_id) {
    await supabase
      .from("subscriptions")
      .update({ last_reviewed_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("id", rev.subscription_id);
  }

  const sub = (rev as unknown as { subscriptions?: { vendor_name: string; product_name: string } }).subscriptions;
  const label = sub ? `${sub.vendor_name} ${sub.product_name}` : "a subscription";
  await appendAudit(supabase, orgId, "review.completed", "subscription_review", reviewId, { status: rev.status }, { status: "COMPLETED", decision: input.decision }, {});
  await announce(supabase, orgId, {
    title: "Review completed",
    body: `${label} — ${REVIEW_DECISION_LABELS[input.decision]}.`,
    href: `/app/${orgSlug}/reviews`,
    entityType: "review",
    entityId: reviewId,
  });
  revalidatePath(`/app/${orgSlug}/reviews`);
  if (rev.subscription_id) revalidatePath(`/app/${orgSlug}/subscriptions/${rev.subscription_id}`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}
