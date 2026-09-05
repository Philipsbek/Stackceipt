import { createClient } from "@/lib/supabase/server";
import { annualizedMinor } from "@/lib/domain/money";
import { nameFromMembers } from "./access";
import type {
  AuditLog,
  Department,
  Member,
  Notification,
  OffboardingCase,
  OffboardingTask,
  SubscriptionRequest,
  SubscriptionReview,
} from "@/lib/domain/types";
import type {
  BillingCadence,
  NotificationType,
  OffboardingStatus,
  OffboardingTaskStatus,
  RequestStatus,
  ReviewDecision,
  ReviewStatus,
} from "@/lib/domain/enums";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Requests ───────────────────────────────────────────────────────
function mapRequest(r: any): SubscriptionRequest {
  return {
    id: r.id, organizationId: r.organization_id, requestedByMemberId: r.requested_by_member_id,
    departmentId: r.department_id, vendorName: r.vendor_name, productName: r.product_name,
    businessJustification: r.business_justification, requestedSeats: r.requested_seats,
    amountMinor: Number(r.amount_minor), currency: r.currency, billingCadence: r.billing_cadence as BillingCadence,
    billingIntervalMonths: r.billing_interval_months, neededBy: r.needed_by, status: r.status as RequestStatus,
    decidedByMemberId: r.decided_by_member_id, decidedAt: r.decided_at, decisionNote: r.decision_note,
    createdSubscriptionId: r.created_subscription_id, createdAt: r.created_at, updatedAt: r.updated_at,
    cancelledAt: r.cancelled_at,
  };
}

export async function listRequests(organizationId: string): Promise<SubscriptionRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("subscription_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  return (data ?? []).map(mapRequest);
}

export async function getRequest(organizationId: string, id: string): Promise<SubscriptionRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("subscription_requests").select("*").eq("organization_id", organizationId).eq("id", id).maybeSingle();
  return data ? mapRequest(data) : null;
}

// ── Reviews ────────────────────────────────────────────────────────
export interface ReviewRow extends SubscriptionReview {
  subscriptionLabel: string;
  assigneeName: string | null;
}

export async function listReviews(organizationId: string, members: Member[]): Promise<ReviewRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_reviews")
    .select("*, subscriptions(vendor_name, product_name)")
    .eq("organization_id", organizationId)
    .order("scheduled_for");
  return (data ?? []).map((r: any) => ({
    id: r.id, organizationId: r.organization_id, subscriptionId: r.subscription_id, scheduledFor: r.scheduled_for,
    assignedToMemberId: r.assigned_to_member_id, status: r.status as ReviewStatus, decision: r.decision as ReviewDecision | null,
    summary: r.summary, recommendedSeats: r.recommended_seats, completedByMemberId: r.completed_by_member_id,
    completedAt: r.completed_at, createdByMemberId: r.created_by_member_id, createdAt: r.created_at,
    subscriptionLabel: r.subscriptions ? `${r.subscriptions.vendor_name} ${r.subscriptions.product_name}` : "—",
    assigneeName: r.assigned_to_member_id ? nameFromMembers(members, r.assigned_to_member_id) : null,
  }));
}

// ── Offboarding ────────────────────────────────────────────────────
function mapTask(r: any): OffboardingTask {
  return {
    id: r.id, organizationId: r.organization_id, offboardingCaseId: r.offboarding_case_id, subscriptionId: r.subscription_id,
    title: r.title, description: r.description, assignedToMemberId: r.assigned_to_member_id, dueDate: r.due_date,
    status: r.status as OffboardingTaskStatus, completedByMemberId: r.completed_by_member_id, completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}
function mapCase(r: any): OffboardingCase {
  return {
    id: r.id, organizationId: r.organization_id, memberId: r.member_id, departureDate: r.departure_date,
    status: r.status as OffboardingStatus, notes: r.notes, initiatedByMemberId: r.initiated_by_member_id,
    completedByMemberId: r.completed_by_member_id, completedAt: r.completed_at, createdAt: r.created_at,
  };
}

export interface OffboardingCaseRow extends OffboardingCase {
  memberName: string;
  tasks: OffboardingTask[];
  totalTasks: number;
  completedTasks: number;
}

export async function listOffboardingCases(organizationId: string, members: Member[]): Promise<OffboardingCaseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offboarding_cases")
    .select("*, offboarding_tasks(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => decorateCase(r, members));
}

export async function getOffboardingCase(organizationId: string, id: string, members: Member[]): Promise<OffboardingCaseRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offboarding_cases")
    .select("*, offboarding_tasks(*)")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  return data ? decorateCase(data, members) : null;
}

function decorateCase(r: any, members: Member[]): OffboardingCaseRow {
  const tasks = ((r.offboarding_tasks ?? []) as any[]).map(mapTask);
  return {
    ...mapCase(r),
    memberName: nameFromMembers(members, r.member_id),
    tasks,
    totalTasks: tasks.filter((t) => t.status !== "CANCELLED").length,
    completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
  };
}

// ── Notifications ──────────────────────────────────────────────────
function mapNotification(r: any): Notification {
  return {
    id: r.id, organizationId: r.organization_id, recipientMemberId: r.recipient_member_id, type: r.type as NotificationType,
    title: r.title, body: r.body, href: r.href, entityType: r.entity_type, entityId: r.entity_id,
    readAt: r.read_at, createdAt: r.created_at,
  };
}

export async function listNotifications(organizationId: string, recipientMemberId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("recipient_member_id", recipientMemberId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapNotification);
}

export async function unreadCount(organizationId: string, recipientMemberId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("recipient_member_id", recipientMemberId)
    .is("read_at", null);
  return count ?? 0;
}

// ── Audit ──────────────────────────────────────────────────────────
export async function listAuditLogs(organizationId: string): Promise<AuditLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r: any) => ({
    id: r.id, organizationId: r.organization_id, actorMemberId: r.actor_member_id, action: r.action,
    entityType: r.entity_type, entityId: r.entity_id, beforeData: r.before_data, afterData: r.after_data,
    metadata: r.metadata ?? {}, createdAt: r.created_at,
  }));
}

// ── Departments ────────────────────────────────────────────────────
export interface DepartmentRow extends Department {
  managerName: string | null;
  memberCount: number;
  /** Member ids assigned to this department (resolve names/emails via the members list). */
  memberIds: string[];
  subscriptionCount: number;
  /** The tools (subscriptions) attributed to this department, for logos. */
  tools: { vendorName: string; productName: string }[];
  annualizedMinor: number;
}

export async function listDepartments(organizationId: string, members: Member[]): Promise<DepartmentRow[]> {
  const supabase = await createClient();
  const [{ data: depts }, { data: subs }, { data: deptMembers }] = await Promise.all([
    supabase.from("departments").select("*").eq("organization_id", organizationId).order("name"),
    supabase.from("subscriptions").select("department_id, vendor_name, product_name, amount_minor, billing_cadence, billing_interval_months, status").eq("organization_id", organizationId).neq("status", "ARCHIVED"),
    // Degrades gracefully (empty) until the department_members migration is applied.
    supabase.from("department_members").select("department_id, member_id").eq("organization_id", organizationId),
  ]);
  const activeMemberIds = new Set(members.filter((m) => m.status === "ACTIVE").map((m) => m.id));
  // Map department -> assigned member ids (active members only).
  const membersByDept = new Map<string, string[]>();
  for (const dm of (deptMembers ?? []) as Array<{ department_id: string; member_id: string }>) {
    if (!activeMemberIds.has(dm.member_id)) continue;
    const list = membersByDept.get(dm.department_id) ?? [];
    list.push(dm.member_id);
    membersByDept.set(dm.department_id, list);
  }
  return (depts ?? []).map((d: any): DepartmentRow => {
    const deptSubs = (subs ?? []).filter((s: any) => s.department_id === d.id);
    const memberIds = membersByDept.get(d.id) ?? [];
    return {
      id: d.id, organizationId: d.organization_id, name: d.name, description: d.description,
      managerMemberId: d.manager_member_id, archivedAt: d.archived_at, createdAt: d.created_at,
      managerName: d.manager_member_id ? nameFromMembers(members, d.manager_member_id) : null,
      memberCount: memberIds.length,
      memberIds,
      subscriptionCount: deptSubs.length,
      tools: deptSubs.map((s: any) => ({ vendorName: s.vendor_name as string, productName: s.product_name as string })),
      annualizedMinor: deptSubs.reduce((sum: number, s: any) => sum + annualizedMinor(Number(s.amount_minor), s.billing_cadence, s.billing_interval_months), 0),
    };
  });
}

// ── Team ───────────────────────────────────────────────────────────
export interface MemberRow extends Member {
  subscriptionCount: number;
  hasOpenOffboarding: boolean;
  /** Names of the departments this member belongs to. */
  departmentNames: string[];
}

export async function listTeam(organizationId: string, members: Member[]): Promise<MemberRow[]> {
  const supabase = await createClient();
  const [{ data: assigns }, { data: cases }, { data: deptRows }] = await Promise.all([
    supabase.from("subscription_members").select("member_id").eq("organization_id", organizationId).is("unassigned_at", null),
    supabase.from("offboarding_cases").select("member_id, status").eq("organization_id", organizationId).in("status", ["OPEN", "IN_PROGRESS"]),
    // Degrades gracefully (empty) until the department_members migration is applied.
    supabase.from("department_members").select("member_id, departments(name)").eq("organization_id", organizationId),
  ]);
  const counts = new Map<string, number>();
  for (const a of assigns ?? []) {
    const id = (a as any).member_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const offboarding = new Set((cases ?? []).map((c: any) => c.member_id as string));
  // member_id -> sorted department names.
  const deptsByMember = new Map<string, string[]>();
  for (const row of (deptRows ?? []) as any[]) {
    const name = (row.departments as { name: string } | null)?.name;
    if (!name) continue;
    const list = deptsByMember.get(row.member_id) ?? [];
    list.push(name);
    deptsByMember.set(row.member_id, list);
  }
  return members.map((m) => ({
    ...m,
    subscriptionCount: counts.get(m.id) ?? 0,
    hasOpenOffboarding: offboarding.has(m.id),
    departmentNames: (deptsByMember.get(m.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
