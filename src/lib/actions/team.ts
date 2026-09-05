"use server";

import { revalidatePath } from "next/cache";
import { announce, appendAudit, DEMO_READONLY_ERROR, notify, resolveActor, type Supa } from "./_shared";
import { ORGANIZATION_ROLES, ROLE_LABELS, type OrganizationRole } from "@/lib/domain/enums";

export type ActionResult = { error?: string; ok?: boolean };

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}

async function activeOwnerCount(supabase: Supa, orgId: string): Promise<number> {
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "ACTIVE")
    .eq("role", "OWNER");
  return (data ?? []).length;
}

export async function changeMemberRoleAction(orgSlug: string, memberId: string, role: OrganizationRole): Promise<ActionResult> {
  if (!ORGANIZATION_ROLES.includes(role)) return { error: "Choose a valid role." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can change roles." };
  const { supabase, orgId, memberId: actorMemberId } = actor;

  if (memberId === actorMemberId) return { error: "You can't change your own role." };

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, role, status, full_name")
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .maybeSingle();
  if (!target) return { error: "Member not found" };
  if (target.role === role) return { error: `They are already a ${ROLE_LABELS[role]}.` };

  // Never leave the organization without an owner.
  if (target.role === "OWNER" && role !== "OWNER" && (await activeOwnerCount(supabase, orgId)) <= 1) {
    return { error: "You can't demote the last owner. Promote someone else to owner first." };
  }

  const { data: updated, error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "Couldn't update that member." };

  await appendAudit(supabase, orgId, "member.role_changed", "organization_member", memberId, { role: target.role }, { role }, {});
  await notify(supabase, orgId, [memberId], {
    type: "MEMBERSHIP_CHANGED",
    title: "Your role changed",
    body: `You are now a ${ROLE_LABELS[role]}.`,
    href: `/app/${orgSlug}/team/${memberId}`,
    entityType: "member",
    entityId: memberId,
  });
  await announce(supabase, orgId, {
    title: "Member role changed",
    body: `${target.full_name} is now a ${ROLE_LABELS[role]}.`,
    href: `/app/${orgSlug}/team/${memberId}`,
    entityType: "member",
    entityId: memberId,
  });
  revalidatePath(`/app/${orgSlug}/team/${memberId}`);
  revalidatePath(`/app/${orgSlug}/team`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}

export async function removeMemberAction(orgSlug: string, memberId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can remove members." };
  const { supabase, orgId, memberId: actorMemberId } = actor;

  if (memberId === actorMemberId) return { error: "You can't remove yourself." };

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, role, status, full_name")
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .maybeSingle();
  if (!target) return { error: "Member not found" };
  if (target.status === "REMOVED") return { error: "That member is already removed." };
  if (target.role === "OWNER") return { error: "You can't remove the owner. Transfer ownership first." };

  // Soft-remove: keep history and references intact.
  const { data: updated, error } = await supabase
    .from("organization_members")
    .update({ status: "REMOVED" })
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "Couldn't remove that member." };

  await appendAudit(supabase, orgId, "member.removed", "organization_member", memberId, { status: target.status }, { status: "REMOVED" }, {});
  await announce(supabase, orgId, {
    title: "Member removed",
    body: `${target.full_name} was removed from the organization.`,
    href: `/app/${orgSlug}/team`,
    entityType: "member",
    entityId: memberId,
  });
  revalidatePath(`/app/${orgSlug}/team`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}

export async function setMemberSuspendedAction(orgSlug: string, memberId: string, suspend: boolean): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can suspend members." };
  const { supabase, orgId, memberId: actorMemberId } = actor;

  if (memberId === actorMemberId) return { error: "You can't suspend yourself." };

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, role, status, full_name")
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .maybeSingle();
  if (!target) return { error: "Member not found" };

  const nextStatus = suspend ? "SUSPENDED" : "ACTIVE";
  if (target.status === nextStatus) return { error: `They are already ${suspend ? "suspended" : "active"}.` };
  if (suspend && target.role === "OWNER" && (await activeOwnerCount(supabase, orgId)) <= 1) {
    return { error: "You can't suspend the last owner." };
  }

  const { data: updated, error } = await supabase
    .from("organization_members")
    .update({ status: nextStatus })
    .eq("organization_id", orgId)
    .eq("id", memberId)
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "Couldn't update that member." };

  await appendAudit(supabase, orgId, suspend ? "member.suspended" : "member.reactivated", "organization_member", memberId, { status: target.status }, { status: nextStatus }, {});
  await announce(supabase, orgId, {
    title: suspend ? "Member suspended" : "Member reactivated",
    body: `${target.full_name} was ${suspend ? "suspended" : "reactivated"}.`,
    href: `/app/${orgSlug}/team/${memberId}`,
    entityType: "member",
    entityId: memberId,
  });
  revalidatePath(`/app/${orgSlug}/team/${memberId}`);
  revalidatePath(`/app/${orgSlug}/team`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}
