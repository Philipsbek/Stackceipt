"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestInputSchema, toMinor, type RequestInput } from "@/lib/domain/validation";
import { appendAudit, approverMemberIds, notify, resolveActor } from "./_shared";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  if (message.includes("request_decider_not_author")) return "You can't approve your own request.";
  return "Something went wrong. Please try again.";
}

export async function createRequestAction(
  orgSlug: string,
  input: RequestInput,
  asDraft: boolean,
): Promise<ActionResult> {
  // Drafts may be incomplete; submitted requests must fully validate.
  const parsed = requestInputSchema.safeParse(input);
  if (!parsed.success && !asDraft) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.success ? parsed.data : input;

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  const { supabase, orgId, memberId, baseCurrency } = actor;

  const status = asDraft ? "DRAFT" : "SUBMITTED";
  const departmentId = data.departmentId || null;

  // Drafts may be partial; supply defaults so NOT NULL / check constraints hold.
  const amountMinor = Number.isFinite(toMinor(data.amountMajor)) ? toMinor(data.amountMajor) : 0;
  const { data: row, error } = await supabase
    .from("subscription_requests")
    .insert({
      organization_id: orgId,
      requested_by_member_id: memberId,
      department_id: departmentId,
      vendor_name: (data.vendorName || "").trim() || "Untitled",
      product_name: (data.productName || "").trim() || "Untitled",
      business_justification: (data.businessJustification || "").trim() || "(draft)",
      requested_seats: data.requestedSeats ?? null,
      amount_minor: amountMinor,
      currency: (data.currency || baseCurrency).toUpperCase(),
      billing_cadence: data.billingCadence || "MONTHLY",
      billing_interval_months: data.billingIntervalMonths ?? null,
      needed_by: data.neededBy || null,
      status,
    })
    .select("id")
    .single();

  if (error || !row) return { error: friendly(error?.message ?? "insert failed") };
  const requestId = row.id as string;

  await appendAudit(supabase, orgId, `request.${asDraft ? "drafted" : "submitted"}`, "subscription_request", requestId, null, { status }, { vendor: data.vendorName });

  if (!asDraft) {
    const approvers = (await approverMemberIds(supabase, orgId, departmentId)).filter((id) => id !== memberId);
    await notify(supabase, orgId, approvers, {
      type: "REQUEST_SUBMITTED",
      title: "New request awaiting your decision",
      body: `${data.vendorName} ${data.productName} was requested.`,
      href: `/app/${orgSlug}/requests/${requestId}`,
      entityType: "request",
      entityId: requestId,
    });
  }

  revalidatePath(`/app/${orgSlug}/requests`);
  revalidatePath(`/app/${orgSlug}`);
  return { ok: true, id: requestId };
}

export async function decideRequestAction(
  orgSlug: string,
  requestId: string,
  decision: "APPROVED" | "DENIED",
  note: string,
): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  const { supabase, orgId, memberId } = actor;

  if (decision === "DENIED" && note.trim().length < 3) {
    return { error: "A reason is required to deny a request." };
  }

  const { data: req } = await supabase
    .from("subscription_requests")
    .select("id, status, requested_by_member_id, department_id, vendor_name, product_name")
    .eq("organization_id", orgId)
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "Request not found" };
  if (req.status !== "SUBMITTED") return { error: "This request has already been decided." };
  if (req.requested_by_member_id === memberId) return { error: "You can't decide your own request." };

  // Optimistic concurrency: only transition a still-SUBMITTED request.
  const { data: updated, error } = await supabase
    .from("subscription_requests")
    .update({
      status: decision,
      decided_by_member_id: memberId,
      decided_at: new Date().toISOString(),
      decision_note: note.trim() || null,
    })
    .eq("organization_id", orgId)
    .eq("id", requestId)
    .eq("status", "SUBMITTED")
    .select("id");

  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This request was already decided by someone else." };

  await appendAudit(supabase, orgId, `request.${decision.toLowerCase()}`, "subscription_request", requestId, { status: "SUBMITTED" }, { status: decision }, { vendor: req.vendor_name });

  await notify(supabase, orgId, [req.requested_by_member_id as string], {
    type: "REQUEST_DECIDED",
    title: `Your request was ${decision === "APPROVED" ? "approved" : "denied"}`,
    body: `${req.vendor_name} ${req.product_name}${note.trim() ? ` — ${note.trim()}` : ""}`,
    href: `/app/${orgSlug}/requests/${requestId}`,
    entityType: "request",
    entityId: requestId,
  });

  revalidatePath(`/app/${orgSlug}/requests/${requestId}`);
  revalidatePath(`/app/${orgSlug}/requests`);
  revalidatePath(`/app/${orgSlug}`);
  return { ok: true };
}

export async function cancelRequestAction(orgSlug: string, requestId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  const { supabase, orgId } = actor;

  const { data: updated, error } = await supabase
    .from("subscription_requests")
    .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("id", requestId)
    .in("status", ["DRAFT", "SUBMITTED"])
    .select("id");

  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This request can no longer be cancelled." };

  await appendAudit(supabase, orgId, "request.cancelled", "subscription_request", requestId, null, { status: "CANCELLED" }, {});
  revalidatePath(`/app/${orgSlug}/requests/${requestId}`);
  revalidatePath(`/app/${orgSlug}/requests`);
  return { ok: true };
}

export async function convertRequestAction(orgSlug: string, requestId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  const { supabase, orgId, memberId } = actor;

  const { data: req } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { error: "Request not found" };
  if (req.status !== "APPROVED") return { error: "Only approved requests can be converted." };
  if (req.created_subscription_id) return { error: "This request was already converted." };

  // Create the subscription prefilled from the request.
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: orgId,
      department_id: req.department_id,
      owner_member_id: req.requested_by_member_id,
      vendor_name: req.vendor_name,
      product_name: req.product_name,
      status: "ACTIVE",
      billing_cadence: req.billing_cadence,
      billing_interval_months: req.billing_interval_months,
      amount_minor: req.amount_minor,
      currency: req.currency,
      auto_renews: true,
      notice_period_days: 30,
      seats_purchased: req.requested_seats,
      created_by_member_id: memberId,
      last_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (subErr || !sub) return { error: friendly(subErr?.message ?? "Could not create subscription") };
  const subId = sub.id as string;

  // Link the request to the created subscription (idempotency guard).
  const { data: linked } = await supabase
    .from("subscription_requests")
    .update({ created_subscription_id: subId })
    .eq("organization_id", orgId)
    .eq("id", requestId)
    .is("created_subscription_id", null)
    .select("id");

  if (!linked || linked.length === 0) {
    // A concurrent conversion won; remove the duplicate subscription we just made.
    await supabase.from("subscriptions").delete().eq("organization_id", orgId).eq("id", subId);
    return { error: "This request was already converted." };
  }

  await appendAudit(supabase, orgId, "request.converted", "subscription_request", requestId, null, { created_subscription_id: subId }, { vendor: req.vendor_name });
  await appendAudit(supabase, orgId, "subscription.created", "subscription", subId, null, { from_request: requestId }, { vendor: req.vendor_name });

  await notify(supabase, orgId, [req.requested_by_member_id as string], {
    type: "REQUEST_CONVERTED",
    title: "Your request is now a tracked subscription",
    body: `${req.vendor_name} ${req.product_name} was added.`,
    href: `/app/${orgSlug}/subscriptions/${subId}`,
    entityType: "subscription",
    entityId: subId,
  });

  revalidatePath(`/app/${orgSlug}/requests/${requestId}`);
  revalidatePath(`/app/${orgSlug}/subscriptions`);
  // Land on the new subscription's edit page for a final review/adjust step.
  redirect(`/app/${orgSlug}/subscriptions/${subId}/edit`);
}
