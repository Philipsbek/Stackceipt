"use server";

import { revalidatePath } from "next/cache";
import { appendAudit, announce, DEMO_READONLY_ERROR, resolveActor } from "./_shared";
import { BILLING_CADENCES, type BillingCadence } from "@/lib/domain/enums";

export type ImportResult = { error?: string; imported?: number; skipped?: number; errors?: string[] };

/** Minimal RFC-4180-ish CSV parser (handles quotes, commas, and newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const COLUMN_ALIASES: Record<string, string[]> = {
  vendor: ["vendor", "vendor_name", "vendor name"],
  product: ["product", "product_name", "product name", "tool", "name"],
  category: ["category"],
  amount: ["amount", "cost", "price", "monthly_cost", "monthly cost", "monthly"],
  cadence: ["cadence", "billing_cadence", "billing", "billing cadence", "frequency"],
  renewal: ["renewal", "next_renewal", "next_renewal_date", "renews", "renewal_date", "next renewal"],
  seats: ["seats", "seats_purchased", "licenses"],
};

function headerIndex(header: string[]): Record<string, number> {
  const norm = header.map((h) => h.trim().toLowerCase());
  const map: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = norm.findIndex((h) => aliases.includes(h));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

function normalizeCadence(raw: string): BillingCadence {
  const v = raw.trim().toUpperCase();
  return (BILLING_CADENCES as readonly string[]).includes(v) ? (v as BillingCadence) : "MONTHLY";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function importSubscriptionsAction(orgSlug: string, csvText: string): Promise<ImportResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can import subscriptions." };
  const { supabase, orgId, memberId, baseCurrency } = actor;

  const rows = parseCsv(csvText);
  if (rows.length < 2) return { error: "The file needs a header row and at least one data row." };

  const cols = headerIndex(rows[0]!);
  if (cols.vendor === undefined && cols.product === undefined) {
    return { error: "Couldn't find a vendor or product column. Include a header row like: vendor,product,amount,cadence,renewal." };
  }

  const errors: string[] = [];
  const inserts: Record<string, unknown>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const cell = (key: string) => (cols[key] !== undefined ? (r[cols[key]!] ?? "").trim() : "");
    const vendor = cell("vendor") || cell("product");
    const product = cell("product") || cell("vendor");
    if (!vendor || !product) {
      errors.push(`Row ${i + 1}: missing vendor/product`);
      continue;
    }
    const amountRaw = cell("amount").replace(/[^0-9.\-]/g, "");
    const amount = amountRaw === "" ? NaN : Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`Row ${i + 1}: invalid amount`);
      continue;
    }
    const renewal = cell("renewal");
    const seatsRaw = cell("seats").replace(/[^0-9]/g, "");
    inserts.push({
      organization_id: orgId,
      vendor_name: vendor.slice(0, 120),
      product_name: product.slice(0, 120),
      category: cell("category") || null,
      status: "ACTIVE",
      billing_cadence: normalizeCadence(cell("cadence")),
      amount_minor: Math.round(amount * 100),
      currency: baseCurrency,
      next_renewal_date: ISO_DATE.test(renewal) ? renewal : null,
      auto_renews: true,
      notice_period_days: 30,
      seats_purchased: seatsRaw ? Number(seatsRaw) : null,
      created_by_member_id: memberId,
    });
  }

  if (inserts.length === 0) {
    return { error: "No valid rows to import.", errors };
  }

  const { data, error } = await supabase.from("subscriptions").insert(inserts).select("id");
  if (error) {
    if (error.message.includes("row-level security")) return { error: "You don't have permission to import here." };
    return { error: "The import failed. Please check the file and try again.", errors };
  }
  const imported = data?.length ?? 0;

  await appendAudit(supabase, orgId, "subscription.imported", "organization", orgId, null, { count: imported }, {});
  await announce(supabase, orgId, {
    title: "Subscriptions imported",
    body: `${imported} subscription${imported === 1 ? "" : "s"} were imported from a CSV.`,
    href: `/app/${orgSlug}/subscriptions`,
    entityType: "subscription",
    entityId: null,
  });
  revalidatePath(`/app/${orgSlug}/subscriptions`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { imported, skipped: errors.length, errors };
}
