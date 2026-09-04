"use server";

import { revalidatePath } from "next/cache";
import { DEMO_READONLY_ERROR, resolveActor } from "./_shared";

export type ActionResult = { error?: string; ok?: boolean };

/** Revalidate the notifications page and the shell layout (unread bell badge). */
function revalidate(orgSlug: string) {
  revalidatePath(`/app/${orgSlug}/notifications`);
  revalidatePath(`/app/${orgSlug}`, "layout");
}

export async function markNotificationReadAction(orgSlug: string, notificationId: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  // The demo guest account is shared, so its read state is left untouched.
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  const { supabase, orgId, memberId } = actor;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("recipient_member_id", memberId)
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) return { error: "Couldn't update that notification. Please try again." };
  revalidate(orgSlug);
  return { ok: true };
}

export async function markAllNotificationsReadAction(orgSlug: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  const { supabase, orgId, memberId } = actor;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("recipient_member_id", memberId)
    .is("read_at", null);

  if (error) return { error: "Couldn't update your notifications. Please try again." };
  revalidate(orgSlug);
  return { ok: true };
}
