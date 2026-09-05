import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchPushToMembers } from "@/lib/push/send";
import { todayInTimezone, addDays, diffDays, formatDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";

// Uses web-push + service-role Supabase — must run on the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many days ahead of a renewal to send the reminder.
const REMINDER_LEAD_DAYS = 7;

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  base_currency: string;
}
interface SubRow {
  id: string;
  organization_id: string;
  product_name: string;
  vendor_name: string;
  amount_minor: number;
  currency: string;
  next_renewal_date: string;
  owner_member_id: string | null;
}
interface MemberRow {
  id: string;
  role: string;
}

/**
 * Daily renewal reminders. Finds subscriptions renewing within the lead window
 * and notifies owners/admins + the subscription owner — once per renewal cycle
 * (deduped by dedupe_key) — both in-app and via Web Push.
 *
 * Secured by CRON_SECRET: Vercel Cron sends `Authorization: Bearer <secret>`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 404 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }

  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .select("id, slug, name, timezone, base_currency");
  if (orgErr) {
    return NextResponse.json({ error: "Could not load organizations." }, { status: 500 });
  }

  let remindersSent = 0;
  let subsMatched = 0;

  for (const org of (orgs ?? []) as OrgRow[]) {
    const today = todayInTimezone(org.timezone);
    const horizon = addDays(today, REMINDER_LEAD_DAYS);

    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, organization_id, product_name, vendor_name, amount_minor, currency, next_renewal_date, owner_member_id")
      .eq("organization_id", org.id)
      .in("status", ["ACTIVE", "TRIAL"])
      .is("archived_at", null)
      .not("next_renewal_date", "is", null)
      .gte("next_renewal_date", today)
      .lte("next_renewal_date", horizon);

    const dueSubs = (subs ?? []) as SubRow[];
    if (dueSubs.length === 0) continue;
    subsMatched += dueSubs.length;

    // Skip renewals we've already reminded about this cycle.
    const dedupeKeys = dueSubs.map((s) => `renewal:${s.id}:${s.next_renewal_date}`);
    const { data: existing } = await admin
      .from("notifications")
      .select("dedupe_key")
      .eq("organization_id", org.id)
      .in("dedupe_key", dedupeKeys);
    const alreadySent = new Set((existing ?? []).map((r) => (r as { dedupe_key: string }).dedupe_key));

    // Recipients: active owners/admins, plus each subscription's owner.
    const { data: members } = await admin
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", org.id)
      .eq("status", "ACTIVE");
    const activeMembers = (members ?? []) as MemberRow[];
    const activeIds = new Set(activeMembers.map((m) => m.id));
    const adminIds = activeMembers.filter((m) => m.role === "OWNER" || m.role === "ADMIN").map((m) => m.id);

    for (const sub of dueSubs) {
      const dedupeKey = `renewal:${sub.id}:${sub.next_renewal_date}`;
      if (alreadySent.has(dedupeKey)) continue;

      const recipients = [...new Set([...adminIds, ...(sub.owner_member_id ? [sub.owner_member_id] : [])])]
        .filter((id) => activeIds.has(id));
      if (recipients.length === 0) continue;

      const days = diffDays(today, sub.next_renewal_date);
      const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      const amount = formatMoney(sub.amount_minor, sub.currency || org.base_currency, { showCents: false });
      const title = `Renewal ${when}: ${sub.product_name}`;
      const body = `${sub.vendor_name} · ${amount} renews ${formatDate(sub.next_renewal_date)}.`;
      const href = `/app/${org.slug}/subscriptions/${sub.id}`;

      const { error: insErr } = await admin.from("notifications").insert(
        recipients.map((memberId) => ({
          organization_id: org.id,
          recipient_member_id: memberId,
          type: "RENEWAL_APPROACHING",
          title,
          body,
          href,
          entity_type: "subscription",
          entity_id: sub.id,
          dedupe_key: dedupeKey,
        })),
      );
      if (insErr) continue;

      remindersSent += 1;
      await dispatchPushToMembers(org.id, recipients, {
        title,
        body,
        url: href,
        tag: dedupeKey,
      });
    }
  }

  return NextResponse.json({ ok: true, subsMatched, remindersSent });
}
