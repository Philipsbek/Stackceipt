"use server";

import { revalidatePath } from "next/cache";
import { announce, appendAudit, DEMO_READONLY_ERROR, resolveActor } from "./_shared";

export type ActionResult = { error?: string; ok?: boolean; id?: string };

export interface DepartmentInput {
  name: string;
  description?: string;
  managerMemberId?: string; // "" / "none" => unassigned
}

function friendly(message: string): string {
  if (message.includes("row-level security")) return "Only owners and admins can manage departments.";
  if (message.includes("departments_org_name_active") || message.includes("duplicate key")) {
    return "A department with that name already exists.";
  }
  if (message.includes("departments_name_check") || message.includes("check constraint")) {
    return "A department name must be between 1 and 120 characters.";
  }
  return "Something went wrong saving this department. Please try again.";
}

function clean(input: DepartmentInput): { name: string; description: string | null; managerMemberId: string | null } | null {
  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 120) return null;
  const description = (input.description ?? "").trim();
  const manager = (input.managerMemberId ?? "").trim();
  return {
    name,
    description: description.length ? description : null,
    managerMemberId: manager && manager !== "none" ? manager : null,
  };
}

export async function createDepartmentAction(orgSlug: string, input: DepartmentInput): Promise<ActionResult> {
  const fields = clean(input);
  if (!fields) return { error: "A department name must be between 1 and 120 characters." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can create departments." };
  const { supabase, orgId, memberId } = actor;

  const { data, error } = await supabase
    .from("departments")
    .insert({
      organization_id: orgId,
      name: fields.name,
      description: fields.description,
      manager_member_id: fields.managerMemberId,
      created_by_member_id: memberId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: friendly(error?.message ?? "insert failed") };
  const id = data.id as string;

  await appendAudit(supabase, orgId, "department.created", "department", id, null, { name: fields.name }, {});
  await announce(supabase, orgId, {
    title: "New department created",
    body: `${fields.name} was added.`,
    href: `/app/${orgSlug}/departments`,
    entityType: "department",
    entityId: id,
  });
  revalidatePath(`/app/${orgSlug}/departments`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true, id };
}

export async function updateDepartmentAction(orgSlug: string, id: string, input: DepartmentInput): Promise<ActionResult> {
  const fields = clean(input);
  if (!fields) return { error: "A department name must be between 1 and 120 characters." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can edit departments." };
  const { supabase, orgId } = actor;

  const { data: updated, error } = await supabase
    .from("departments")
    .update({
      name: fields.name,
      description: fields.description,
      manager_member_id: fields.managerMemberId,
    })
    .eq("organization_id", orgId)
    .eq("id", id)
    .is("archived_at", null)
    .select("id");

  if (error) return { error: friendly(error.message) };
  if (!updated || updated.length === 0) return { error: "This department could not be found." };

  await appendAudit(supabase, orgId, "department.updated", "department", id, null, { name: fields.name }, {});
  await announce(supabase, orgId, {
    title: "Department updated",
    body: `${fields.name} was updated.`,
    href: `/app/${orgSlug}/departments`,
    entityType: "department",
    entityId: id,
  });
  revalidatePath(`/app/${orgSlug}/departments`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true, id };
}
