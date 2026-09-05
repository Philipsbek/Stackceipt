"use server";

import { revalidatePath } from "next/cache";
import { announce, appendAudit, DEMO_READONLY_ERROR, resolveActor } from "./_shared";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Open an offboarding case for a departing member and seed the checklist from
 * their active subscription seats (one "remove seat" task each) plus a general
 * access-revocation task.
 */
export async function createOffboardingCaseAction(
  orgSlug: string,
  input: { memberId: string; departureDate: string; notes?: string },
): Promise<ActionResult> {
  const memberId = (input.memberId ?? "").trim();
  const departureDate = (input.departureDate ?? "").trim();
  if (!memberId) return { error: "Choose a member to offboard." };
  if (!ISO_DATE.test(departureDate)) return { error: "Choose a valid departure date." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can start offboarding." };
  const { supabase, orgId, memberId: actorMemberId } = actor;

  // Guard against duplicate open cases for the same member.
  const { data: existing } = await supabase
    .from("offboarding_cases")
    .select("id")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .maybeSingle();
  if (existing) return { error: "This member already has an open offboarding case." };

  const { data: caseRow, error } = await supabase
    .from("offboarding_cases")
    .insert({
      organization_id: orgId,
      member_id: memberId,
      departure_date: departureDate,
      notes: (input.notes ?? "").trim() || null,
      status: "OPEN",
      initiated_by_member_id: actorMemberId,
    })
    .select("id, organization_members(full_name)")
    .single();
  if (error || !caseRow) return { error: friendly(error?.message ?? "insert failed") };
  const caseId = caseRow.id as string;

  // Seed tasks from the member's active seat assignments.
  const { data: assigns } = await supabase
    .from("subscription_members")
    .select("subscription_id, subscriptions(vendor_name, product_name)")
    .eq("organization_id", orgId)
    .eq("member_id", memberId)
    .is("unassigned_at", null);

  const seatTasks = (assigns ?? []).map((a) => {
    const s = (a as unknown as { subscriptions?: { vendor_name: string; product_name: string } }).subscriptions;
    return {
      organization_id: orgId,
      offboarding_case_id: caseId,
      subscription_id: (a as { subscription_id: string }).subscription_id,
      title: `Remove seat: ${s ? `${s.vendor_name} ${s.product_name}` : "subscription"}`,
      status: "PENDING",
    };
  });
  const tasks = [
    ...seatTasks,
    { organization_id: orgId, offboarding_case_id: caseId, title: "Revoke SSO / account access", status: "PENDING" },
  ];
  await supabase.from("offboarding_tasks").insert(tasks);

  const name = (caseRow as unknown as { organization_members?: { full_name: string } }).organization_members?.full_name ?? "a member";
  await appendAudit(supabase, orgId, "offboarding.created", "offboarding_case", caseId, null, { departure_date: departureDate }, {});
  await announce(supabase, orgId, {
    title: "Offboarding started",
    body: `An offboarding case was opened for ${name} (${tasks.length} tasks).`,
    href: `/app/${orgSlug}/offboarding/${caseId}`,
    entityType: "offboarding_case",
    entityId: caseId,
  });
  revalidatePath(`/app/${orgSlug}/offboarding`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true, id: caseId };
}

export async function completeTaskAction(orgSlug: string, taskId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  const { supabase, orgId, memberId, role } = actor;

  const { data: task } = await supabase
    .from("offboarding_tasks")
    .select("id, status, subscription_id, offboarding_case_id, assigned_to_member_id, offboarding_cases(member_id)")
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found" };
  if (task.status !== "PENDING") return { error: "This task is already closed." };
  if (role !== "OWNER" && role !== "ADMIN" && task.assigned_to_member_id !== memberId) {
    return { error: "Only owners, admins, or the assignee can complete this task." };
  }

  const { data: updated, error } = await supabase
    .from("offboarding_tasks")
    .update({ status: "COMPLETED", completed_by_member_id: memberId, completed_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("id", taskId)
    .eq("status", "PENDING")
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This task was already closed." };

  // A seat task also releases the member's assignment in Stackceipt.
  const caseMemberId = (task as unknown as { offboarding_cases?: { member_id: string } }).offboarding_cases?.member_id;
  if (task.subscription_id && caseMemberId) {
    await supabase
      .from("subscription_members")
      .update({ unassigned_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("subscription_id", task.subscription_id)
      .eq("member_id", caseMemberId)
      .is("unassigned_at", null);
  }

  await appendAudit(supabase, orgId, "offboarding.task_completed", "offboarding_task", taskId, null, { status: "COMPLETED" }, {});
  revalidatePath(`/app/${orgSlug}/offboarding/${task.offboarding_case_id}`);
  revalidatePath(`/app/${orgSlug}/offboarding`);
  return { ok: true };
}

export async function completeCaseAction(orgSlug: string, caseId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can complete an offboarding case." };
  const { supabase, orgId, memberId } = actor;

  const { data: pending } = await supabase
    .from("offboarding_tasks")
    .select("id", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("offboarding_case_id", caseId)
    .eq("status", "PENDING");
  if ((pending ?? []).length > 0) return { error: "Complete every task before closing the case." };

  const { data: updated, error } = await supabase
    .from("offboarding_cases")
    .update({ status: "COMPLETED", completed_by_member_id: memberId, completed_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("id", caseId)
    .in("status", ["OPEN", "IN_PROGRESS"])
    .select("id, organization_members(full_name)");
  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This case is already closed." };

  const name = (updated[0] as unknown as { organization_members?: { full_name: string } }).organization_members?.full_name ?? "a member";
  await appendAudit(supabase, orgId, "offboarding.completed", "offboarding_case", caseId, null, { status: "COMPLETED" }, {});
  await announce(supabase, orgId, {
    title: "Offboarding completed",
    body: `Offboarding for ${name} is complete — all seats reclaimed.`,
    href: `/app/${orgSlug}/offboarding/${caseId}`,
    entityType: "offboarding_case",
    entityId: caseId,
  });
  revalidatePath(`/app/${orgSlug}/offboarding/${caseId}`);
  revalidatePath(`/app/${orgSlug}/offboarding`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}
