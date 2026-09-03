import { createClient } from "@/lib/supabase/server";
import { annualizedMinor, monthlyMinor } from "@/lib/domain/money";
import { seatSummary, type SeatSummary } from "@/lib/domain/seats";
import { noticeDeadline } from "@/lib/domain/dates";
import type {
  BillingCadence,
  SubscriptionStatus,
} from "@/lib/domain/enums";
import type { Member, Subscription, SubscriptionAssignment } from "@/lib/domain/types";
import { nameFromMembers } from "./access";

/** Columns selected for a subscription, with the department name joined. */
const SUB_SELECT =
  "id, organization_id, department_id, owner_member_id, vendor_name, product_name, description, category, website_url, status, billing_cadence, billing_interval_months, amount_minor, currency, start_date, next_renewal_date, end_date, auto_renews, notice_period_days, seats_purchased, seats_used, contract_reference, notes, last_reviewed_at, last_verified_at, created_by_member_id, archived_at, created_at, updated_at, departments(name)";

type SubRowRaw = {
  id: string; organization_id: string; department_id: string | null; owner_member_id: string | null;
  vendor_name: string; product_name: string; description: string | null; category: string | null;
  website_url: string | null; status: SubscriptionStatus; billing_cadence: BillingCadence;
  billing_interval_months: number | null; amount_minor: number; currency: string;
  start_date: string | null; next_renewal_date: string | null; end_date: string | null;
  auto_renews: boolean; notice_period_days: number; seats_purchased: number | null; seats_used: number | null;
  contract_reference: string | null; notes: string | null; last_reviewed_at: string | null;
  last_verified_at: string | null; created_by_member_id: string; archived_at: string | null;
  created_at: string; updated_at: string; departments: { name: string } | null;
};

export interface SubscriptionRow extends Subscription {
  departmentName: string | null;
  ownerName: string | null;
  monthlyMinor: number;
  annualizedMinor: number;
  seats: SeatSummary;
  noticeDeadline: string | null;
  activeAssignmentCount: number;
}

function toSubscription(r: SubRowRaw): Subscription {
  return {
    id: r.id,
    organizationId: r.organization_id,
    departmentId: r.department_id,
    ownerMemberId: r.owner_member_id,
    vendorName: r.vendor_name,
    productName: r.product_name,
    description: r.description,
    category: r.category,
    websiteUrl: r.website_url,
    status: r.status,
    billingCadence: r.billing_cadence,
    billingIntervalMonths: r.billing_interval_months,
    amountMinor: Number(r.amount_minor),
    currency: r.currency,
    startDate: r.start_date,
    nextRenewalDate: r.next_renewal_date,
    endDate: r.end_date,
    autoRenews: r.auto_renews,
    noticePeriodDays: r.notice_period_days,
    seatsPurchased: r.seats_purchased,
    seatsUsed: r.seats_used,
    contractReference: r.contract_reference,
    notes: r.notes,
    lastReviewedAt: r.last_reviewed_at,
    lastVerifiedAt: r.last_verified_at,
    createdByMemberId: r.created_by_member_id,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function decorate(r: SubRowRaw, members: Member[], activeAssignmentCount: number): SubscriptionRow {
  const s = toSubscription(r);
  return {
    ...s,
    departmentName: r.departments?.name ?? null,
    ownerName: s.ownerMemberId ? nameFromMembers(members, s.ownerMemberId) : null,
    monthlyMinor: monthlyMinor(s.amountMinor, s.billingCadence, s.billingIntervalMonths),
    annualizedMinor: annualizedMinor(s.amountMinor, s.billingCadence, s.billingIntervalMonths),
    seats: seatSummary(s.seatsPurchased, s.seatsUsed),
    noticeDeadline: noticeDeadline(s.nextRenewalDate, s.noticePeriodDays),
    activeAssignmentCount,
  };
}

export interface SubscriptionFilters {
  status?: string;
  departmentId?: string;
  category?: string;
  ownerMemberId?: string;
  search?: string;
  includeArchived?: boolean;
  sort?: "cost_desc" | "cost_asc" | "renewal" | "vendor" | "updated";
}

async function assignmentCounts(organizationId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_members")
    .select("subscription_id")
    .eq("organization_id", organizationId)
    .is("unassigned_at", null);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = (row as { subscription_id: string }).subscription_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function listSubscriptions(
  organizationId: string,
  members: Member[],
  filters: SubscriptionFilters = {},
): Promise<SubscriptionRow[]> {
  const supabase = await createClient();
  let query = supabase.from("subscriptions").select(SUB_SELECT).eq("organization_id", organizationId);

  if (!filters.includeArchived) query = query.neq("status", "ARCHIVED");
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.ownerMemberId) query = query.eq("owner_member_id", filters.ownerMemberId);
  if (filters.search) {
    const q = filters.search.replace(/[%,]/g, "");
    query = query.or(`vendor_name.ilike.%${q}%,product_name.ilike.%${q}%,category.ilike.%${q}%`);
  }

  const { data } = await query;
  const counts = await assignmentCounts(organizationId);
  const rows = ((data ?? []) as unknown as SubRowRaw[]).map((r) => decorate(r, members, counts.get(r.id) ?? 0));

  switch (filters.sort) {
    case "cost_asc": rows.sort((a, b) => a.annualizedMinor - b.annualizedMinor); break;
    case "renewal": rows.sort((a, b) => (a.nextRenewalDate ?? "9999").localeCompare(b.nextRenewalDate ?? "9999")); break;
    case "vendor": rows.sort((a, b) => a.vendorName.localeCompare(b.vendorName)); break;
    case "updated": rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); break;
    default: rows.sort((a, b) => b.annualizedMinor - a.annualizedMinor); break;
  }
  return rows;
}

export async function getSubscription(
  organizationId: string,
  id: string,
  members: Member[],
): Promise<SubscriptionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(SUB_SELECT)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const counts = await assignmentCounts(organizationId);
  const r = data as unknown as SubRowRaw;
  return decorate(r, members, counts.get(r.id) ?? 0);
}

export async function assignmentsFor(
  organizationId: string,
  subscriptionId: string,
): Promise<SubscriptionAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_members")
    .select("id, organization_id, subscription_id, member_id, assigned_by_member_id, assigned_at, unassigned_at, notes")
    .eq("organization_id", organizationId)
    .eq("subscription_id", subscriptionId);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    organizationId: r.organization_id as string,
    subscriptionId: r.subscription_id as string,
    memberId: r.member_id as string,
    assignedByMemberId: r.assigned_by_member_id as string,
    assignedAt: r.assigned_at as string,
    unassignedAt: (r.unassigned_at as string) ?? null,
    notes: (r.notes as string) ?? null,
  }));
}

export async function distinctCategories(organizationId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("category")
    .eq("organization_id", organizationId)
    .not("category", "is", null);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category: string | null }).category;
    if (c) set.add(c);
  }
  return [...set].sort();
}

export async function listDepartmentsBasic(
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}
