/**
 * Canonical domain enums. These mirror the PostgreSQL enum types defined in the
 * Supabase migrations exactly. Keep the two in sync — the DB is the source of truth,
 * this file is the typed application mirror.
 */

export const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const MEMBERSHIP_STATUSES = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "REMOVED",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "TRIAL",
  "PAUSED",
  "CANCELLED",
  "ARCHIVED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CADENCES = [
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "CUSTOM",
  "ONE_TIME",
] as const;
export type BillingCadence = (typeof BILLING_CADENCES)[number];

export const REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "DENIED",
  "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REVIEW_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_DECISIONS = [
  "KEEP",
  "CANCEL",
  "RENEGOTIATE",
  "REDUCE_SEATS",
  "INCREASE_SEATS",
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const OFFBOARDING_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OffboardingStatus = (typeof OFFBOARDING_STATUSES)[number];

export const OFFBOARDING_TASK_STATUSES = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OffboardingTaskStatus = (typeof OFFBOARDING_TASK_STATUSES)[number];

export const JANITOR_SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH"] as const;
export type JanitorSeverity = (typeof JANITOR_SEVERITIES)[number];

export const JANITOR_FINDING_STATUSES = [
  "OPEN",
  "RESOLVED",
  "DISMISSED",
] as const;
export type JanitorFindingStatus = (typeof JANITOR_FINDING_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "REQUEST_SUBMITTED",
  "REQUEST_DECIDED",
  "REQUEST_CANCELLED",
  "REQUEST_CONVERTED",
  "REVIEW_ASSIGNED",
  "REVIEW_DUE",
  "REVIEW_COMPLETED",
  "RENEWAL_APPROACHING",
  "OFFBOARDING_ASSIGNED",
  "OFFBOARDING_COMPLETED",
  "JANITOR_FINDING",
  "MEMBERSHIP_CHANGED",
  "ANNOUNCEMENT",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Human-friendly labels for enum values used across the UI. */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const BILLING_CADENCE_LABELS: Record<BillingCadence, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
  ONE_TIME: "One-time",
};

/** Short per-period suffix for a charge, e.g. "/mo", "/qtr", "/yr", "/6mo". */
export function cadenceSuffix(
  cadence: BillingCadence,
  intervalMonths?: number | null,
): string {
  switch (cadence) {
    case "MONTHLY":
      return "/mo";
    case "QUARTERLY":
      return "/qtr";
    case "ANNUAL":
      return "/yr";
    case "CUSTOM":
      return intervalMonths ? `/${intervalMonths}mo` : "";
    case "ONE_TIME":
      return "";
    default:
      return "";
  }
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  KEEP: "Keep",
  CANCEL: "Cancel",
  RENEGOTIATE: "Renegotiate",
  REDUCE_SEATS: "Reduce seats",
  INCREASE_SEATS: "Increase seats",
};

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  INVITED: "Invited",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

export const OFFBOARDING_STATUS_LABELS: Record<OffboardingStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const JANITOR_SEVERITY_LABELS: Record<JanitorSeverity, string> = {
  INFO: "Info",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
