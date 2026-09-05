/**
 * Seed the public read-only DEMO organization.
 *
 * Uses only the ANON key + the demo guest credentials (no service-role key). It signs
 * in (or signs up) the demo guest, then creates the "demo" org and its data through the
 * normal RLS-protected paths (the guest is the org OWNER). Re-running deletes and
 * recreates the demo org, so it's idempotent.
 *
 * Requires in the environment (e.g. .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DEMO_EMAIL, DEMO_PASSWORD
 * Run: npm run seed:demo   (Supabase "Confirm email" must be OFF)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;

if (!url || !anon || !email || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DEMO_EMAIL, DEMO_PASSWORD.");
  process.exit(1);
}

const db = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  // 1) Authenticate the demo guest (sign in, or sign up on first run).
  let signedIn = await db.auth.signInWithPassword({ email: email!, password: password! });
  if (signedIn.error) {
    const su = await db.auth.signUp({ email: email!, password: password!, options: { data: { full_name: "Demo Guest" } } });
    if (su.error) throw su.error;
    if (!su.data.session) {
      signedIn = await db.auth.signInWithPassword({ email: email!, password: password! });
      if (signedIn.error) throw new Error("Could not sign in after sign-up — is Supabase 'Confirm email' turned OFF?");
    }
  }
  const { data: userData } = await db.auth.getUser();
  const userId = userData.user!.id;
  await db.from("profiles").update({ full_name: "Demo Guest" }).eq("id", userId);

  // 2) Reset: delete any existing demo org (owner can delete; cascades to children).
  const { data: existing } = await db.from("organizations").select("id").eq("slug", "demo").maybeSingle();
  if (existing) await db.from("organizations").delete().eq("id", existing.id);

  // 3) Create the org + owner membership atomically.
  const { data: orgId, error: orgErr } = await db.rpc("create_organization", {
    p_name: "Northwind Labs",
    p_slug: "demo",
    p_base_currency: "USD",
    p_timezone: "America/New_York",
    p_renewal_window_days: 90,
  });
  if (orgErr) throw orgErr;

  const { data: member } = await db
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .single();
  const owner = member!.id as string;

  // 4) Departments.
  const dept: Record<string, string> = {};
  for (const name of ["Engineering", "Design", "Marketing", "Finance & Ops"]) {
    const { data: d, error } = await db
      .from("departments")
      .insert({ organization_id: orgId, name, created_by_member_id: owner })
      .select("id")
      .single();
    if (error) throw error;
    dept[name] = d!.id as string;
  }

  // 5) Subscriptions — variety of cadences, statuses, seat utilization, and a couple of
  //    intentional gaps (no owner / no department) so the Janitor has findings to show.
  // start_date values are spread across the past year so the dashboard's monthly
  // recurring trend shows realistic growth (subscriptions adopted over time).
  const subs: Array<Record<string, unknown>> = [
    { vendor_name: "Figma", product_name: "Organization", category: "Design", department_id: dept["Design"], owner_member_id: owner, billing_cadence: "MONTHLY", amount_minor: 4500, seats_purchased: 12, seats_used: 5, start_date: "2025-02-15", next_renewal_date: "2026-11-20" },
    { vendor_name: "Slack", product_name: "Business+", category: "Communication", department_id: dept["Engineering"], owner_member_id: owner, billing_cadence: "MONTHLY", amount_minor: 1500, seats_purchased: 60, seats_used: 52, start_date: "2025-05-10", next_renewal_date: "2026-09-25" },
    { vendor_name: "GitHub", product_name: "Enterprise", category: "Engineering", department_id: dept["Engineering"], owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 2100000, seats_purchased: 45, seats_used: 40, start_date: "2025-06-01", next_renewal_date: "2026-09-20", notice_period_days: 30 },
    { vendor_name: "Notion", product_name: "Team", category: "Productivity", department_id: dept["Marketing"], owner_member_id: null, billing_cadence: "MONTHLY", amount_minor: 1000, seats_purchased: 30, seats_used: 21, start_date: "2026-02-20", next_renewal_date: "2026-10-05" },
    { vendor_name: "Adobe", product_name: "Creative Cloud", category: "Design", department_id: dept["Design"], owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 599900, seats_purchased: 15, seats_used: 4, start_date: "2026-03-05", next_renewal_date: "2026-12-01" },
    { vendor_name: "Salesforce", product_name: "Sales Cloud", category: "CRM", department_id: dept["Marketing"], owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 3600000, seats_purchased: 20, seats_used: 19, start_date: "2026-04-12", next_renewal_date: "2026-11-30", notice_period_days: 60 },
    { vendor_name: "Datadog", product_name: "Pro", category: "Engineering", department_id: dept["Engineering"], owner_member_id: owner, billing_cadence: "MONTHLY", amount_minor: 84000, seats_purchased: 45, seats_used: 45, start_date: "2026-05-20", next_renewal_date: "2026-10-15" },
    { vendor_name: "Zoom", product_name: "Business", category: "Communication", department_id: null, owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 19990, seats_purchased: 25, seats_used: 18, start_date: "2026-06-15", next_renewal_date: "2027-02-10" },
    { vendor_name: "1Password", product_name: "Business", category: "Security", department_id: dept["Finance & Ops"], owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 799900, seats_purchased: 80, seats_used: 72, start_date: "2026-07-08", next_renewal_date: "2027-01-15" },
    { vendor_name: "Dropbox", product_name: "Business", category: "Storage", department_id: dept["Finance & Ops"], owner_member_id: owner, billing_cadence: "ANNUAL", amount_minor: 240000, seats_purchased: 10, seats_used: 3, start_date: "2026-09-02", next_renewal_date: "2027-03-01", last_verified_at: null },
    { vendor_name: "Brightpath", product_name: "Onboarding Consulting", category: "Services", department_id: dept["Finance & Ops"], owner_member_id: owner, billing_cadence: "ONE_TIME", amount_minor: 1500000, auto_renews: false, start_date: "2026-01-10", next_renewal_date: null },
  ];
  for (const s of subs) {
    const { error } = await db.from("subscriptions").insert({
      organization_id: orgId,
      created_by_member_id: owner,
      currency: "USD",
      status: "ACTIVE",
      auto_renews: true,
      notice_period_days: 30,
      last_verified_at: new Date().toISOString(),
      ...s,
    });
    if (error) throw error;
  }

  // 6) A couple of pending requests so the dashboard/requests screens aren't empty.
  await db.from("subscription_requests").insert([
    {
      organization_id: orgId, requested_by_member_id: owner, department_id: dept["Engineering"],
      vendor_name: "Sentry", product_name: "Team",
      business_justification: "Error monitoring for the new mobile app so we can triage production crashes quickly.",
      requested_seats: 10, amount_minor: 8000, currency: "USD", billing_cadence: "MONTHLY", status: "SUBMITTED",
    },
    {
      organization_id: orgId, requested_by_member_id: owner, department_id: dept["Marketing"],
      vendor_name: "Ahrefs", product_name: "Advanced",
      business_justification: "SEO tooling to support the Q4 content push and competitor tracking.",
      requested_seats: 3, amount_minor: 39900, currency: "USD", billing_cadence: "MONTHLY", status: "SUBMITTED",
    },
  ]);

  // 7) A scheduled review on the biggest subscription.
  const { data: sf } = await db.from("subscriptions").select("id").eq("organization_id", orgId).eq("vendor_name", "Salesforce").single();
  if (sf) {
    await db.from("subscription_reviews").insert({
      organization_id: orgId, subscription_id: sf.id, scheduled_for: "2026-09-30",
      assigned_to_member_id: owner, status: "SCHEDULED", created_by_member_id: owner,
    });
  }

  console.log(`Demo org ready: slug "demo", ${subs.length} subscriptions. Sign in as ${email}.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
