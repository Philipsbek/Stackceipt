import { createClient } from "@/lib/supabase/server";
import { sumMinor } from "@/lib/domain/money";
import { isWithinWindow, todayInTimezone } from "@/lib/domain/dates";
import type { Member, Organization } from "@/lib/domain/types";
import { listSubscriptions, type SubscriptionRow } from "./subscriptions";
import { listFindings } from "./janitor";

export interface DashboardData {
  monthlyRecurringMinor: number;
  annualCommittedMinor: number;
  activeCount: number;
  renewalsInWindow: SubscriptionRow[];
  openRequests: number;
  reviewsDue: number;
  openFindings: number;
  openOffboardingTasks: number;
  byDepartment: {
    name: string;
    annualizedMinor: number;
    segments: { category: string; annualizedMinor: number }[];
  }[];
  byCategory: { name: string; annualizedMinor: number }[];
  currency: string;
  renewalWindowDays: number;
}

export async function getDashboardData(org: Organization, members: Member[]): Promise<DashboardData> {
  const supabase = await createClient();
  const today = todayInTimezone(org.timezone);

  // Everything below is independent — fetch it all in parallel.
  const [subs, openReq, reviewsQ, tasksQ, findings] = await Promise.all([
    listSubscriptions(org.id, members),
    supabase.from("subscription_requests").select("id", { count: "exact", head: true }).eq("organization_id", org.id).eq("status", "SUBMITTED"),
    supabase.from("subscription_reviews").select("id", { count: "exact", head: true }).eq("organization_id", org.id).in("status", ["SCHEDULED", "IN_PROGRESS"]),
    supabase.from("offboarding_tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id).eq("status", "PENDING"),
    listFindings(org),
  ]);
  const recurring = subs.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL");

  const monthlyRecurringMinor = sumMinor(recurring.map((s) => s.monthlyMinor));
  const annualCommittedMinor = sumMinor(recurring.map((s) => s.annualizedMinor));

  const renewalsInWindow = recurring
    .filter((s) => isWithinWindow(s.nextRenewalDate, today, org.renewalWindowDays))
    .sort((a, b) => (a.nextRenewalDate ?? "").localeCompare(b.nextRenewalDate ?? ""));

  const deptMap = new Map<string, number>();
  const deptCatMap = new Map<string, Map<string, number>>();
  const catMap = new Map<string, number>();
  for (const s of recurring) {
    const dept = s.departmentName ?? "Unassigned";
    const cat = s.category ?? "Uncategorized";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + s.annualizedMinor);
    catMap.set(cat, (catMap.get(cat) ?? 0) + s.annualizedMinor);
    const inner = deptCatMap.get(dept) ?? new Map<string, number>();
    inner.set(cat, (inner.get(cat) ?? 0) + s.annualizedMinor);
    deptCatMap.set(dept, inner);
  }

  return {
    monthlyRecurringMinor,
    annualCommittedMinor,
    activeCount: recurring.length,
    renewalsInWindow,
    openRequests: openReq.count ?? 0,
    reviewsDue: reviewsQ.count ?? 0,
    openFindings: findings.filter((f) => f.status === "OPEN").length,
    openOffboardingTasks: tasksQ.count ?? 0,
    byDepartment: [...deptMap.entries()]
      .map(([name, annualizedMinor]) => ({
        name,
        annualizedMinor,
        segments: [...(deptCatMap.get(name)?.entries() ?? [])]
          .map(([category, minor]) => ({ category, annualizedMinor: minor }))
          .sort((a, b) => b.annualizedMinor - a.annualizedMinor),
      }))
      .sort((a, b) => b.annualizedMinor - a.annualizedMinor),
    byCategory: [...catMap.entries()].map(([name, annualizedMinor]) => ({ name, annualizedMinor })).sort((a, b) => b.annualizedMinor - a.annualizedMinor),
    currency: org.baseCurrency,
    renewalWindowDays: org.renewalWindowDays,
  };
}
