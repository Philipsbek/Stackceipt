"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEMO_READONLY_ERROR, resolveActor } from "@/lib/actions/_shared";
import type { OrganizationRole } from "@/lib/domain/enums";

export type InviteActionResult = { error?: string; link?: string };

export async function createInvitationAction(
  orgSlug: string,
  email: string,
  role: OrganizationRole,
): Promise<InviteActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Organization not found or access denied." };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (!(["OWNER", "ADMIN"] as OrganizationRole[]).includes(actor.role)) {
    return { error: "Only owners and admins can invite members." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    return { error: "Enter a valid email address." };
  }
  if (!(["ADMIN", "MANAGER", "MEMBER"] as OrganizationRole[]).includes(role)) {
    return { error: "Choose a valid role." };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await actor.supabase.rpc("create_invitation", {
    p_org: actor.orgId,
    p_email: normalizedEmail,
    p_role: role,
    p_raw_token: token,
    p_expires_at: expiresAt,
  });
  if (error) {
    const message = error.message.includes("already a member")
      ? "That email is already a member of this organization."
      : "Could not create the invitation. Please try again.";
    return { error: message };
  }

  revalidatePath(`/app/${orgSlug}/team`);
  return { link: `/invite/${token}` };
}

export async function acceptInvitationAction(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sign in with the invited email to continue." };

  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_raw_token: token });
  if (error || !orgId) {
    if (error?.message.includes("different email")) {
      return { error: "You are signed in with a different email address than this invitation." };
    }
    return { error: error?.message ?? "This invitation is invalid, expired, or already used." };
  }

  const { data: org } = await supabase.from("organizations").select("slug").eq("id", orgId).single();
  if (!org) return { error: "Invitation accepted, but the organization could not be loaded." };
  redirect(`/app/${org.slug}`);
}
