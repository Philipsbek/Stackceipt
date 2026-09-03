import { Badge } from "@/components/ui/badge";
import {
  BILLING_CADENCE_LABELS,
  JANITOR_SEVERITY_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
  ROLE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type BillingCadence,
  type JanitorSeverity,
  type MembershipStatus,
  type OrganizationRole,
  type RequestStatus,
  type ReviewStatus,
  type SubscriptionStatus,
} from "@/lib/domain/enums";

type Variant = "solid" | "soft" | "outline" | "success" | "warning" | "danger" | "info";

const subscriptionVariant: Record<SubscriptionStatus, Variant> = {
  ACTIVE: "success",
  TRIAL: "info",
  PAUSED: "warning",
  CANCELLED: "outline",
  ARCHIVED: "outline",
};

const requestVariant: Record<RequestStatus, Variant> = {
  DRAFT: "outline",
  SUBMITTED: "info",
  APPROVED: "success",
  DENIED: "danger",
  CANCELLED: "outline",
};

const reviewVariant: Record<ReviewStatus, Variant> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "outline",
};

const membershipVariant: Record<MembershipStatus, Variant> = {
  ACTIVE: "success",
  INVITED: "info",
  SUSPENDED: "warning",
  REMOVED: "outline",
};

const roleVariant: Record<OrganizationRole, Variant> = {
  OWNER: "solid",
  ADMIN: "soft",
  MANAGER: "soft",
  MEMBER: "outline",
};

const severityVariant: Record<JanitorSeverity, Variant> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "soft",
  INFO: "outline",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={subscriptionVariant[status]}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={requestVariant[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={reviewVariant[status]}>{REVIEW_STATUS_LABELS[status]}</Badge>;
}

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return <Badge variant={membershipVariant[status]}>{MEMBERSHIP_STATUS_LABELS[status]}</Badge>;
}

export function RoleBadge({ role }: { role: OrganizationRole }) {
  return <Badge variant={roleVariant[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: JanitorSeverity }) {
  return <Badge variant={severityVariant[severity]}>{JANITOR_SEVERITY_LABELS[severity]}</Badge>;
}

export function CadenceBadge({ cadence }: { cadence: BillingCadence }) {
  return <Badge variant="outline">{BILLING_CADENCE_LABELS[cadence]}</Badge>;
}
