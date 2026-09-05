"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/data/access";
import { announce, appendAudit, DEMO_READONLY_ERROR, resolveActor } from "./_shared";

export type ActionResult = { error?: string; ok?: boolean; slug?: string };

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "Invalid slug"),
  baseCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(1),
  renewalWindowDays: z.number().int().min(1).max(365),
});

export type CreateOrgResult = { error?: string };

export async function createOrganizationAction(input: {
  name: string;
  slug: string;
  baseCurrency: string;
  timezone: string;
  renewalWindowDays: number;
}): Promise<CreateOrgResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "You must be logged in." };
  if (isDemoEmail(userData.user.email)) {
    return { error: "The demo account can't create organizations. Sign up for your own." };
  }

  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_base_currency: parsed.data.baseCurrency,
    p_timezone: parsed.data.timezone,
    p_renewal_window_days: parsed.data.renewalWindowDays,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "That slug is already taken." };
    }
    return { error: error.message };
  }

  redirect(`/app/${parsed.data.slug}`);
}

export async function updateOrganizationAction(orgSlug: string, input: {
  name: string;
  slug: string;
  baseCurrency: string;
  timezone: string;
  renewalWindowDays: number;
}): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can change settings." };
  const { supabase, orgId } = actor;

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      base_currency: parsed.data.baseCurrency,
      timezone: parsed.data.timezone,
      renewal_window_days: parsed.data.renewalWindowDays,
    })
    .eq("id", orgId);

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") return { error: "That slug is already taken." };
    if (error.message.includes("row-level security")) return { error: "You don't have permission to do that." };
    return { error: "Something went wrong saving settings. Please try again." };
  }

  await appendAudit(supabase, orgId, "organization.updated", "organization", orgId, null, {
    name: parsed.data.name,
    base_currency: parsed.data.baseCurrency,
  }, {});
  await announce(supabase, orgId, {
    title: "Organization settings updated",
    body: `Settings were updated (currency ${parsed.data.baseCurrency}).`,
    href: `/app/${parsed.data.slug}/settings`,
    entityType: "organization",
    entityId: orgId,
  });

  revalidatePath(`/app/${parsed.data.slug}`, "layout");
  if (parsed.data.slug !== orgSlug) {
    // The slug is in the URL — send the user to the new address.
    redirect(`/app/${parsed.data.slug}/settings`);
  }
  return { ok: true, slug: parsed.data.slug };
}

export async function transferOwnershipAction(orgSlug: string, newOwnerMemberId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER") return { error: "Only the current owner can transfer ownership." };
  const { supabase, orgId, memberId } = actor;

  if (newOwnerMemberId === memberId) return { error: "You are already the owner." };

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, status, full_name")
    .eq("organization_id", orgId)
    .eq("id", newOwnerMemberId)
    .maybeSingle();
  if (!target || target.status !== "ACTIVE") return { error: "Choose an active member to transfer ownership to." };

  // Promote the new owner, then step the current owner down to admin.
  const { error: promoteErr } = await supabase
    .from("organization_members")
    .update({ role: "OWNER" })
    .eq("organization_id", orgId)
    .eq("id", newOwnerMemberId);
  if (promoteErr) return { error: "Couldn't transfer ownership. Please try again." };
  await supabase.from("organization_members").update({ role: "ADMIN" }).eq("organization_id", orgId).eq("id", memberId);

  await appendAudit(supabase, orgId, "organization.ownership_transferred", "organization_member", newOwnerMemberId, { previous_owner: memberId }, { new_owner: newOwnerMemberId }, {});
  await announce(supabase, orgId, {
    title: "Ownership transferred",
    body: `${target.full_name} is now the organization owner.`,
    href: `/app/${orgSlug}/team/${newOwnerMemberId}`,
    entityType: "member",
    entityId: newOwnerMemberId,
  });
  revalidatePath(`/app/${orgSlug}`, "layout");
  revalidatePath(`/app/${orgSlug}/team`);
  return { ok: true };
}

export async function deleteOrganizationAction(orgSlug: string, confirmName: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER") return { error: "Only the owner can delete the organization." };
  const { supabase, orgId } = actor;

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
  if (!org) return { error: "Organization not found." };
  if (confirmName.trim() !== org.name) return { error: "The name you typed doesn't match." };

  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) {
    if (error.message.includes("row-level security")) return { error: "Only the owner can delete the organization." };
    return { error: "Couldn't delete the organization. Please try again." };
  }
  redirect("/app");
}
