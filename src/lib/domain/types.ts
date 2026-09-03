import type {
  BillingCadence,
  JanitorFindingStatus,
  JanitorSeverity,
  MembershipStatus,
  NotificationType,
  OffboardingStatus,
  OffboardingTaskStatus,
  OrganizationRole,
  RequestStatus,
  ReviewDecision,
  ReviewStatus,
  SubscriptionStatus,
} from "./enums";

/**
 * Application-facing view models. These mirror the database tables but use camelCase
 * and app-friendly types. Both the demo repository and the Supabase repository return
 * these shapes so the UI and domain logic never depend on the storage layer.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  baseCurrency: string;
  timezone: string;
  renewalWindowDays: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  avatarPath: string | null;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  fullName: string;
  email: string;
  invitedEmail: string | null;
  joinedAt: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  managerMemberId: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  departmentId: string | null;
  ownerMemberId: string | null;
  vendorName: string;
  productName: string;
  description: string | null;
  category: string | null;
  websiteUrl: string | null;
  status: SubscriptionStatus;
  billingCadence: BillingCadence;
  billingIntervalMonths: number | null;
  amountMinor: number;
  currency: string;
  startDate: string | null;
  nextRenewalDate: string | null;
  endDate: string | null;
  autoRenews: boolean;
  noticePeriodDays: number;
  seatsPurchased: number | null;
  seatsUsed: number | null;
  contractReference: string | null;
  notes: string | null;
  lastReviewedAt: string | null;
  lastVerifiedAt: string | null;
  createdByMemberId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionAssignment {
  id: string;
  organizationId: string;
  subscriptionId: string;
  memberId: string;
  assignedByMemberId: string;
  assignedAt: string;
  unassignedAt: string | null;
  notes: string | null;
}

export interface SubscriptionRequest {
  id: string;
  organizationId: string;
  requestedByMemberId: string;
  departmentId: string | null;
  vendorName: string;
  productName: string;
  businessJustification: string;
  requestedSeats: number | null;
  amountMinor: number;
  currency: string;
  billingCadence: BillingCadence;
  billingIntervalMonths: number | null;
  neededBy: string | null;
  status: RequestStatus;
  decidedByMemberId: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export interface SubscriptionReview {
  id: string;
  organizationId: string;
  subscriptionId: string;
  scheduledFor: string;
  assignedToMemberId: string | null;
  status: ReviewStatus;
  decision: ReviewDecision | null;
  summary: string | null;
  recommendedSeats: number | null;
  completedByMemberId: string | null;
  completedAt: string | null;
  createdByMemberId: string;
  createdAt: string;
}

export interface OffboardingCase {
  id: string;
  organizationId: string;
  memberId: string;
  departureDate: string;
  status: OffboardingStatus;
  notes: string | null;
  initiatedByMemberId: string;
  completedByMemberId: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface OffboardingTask {
  id: string;
  organizationId: string;
  offboardingCaseId: string;
  subscriptionId: string | null;
  title: string;
  description: string | null;
  assignedToMemberId: string | null;
  dueDate: string | null;
  status: OffboardingTaskStatus;
  completedByMemberId: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface JanitorFinding {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  ruleKey: string;
  fingerprint: string;
  severity: JanitorSeverity;
  title: string;
  description: string;
  estimatedSavingsMinor: number | null;
  status: JanitorFindingStatus;
  evidence: Record<string, unknown>;
  detectedAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  resolvedByMemberId: string | null;
  dismissedUntil: string | null;
  dismissalReason: string | null;
}

export interface Notification {
  id: string;
  organizationId: string;
  recipientMemberId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SubscriptionDocument {
  id: string;
  organizationId: string;
  subscriptionId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  documentKind: string | null;
  uploadedByMemberId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
