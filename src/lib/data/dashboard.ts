import { createClient } from "@/lib/supabase/server";
import { sumMinor } from "@/lib/domain/money";
import { isWithinWindow, todayInTimezone } from "@/lib/domain/dates";
import type { Member, Organization } from "@/lib/domain/types";
import { listSubscriptions, type SubscriptionRow } from "./subscriptions";
import { listFindings } from "./janitor";

export interface TrendPoint {
  month: string; // "YYYY-MM"
  label: string; // "Jan"
  minor: number; // committed monthly recurring run-rate that month
}

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
  monthlyTrend: TrendPoint[];
  monthlyTrendChangePct: number | null;
  currency: string;
  renewalWindowDays: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Committed monthly recurring cost for each of the last `count` months. A
 * subscription counts toward a month if it had started by month-end and wasn't
 * archived before month-start. Uses current amounts (we don't store price
 * history), so this reflects how the recurring run-rate has grown over time.
 */
function computeMonthlyTrend(subs: SubscriptionRow[], today: string, count = 8): TrendPoint[] {
  const parts = today.split("-").map(Number);
  const y = parts[0] ?? new Date().getUTCFullYear();
  const m = parts[1] ?? 1; // 1-12
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const yy = d.getUTCFullYear();
    const mm = d.getUTCMonth(); // 0-11
    const mp = String(mm + 1).padStart(2, "0");
    const monthStart = `${yy}-${mp}-01`;
    const lastDay = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    const monthEnd = `${yy}-${mp}-${String(lastDay).padStart(2, "0")}`;
    let minor = 0;
    for (const s of subs) {
      if (s.monthlyMinor <= 0) continue; // recurring only
      // Fall back to when the record was created if no explicit start date.
      const start = (s.startDate ?? s.createdAt)?.slice(0, 10);
      if (!start || start > monthEnd) continue; // not started yet
      const archived = s.archivedAt?.slice(0, 10);
      if (archived && archived < monthStart) continue; // gone before this month
      minor += s.monthlyMinor;
    }
    points.push({ month: `${yy}-${mp}`, label: MONTH_LABELS[mm]!, minor });
  }
  return points;
}

export async function getDashboardData(org: Organization, members: Member[]): Promise<DashboardData> {
  const supabase = await createClient();
  const today = todayInTimezone(org.timezone);

  // Everything below is independent — fetch it all in parallel.
  const [subs, openReq, reviewsQ, tasksQ, findings] = await Promise.all([
    // Include archived so the monthly trend reflects subscriptions that were
    // active in past months; current metrics still exclude archived below.
    listSubscriptions(org.id, members, { includeArchived: true }),
    supabase.from("subscription_requests").select("id", { count: "exact", head: true }).eq("organization_id", org.id).eq("status", "SUBMITTED"),
    supabase.from("subscription_reviews").select("id", { count: "exact", head: true }).eq("organization_id", org.id).in("status", ["SCHEDULED", "IN_PROGRESS"]),
    supabase.from("offboarding_tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id).eq("status", "PENDING"),
    listFindings(org),
  ]);
  const recurring = subs.filter((s) => (s.status === "ACTIVE" || s.status === "TRIAL") && !s.archivedAt);

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

  const monthlyTrend = computeMonthlyTrend(subs, today, 8);
  // Badge shows the change vs. the previous month (month-over-month trend).
  const prevMinor = monthlyTrend[monthlyTrend.length - 2]?.minor ?? 0;
  const lastMinor = monthlyTrend[monthlyTrend.length - 1]?.minor ?? 0;
  const monthlyTrendChangePct = prevMinor > 0 ? Math.round(((lastMinor - prevMinor) / prevMinor) * 100) : null;

  return {
    monthlyRecurringMinor,
    annualCommittedMinor,
    activeCount: recurring.length,
    monthlyTrend,
    monthlyTrendChangePct,
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
