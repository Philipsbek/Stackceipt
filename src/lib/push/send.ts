import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/** Payload delivered to public/sw.js's `push` handler. */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured: boolean | null = null;

/** Configure web-push with VAPID once. Returns false if env is missing. */
function ensureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@stackceipt.app";
  if (!publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  } catch {
    vapidConfigured = false;
  }
  return vapidConfigured;
}

/**
 * Deliver a push to every device belonging to the given members. Best-effort:
 * returns silently (never throws) if push isn't configured, and prunes any
 * subscriptions the push service reports as gone (404/410).
 */
export async function dispatchPushToMembers(
  orgId: string,
  memberIds: string[],
  payload: PushPayload,
): Promise<void> {
  const unique = [...new Set(memberIds)].filter(Boolean);
  if (unique.length === 0) return;
  if (!ensureVapid()) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("organization_id", orgId)
    .in("member_id", unique);
  if (error || !data || data.length === 0) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    (data as PushSubRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the subscription is permanently gone — prune it.
        if (status === 404 || status === 410) staleIds.push(row.id);
      }
    }),
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }
}
