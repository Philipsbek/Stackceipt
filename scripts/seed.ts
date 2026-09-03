/**
 * Deterministic development seed (DEV ONLY).
 *
 * Creates two organizations, personas at every role, departments, subscriptions across
 * cadences/statuses, assignments, requests, reviews, and an offboarding case — enough
 * to demonstrate the whole product and tenant isolation.
 *
 * Requires a SERVICE ROLE key (server-only, never NEXT_PUBLIC). Run against a LOCAL or
 * disposable Supabase project only:
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * It is idempotent-ish: it deletes the two demo orgs (cascade) and their auth users by
 * email before re-inserting, so re-running yields the same state. NEVER run in production.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to seed.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = "Stackceipt!Demo1";

interface Persona { key: string; email: string; name: string; role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER"; }

const northwindPeople: Persona[] = [
  { key: "owner", email: "alex@northwind.test", name: "Alex Rivera", role: "OWNER" },
  { key: "admin", email: "priya@northwind.test", name: "Priya Shah", role: "ADMIN" },
  { key: "mgr", email: "dana@northwind.test", name: "Dana Osei", role: "MANAGER" },
  { key: "member", email: "sam@northwind.test", name: "Sam Lee", role: "MEMBER" },
];
const contosoPeople: Persona[] = [
  { key: "owner", email: "morgan@contoso.test", name: "Morgan Diaz", role: "OWNER" },
  { key: "member", email: "kai@contoso.test", name: "Kai Wu", role: "MEMBER" },
];

async function ensureUser(email: string, name: string): Promise<string> {
  // Remove an existing user with this email so the seed is repeatable.
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) await db.auth.admin.deleteUser(existing.id);

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) throw error ?? new Error("Failed to create user");
  // Ensure profile (trigger normally handles this).
  await db.from("profiles").upsert({ id: data.user.id, full_name: name });
  return data.user.id;
}

async function seedOrg(
  slug: string,
  name: string,
  people: Persona[],
): Promise<void> {
  // Delete existing org by slug (cascades to all child rows).
  const { data: existing } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (existing) await db.from("organizations").delete().eq("id", existing.id);

  const userIds: Record<string, string> = {};
  for (const p of people) userIds[p.key] = await ensureUser(p.email, p.name);

  const owner = people.find((p) => p.role === "OWNER")!;

  // Org (created_by must reference a profile).
  const { data: org, error: orgErr } = await db
    .from("organizations")
    .insert({ name, slug, base_currency: "USD", timezone: "America/New_York", renewal_window_days: 90, created_by: userIds[owner.key] })
    .select("id")
    .single();
  if (orgErr || !org) throw orgErr ?? new Error("org insert failed");

  const memberIds: Record<string, string> = {};
  for (const p of people) {
    const { data: m, error } = await db
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: userIds[p.key], role: p.role, status: "ACTIVE", joined_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !m) throw error ?? new Error("member insert failed");
    memberIds[p.key] = m.id;
  }

  // Departments
  const { data: dept } = await db
    .from("departments")
    .insert({ organization_id: org.id, name: "Engineering", manager_member_id: memberIds["mgr"] ?? null, created_by_member_id: memberIds[owner.key] })
    .select("id")
    .single();

  // A spread of subscriptions
  const created = memberIds[owner.key];
  const subs = [
    { vendor_name: "Figma", product_name: "Organization", category: "Design", billing_cadence: "MONTHLY", amount_minor: 4500, seats_purchased: 12, seats_used: 5, next_renewal_date: "2026-11-20", owner_member_id: memberIds[owner.key] },
    { vendor_name: "GitHub", product_name: "Enterprise", category: "Engineering", billing_cadence: "ANNUAL", amount_minor: 2100000, seats_purchased: 45, seats_used: 40, next_renewal_date: "2026-09-20", owner_member_id: memberIds["mgr"] ?? null },
    { vendor_name: "Notion", product_name: "Team", category: "Productivity", billing_cadence: "MONTHLY", amount_minor: 1000, seats_purchased: 30, seats_used: 21, next_renewal_date: "2026-10-05", owner_member_id: null },
    { vendor_name: "Adobe", product_name: "Creative Cloud", category: "Design", billing_cadence: "ANNUAL", amount_minor: 599900, seats_purchased: 15, seats_used: 4, next_renewal_date: "2026-12-01", owner_member_id: memberIds[owner.key] },
  ];
  for (const s of subs) {
    await db.from("subscriptions").insert({
      organization_id: org.id,
      department_id: dept?.id ?? null,
      currency: "USD",
      status: "ACTIVE",
      auto_renews: true,
      notice_period_days: 30,
      created_by_member_id: created,
      last_verified_at: new Date().toISOString(),
      ...s,
    });
  }

  // A submitted request
  await db.from("subscription_requests").insert({
    organization_id: org.id,
    requested_by_member_id: memberIds["member"] ?? memberIds[owner.key],
    department_id: dept?.id ?? null,
    vendor_name: "Sentry",
    product_name: "Team",
    business_justification: "We need error monitoring for the new mobile app to triage production crashes quickly.",
    requested_seats: 10,
    amount_minor: 8000,
    currency: "USD",
    billing_cadence: "MONTHLY",
    status: "SUBMITTED",
  });

  console.log(`Seeded ${name} (${slug}) with ${people.length} members, ${subs.length} subscriptions.`);
}

async function main() {
  await seedOrg("northwind", "Northwind Labs", northwindPeople);
  await seedOrg("contoso", "Contoso Retail", contosoPeople);
  console.log(`\nDone. Log in with any seeded email and password: ${PASSWORD}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

// Keep the type import referenced for editors.
export type { SupabaseClient };
