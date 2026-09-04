"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/data/access";
import { DEMO_READONLY_ERROR } from "./_shared";
import { subscriptionInputSchema, toMinor, type SubscriptionInput } from "@/lib/domain/validation";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

async function currentMemberId(orgSlug: string): Promise<{ orgId: string; memberId: string; isReadOnly: boolean } | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) return null;
  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", org.id)
    .eq("user_id", userData.user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!member) return null;
  return { orgId: org.id as string, memberId: member.id as string, isReadOnly: isDemoEmail(userData.user.email) };
}

function toRow(input: SubscriptionInput) {
  return {
    department_id: input.departmentId || null,
    owner_member_id: input.ownerMemberId || null,
    vendor_name: input.vendorName,
    product_name: input.productName,
    description: input.description || null,
    category: input.category || null,
    website_url: input.websiteUrl || null,
    status: input.status,
    billing_cadence: input.billingCadence,
    billing_interval_months: input.billingIntervalMonths ?? null,
    amount_minor: toMinor(input.amountMajor),
    currency: input.currency.toUpperCase(),
    start_date: input.startDate || null,
    next_renewal_date: input.nextRenewalDate || null,
    end_date: input.endDate || null,
    auto_renews: input.autoRenews,
    notice_period_days: input.noticePeriodDays,
    seats_purchased: input.seatsPurchased ?? null,
    seats_used: input.seatsUsed ?? null,
    contract_reference: input.contractReference || null,
    notes: input.notes || null,
  };
}

export async function createSubscriptionAction(orgSlug: string, input: SubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ctx = await currentMemberId(orgSlug);
  if (!ctx) return { error: "Not authorized" };
  if (ctx.isReadOnly) return { error: DEMO_READONLY_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ ...toRow(parsed.data), organization_id: ctx.orgId, created_by_member_id: ctx.memberId })
    .select("id")
    .single();

  if (error) return { error: friendly(error.message) };

  await recordAudit(ctx.orgId, ctx.memberId, "subscription.created", "subscription", data!.id as string, null, { vendor: parsed.data.vendorName });
  revalidatePath(`/app/${orgSlug}/subscriptions`);
  revalidatePath(`/app/${orgSlug}`);
  return { ok: true, id: data!.id as string };
}

export async function updateSubscriptionAction(orgSlug: string, id: string, input: SubscriptionInput): Promise<ActionResult> {
  const parsed = subscriptionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ctx = await currentMemberId(orgSlug);
  if (!ctx) return { error: "Not authorized" };
  if (ctx.isReadOnly) return { error: DEMO_READONLY_ERROR };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(toRow(parsed.data))
    .eq("organization_id", ctx.orgId)
    .eq("id", id);

  if (error) return { error: friendly(error.message) };

  await recordAudit(ctx.orgId, ctx.memberId, "subscription.updated", "subscription", id, null, { vendor: parsed.data.vendorName });
  revalidatePath(`/app/${orgSlug}/subscriptions/${id}`);
  revalidatePath(`/app/${orgSlug}/subscriptions`);
  revalidatePath(`/app/${orgSlug}`);
  return { ok: true, id };
}

export async function archiveSubscriptionAction(orgSlug: string, id: string): Promise<ActionResult> {
  const ctx = await currentMemberId(orgSlug);
  if (!ctx) return { error: "Not authorized" };
  if (ctx.isReadOnly) return { error: DEMO_READONLY_ERROR };
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
    .eq("organization_id", ctx.orgId)
    .eq("id", id);
  if (error) return { error: friendly(error.message) };
  await recordAudit(ctx.orgId, ctx.memberId, "subscription.archived", "subscription", id, null, {});
  revalidatePath(`/app/${orgSlug}/subscriptions`);
  return { ok: true };
}

async function recordAudit(
  orgId: string,
  memberId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  // Audit rows are written only through the hardened SECURITY DEFINER function, which
  // derives the actor server-side (never trusts a client-supplied actor).
  void memberId;
  await supabase.rpc("append_audit", {
    p_org: orgId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_before: before,
    p_after: null,
    p_metadata: metadata,
  });
}

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  if (message.includes("subscription_seats_consistent")) return "Used seats cannot exceed purchased seats.";
  if (message.includes("subscription_custom_interval")) return "Custom cadence needs an interval in months.";
  return "Something went wrong saving this. Please check your input and try again.";
}
