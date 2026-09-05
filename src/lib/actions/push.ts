"use server";

import { resolveActor } from "./_shared";
import type { SerializedSubscription } from "@/lib/push/client";

/**
 * Register (or refresh) a Web Push subscription for the current user's device.
 * Stored per (member, endpoint); re-subscribing upserts. RLS ensures a user can
 * only write their own row (user_id = auth.uid()).
 */
export async function savePushSubscriptionAction(
  orgSlug: string,
  sub: SerializedSubscription,
): Promise<{ ok?: true; error?: string }> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized." };
  if (actor.isReadOnly) return { error: "Notifications aren't available in the read-only demo." };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { error: "Invalid subscription." };

  const { data: userData } = await actor.supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: "Not authorized." };

  const { error } = await actor.supabase
    .from("push_subscriptions")
    .upsert(
      {
        organization_id: actor.orgId,
        member_id: actor.memberId,
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "member_id,endpoint" },
    );

  if (error) return { error: "Could not save your notification settings." };
  return { ok: true };
}

/** Remove a device subscription (called when the user turns notifications off). */
export async function deletePushSubscriptionAction(
  orgSlug: string,
  endpoint: string,
): Promise<{ ok?: true; error?: string }> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized." };
  if (!endpoint) return { ok: true };

  const { error } = await actor.supabase
    .from("push_subscriptions")
    .delete()
    .eq("member_id", actor.memberId)
    .eq("endpoint", endpoint);

  if (error) return { error: "Could not update your notification settings." };
  return { ok: true };
}
