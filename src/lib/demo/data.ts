import type {
  AuditLog,
  Department,
  Member,
  Notification,
  OffboardingCase,
  OffboardingTask,
  Organization,
  Subscription,
  SubscriptionAssignment,
  SubscriptionRequest,
  SubscriptionReview,
} from "@/lib/domain/types";

/**
 * Deterministic demo dataset.
 *
 * This drives the runnable preview before Supabase credentials are wired. It mirrors
 * the schema exactly through the shared view-model types, so swapping to the Supabase
 * repository is a data-source change only — no UI or domain changes.
 *
 * Two organizations exist to demonstrate tenant isolation. The demo "session" is the
 * OWNER of Northwind (see demo/session.ts).
 */

export const DEMO_TODAY = "2026-09-03";

// ── Members (Northwind) ────────────────────────────────────────────
export const demoMembers: Member[] = [
  { id: "m-owner", organizationId: "org-northwind", userId: "u-owner", role: "OWNER", status: "ACTIVE", fullName: "Alex Rivera", email: "alex@northwind.example", invitedEmail: null, joinedAt: "2025-01-04T09:00:00Z", createdAt: "2025-01-04T09:00:00Z" },
  { id: "m-admin", organizationId: "org-northwind", userId: "u-admin", role: "ADMIN", status: "ACTIVE", fullName: "Priya Shah", email: "priya@northwind.example", invitedEmail: null, joinedAt: "2025-01-06T09:00:00Z", createdAt: "2025-01-06T09:00:00Z" },
  { id: "m-mgr-eng", organizationId: "org-northwind", userId: "u-mgr-eng", role: "MANAGER", status: "ACTIVE", fullName: "Dana Osei", email: "dana@northwind.example", invitedEmail: null, joinedAt: "2025-01-08T09:00:00Z", createdAt: "2025-01-08T09:00:00Z" },
  { id: "m-mgr-mkt", organizationId: "org-northwind", userId: "u-mgr-mkt", role: "MANAGER", status: "ACTIVE", fullName: "Miguel Torres", email: "miguel@northwind.example", invitedEmail: null, joinedAt: "2025-01-10T09:00:00Z", createdAt: "2025-01-10T09:00:00Z" },
  { id: "m-eng-1", organizationId: "org-northwind", userId: "u-eng-1", role: "MEMBER", status: "ACTIVE", fullName: "Sam Lee", email: "sam@northwind.example", invitedEmail: null, joinedAt: "2025-02-01T09:00:00Z", createdAt: "2025-02-01T09:00:00Z" },
  { id: "m-eng-2", organizationId: "org-northwind", userId: "u-eng-2", role: "MEMBER", status: "ACTIVE", fullName: "Jordan Kim", email: "jordan@northwind.example", invitedEmail: null, joinedAt: "2025-02-01T09:00:00Z", createdAt: "2025-02-01T09:00:00Z" },
  { id: "m-des-1", organizationId: "org-northwind", userId: "u-des-1", role: "MEMBER", status: "ACTIVE", fullName: "Riya Patel", email: "riya@northwind.example", invitedEmail: null, joinedAt: "2025-03-01T09:00:00Z", createdAt: "2025-03-01T09:00:00Z" },
  { id: "m-fin-1", organizationId: "org-northwind", userId: "u-fin-1", role: "MEMBER", status: "ACTIVE", fullName: "Chris Nguyen", email: "chris@northwind.example", invitedEmail: null, joinedAt: "2025-03-15T09:00:00Z", createdAt: "2025-03-15T09:00:00Z" },
  { id: "m-invited", organizationId: "org-northwind", userId: null, role: "MEMBER", status: "INVITED", fullName: "Taylor Brooks", email: "taylor@northwind.example", invitedEmail: "taylor@northwind.example", joinedAt: null, createdAt: "2026-08-20T09:00:00Z" },
];

export const demoOrganizations: Organization[] = [
  { id: "org-northwind", name: "Northwind Labs", slug: "northwind", baseCurrency: "USD", timezone: "America/New_York", renewalWindowDays: 90, createdAt: "2025-01-04T09:00:00Z" },
  { id: "org-contoso", name: "Contoso Retail", slug: "contoso", baseCurrency: "USD", timezone: "America/Chicago", renewalWindowDays: 60, createdAt: "2025-05-01T09:00:00Z" },
];

export const demoDepartments: Department[] = [
  { id: "d-eng", organizationId: "org-northwind", name: "Engineering", description: "Product & platform engineering", managerMemberId: "m-mgr-eng", archivedAt: null, createdAt: "2025-01-05T09:00:00Z" },
  { id: "d-mkt", organizationId: "org-northwind", name: "Marketing", description: "Growth & brand", managerMemberId: "m-mgr-mkt", archivedAt: null, createdAt: "2025-01-05T09:00:00Z" },
  { id: "d-des", organizationId: "org-northwind", name: "Design", description: "Product design", managerMemberId: "m-mgr-eng", archivedAt: null, createdAt: "2025-01-05T09:00:00Z" },
  { id: "d-fin", organizationId: "org-northwind", name: "Finance & Ops", description: "Finance, legal, operations", managerMemberId: null, archivedAt: null, createdAt: "2025-01-05T09:00:00Z" },
];

function sub(s: Partial<Subscription> & Pick<Subscription, "id" | "vendorName" | "productName" | "amountMinor" | "billingCadence">): Subscription {
  return {
    organizationId: "org-northwind",
    departmentId: null,
    ownerMemberId: null,
    description: null,
    category: null,
    websiteUrl: null,
    status: "ACTIVE",
    billingIntervalMonths: null,
    currency: "USD",
    startDate: "2025-01-15",
    nextRenewalDate: null,
    endDate: null,
    autoRenews: true,
    noticePeriodDays: 30,
    seatsPurchased: null,
    seatsUsed: null,
    contractReference: null,
    notes: null,
    lastReviewedAt: null,
    lastVerifiedAt: "2026-08-01T00:00:00Z",
    createdByMemberId: "m-owner",
    archivedAt: null,
    createdAt: "2025-01-15T09:00:00Z",
    updatedAt: "2026-08-01T09:00:00Z",
    ...s,
  };
}

export const demoSubscriptions: Subscription[] = [
  sub({ id: "s-figma", vendorName: "Figma", productName: "Organization", category: "Design", departmentId: "d-des", ownerMemberId: "m-des-1", amountMinor: 4500, billingCadence: "MONTHLY", seatsPurchased: 12, seatsUsed: 5, nextRenewalDate: "2026-11-20", websiteUrl: "https://figma.com", description: "Design collaboration platform." }),
  sub({ id: "s-slack", vendorName: "Slack", productName: "Business+", category: "Communication", departmentId: "d-eng", ownerMemberId: "m-mgr-eng", amountMinor: 1500, billingCadence: "MONTHLY", seatsPurchased: 60, seatsUsed: 52, nextRenewalDate: "2026-09-25" }),
  sub({ id: "s-github", vendorName: "GitHub", productName: "Enterprise", category: "Engineering", departmentId: "d-eng", ownerMemberId: "m-mgr-eng", amountMinor: 2100000, billingCadence: "ANNUAL", seatsPurchased: 45, seatsUsed: 40, nextRenewalDate: "2026-09-20", noticePeriodDays: 30, contractReference: "GH-2025-114" }),
  sub({ id: "s-notion", vendorName: "Notion", productName: "Team", category: "Productivity", departmentId: "d-mkt", ownerMemberId: null, amountMinor: 1000, billingCadence: "MONTHLY", seatsPurchased: 30, seatsUsed: 21, nextRenewalDate: "2026-10-05" }),
  sub({ id: "s-zoom", vendorName: "Zoom", productName: "Business", category: "Communication", departmentId: null, ownerMemberId: "m-fin-1", amountMinor: 19990, billingCadence: "ANNUAL", seatsPurchased: 25, seatsUsed: 18, nextRenewalDate: "2027-02-10" }),
  sub({ id: "s-adobe", vendorName: "Adobe", productName: "Creative Cloud", category: "Design", departmentId: "d-des", ownerMemberId: "m-des-1", amountMinor: 599900, billingCadence: "ANNUAL", seatsPurchased: 15, seatsUsed: 4, nextRenewalDate: "2026-12-01", contractReference: "ADB-2026-02" }),
  sub({ id: "s-salesforce", vendorName: "Salesforce", productName: "Sales Cloud", category: "CRM", departmentId: "d-mkt", ownerMemberId: "m-mgr-mkt", amountMinor: 3600000, billingCadence: "ANNUAL", seatsPurchased: 20, seatsUsed: 19, nextRenewalDate: "2026-11-30", noticePeriodDays: 60 }),
  sub({ id: "s-datadog", vendorName: "Datadog", productName: "Pro", category: "Engineering", departmentId: "d-eng", ownerMemberId: "m-eng-1", amountMinor: 84000, billingCadence: "MONTHLY", seatsPurchased: 45, seatsUsed: 45, nextRenewalDate: "2026-10-15" }),
  sub({ id: "s-linear", vendorName: "Linear", productName: "Business", category: "Productivity", departmentId: "d-eng", ownerMemberId: "m-mgr-eng", amountMinor: 1400, billingCadence: "MONTHLY", status: "TRIAL", seatsPurchased: 45, seatsUsed: 12, nextRenewalDate: "2026-09-18", autoRenews: false, endDate: "2026-09-18" }),
  sub({ id: "s-dropbox", vendorName: "Dropbox", productName: "Business", category: "Storage", departmentId: "d-fin", ownerMemberId: "m-fin-1", amountMinor: 240000, billingCadence: "ANNUAL", seatsPurchased: 10, seatsUsed: 3, nextRenewalDate: "2027-03-01", lastVerifiedAt: null, createdAt: "2025-02-01T09:00:00Z" }),
  sub({ id: "s-1password", vendorName: "1Password", productName: "Business", category: "Security", departmentId: "d-fin", ownerMemberId: "m-admin", amountMinor: 799900, billingCadence: "ANNUAL", seatsPurchased: 80, seatsUsed: 72, nextRenewalDate: "2027-01-15" }),
  sub({ id: "s-figma-dup", vendorName: "Figma", productName: "Organization", category: "Design", departmentId: "d-eng", ownerMemberId: "m-mgr-eng", amountMinor: 4500, billingCadence: "MONTHLY", seatsPurchased: 5, seatsUsed: 3, nextRenewalDate: "2026-12-22", createdAt: "2025-06-01T09:00:00Z" }),
  sub({ id: "s-consult", vendorName: "Brightpath", productName: "Onboarding Consulting", category: "Services", departmentId: "d-fin", ownerMemberId: "m-admin", amountMinor: 1500000, billingCadence: "ONE_TIME", autoRenews: false, startDate: "2026-03-01", seatsPurchased: null, seatsUsed: null, nextRenewalDate: null }),
  sub({ id: "s-oldtool", vendorName: "Trello", productName: "Premium", category: "Productivity", departmentId: "d-mkt", ownerMemberId: "m-mgr-mkt", amountMinor: 1000, billingCadence: "MONTHLY", status: "CANCELLED", autoRenews: false, archivedAt: "2026-06-01T09:00:00Z", endDate: "2026-06-01", seatsPurchased: 15, seatsUsed: 0 }),
];

export const demoAssignments: SubscriptionAssignment[] = [
  { id: "a-1", organizationId: "org-northwind", subscriptionId: "s-figma", memberId: "m-des-1", assignedByMemberId: "m-owner", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-2", organizationId: "org-northwind", subscriptionId: "s-figma", memberId: "m-mgr-eng", assignedByMemberId: "m-owner", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-3", organizationId: "org-northwind", subscriptionId: "s-slack", memberId: "m-eng-1", assignedByMemberId: "m-mgr-eng", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-4", organizationId: "org-northwind", subscriptionId: "s-slack", memberId: "m-eng-2", assignedByMemberId: "m-mgr-eng", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-5", organizationId: "org-northwind", subscriptionId: "s-github", memberId: "m-eng-1", assignedByMemberId: "m-mgr-eng", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-6", organizationId: "org-northwind", subscriptionId: "s-github", memberId: "m-eng-2", assignedByMemberId: "m-mgr-eng", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-7", organizationId: "org-northwind", subscriptionId: "s-datadog", memberId: "m-eng-1", assignedByMemberId: "m-mgr-eng", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
  { id: "a-8", organizationId: "org-northwind", subscriptionId: "s-adobe", memberId: "m-des-1", assignedByMemberId: "m-owner", assignedAt: "2025-03-01T09:00:00Z", unassignedAt: null, notes: null },
];

export const demoRequests: SubscriptionRequest[] = [
  { id: "r-1", organizationId: "org-northwind", requestedByMemberId: "m-eng-1", departmentId: "d-eng", vendorName: "Sentry", productName: "Team", businessJustification: "We need error monitoring for the new mobile app; current logging is not enough to triage production crashes.", requestedSeats: 10, amountMinor: 8000, currency: "USD", billingCadence: "MONTHLY", billingIntervalMonths: null, neededBy: "2026-10-01", status: "SUBMITTED", decidedByMemberId: null, decidedAt: null, decisionNote: null, createdSubscriptionId: null, createdAt: "2026-08-25T09:00:00Z", updatedAt: "2026-08-25T09:00:00Z", cancelledAt: null },
  { id: "r-2", organizationId: "org-northwind", requestedByMemberId: "m-mgr-mkt", departmentId: "d-mkt", vendorName: "Ahrefs", productName: "Advanced", businessJustification: "SEO tooling to support the Q4 content push and competitor tracking.", requestedSeats: 3, amountMinor: 39900, currency: "USD", billingCadence: "MONTHLY", billingIntervalMonths: null, neededBy: "2026-09-20", status: "SUBMITTED", decidedByMemberId: null, decidedAt: null, decisionNote: null, createdSubscriptionId: null, createdAt: "2026-08-28T09:00:00Z", updatedAt: "2026-08-28T09:00:00Z", cancelledAt: null },
  { id: "r-3", organizationId: "org-northwind", requestedByMemberId: "m-des-1", departmentId: "d-des", vendorName: "Framer", productName: "Pro", businessJustification: "Prototyping tool for the marketing site refresh.", requestedSeats: 2, amountMinor: 3000, currency: "USD", billingCadence: "MONTHLY", billingIntervalMonths: null, neededBy: null, status: "APPROVED", decidedByMemberId: "m-owner", decidedAt: "2026-08-15T09:00:00Z", decisionNote: "Approved — proceed for the site refresh.", createdSubscriptionId: null, createdAt: "2026-08-10T09:00:00Z", updatedAt: "2026-08-15T09:00:00Z", cancelledAt: null },
  { id: "r-4", organizationId: "org-northwind", requestedByMemberId: "m-eng-2", departmentId: "d-eng", vendorName: "Retool", productName: "Team", businessJustification: "Internal admin tooling.", requestedSeats: 5, amountMinor: 5000, currency: "USD", billingCadence: "MONTHLY", billingIntervalMonths: null, neededBy: null, status: "DENIED", decidedByMemberId: "m-mgr-eng", decidedAt: "2026-08-12T09:00:00Z", decisionNote: "We can use the existing internal tools stack for now; revisit next quarter.", createdSubscriptionId: null, createdAt: "2026-08-05T09:00:00Z", updatedAt: "2026-08-12T09:00:00Z", cancelledAt: null },
  { id: "r-5", organizationId: "org-northwind", requestedByMemberId: "m-eng-1", departmentId: "d-eng", vendorName: "PostHog", productName: "Scale", businessJustification: "Product analytics — draft, still gathering seat estimates.", requestedSeats: null, amountMinor: 45000, currency: "USD", billingCadence: "MONTHLY", billingIntervalMonths: null, neededBy: null, status: "DRAFT", decidedByMemberId: null, decidedAt: null, decisionNote: null, createdSubscriptionId: null, createdAt: "2026-09-01T09:00:00Z", updatedAt: "2026-09-01T09:00:00Z", cancelledAt: null },
];

export const demoReviews: SubscriptionReview[] = [
  { id: "rv-1", organizationId: "org-northwind", subscriptionId: "s-salesforce", scheduledFor: "2026-09-30", assignedToMemberId: "m-mgr-mkt", status: "SCHEDULED", decision: null, summary: null, recommendedSeats: null, completedByMemberId: null, completedAt: null, createdByMemberId: "m-owner", createdAt: "2026-08-01T09:00:00Z" },
  { id: "rv-2", organizationId: "org-northwind", subscriptionId: "s-adobe", scheduledFor: "2026-08-20", assignedToMemberId: "m-mgr-eng", status: "IN_PROGRESS", decision: null, summary: null, recommendedSeats: null, completedByMemberId: null, completedAt: null, createdByMemberId: "m-owner", createdAt: "2026-07-20T09:00:00Z" },
  { id: "rv-3", organizationId: "org-northwind", subscriptionId: "s-github", scheduledFor: "2026-07-15", assignedToMemberId: "m-mgr-eng", status: "COMPLETED", decision: "RENEGOTIATE", summary: "Renegotiated pricing for the annual renewal; reduced from 50 to 45 seats.", recommendedSeats: 45, completedByMemberId: "m-mgr-eng", completedAt: "2026-07-18T09:00:00Z", createdByMemberId: "m-owner", createdAt: "2026-06-15T09:00:00Z" },
  { id: "rv-4", organizationId: "org-northwind", subscriptionId: "s-dropbox", scheduledFor: "2026-08-10", assignedToMemberId: "m-fin-1", status: "SCHEDULED", decision: null, summary: null, recommendedSeats: null, completedByMemberId: null, completedAt: null, createdByMemberId: "m-admin", createdAt: "2026-07-10T09:00:00Z" },
];

export const demoOffboardingCases: OffboardingCase[] = [
  { id: "off-1", organizationId: "org-northwind", memberId: "m-eng-2", departureDate: "2026-09-15", status: "IN_PROGRESS", notes: "Jordan is leaving Engineering; reassign licenses.", initiatedByMemberId: "m-mgr-eng", completedByMemberId: null, completedAt: null, createdAt: "2026-09-01T09:00:00Z" },
];

export const demoOffboardingTasks: OffboardingTask[] = [
  { id: "ot-1", organizationId: "org-northwind", offboardingCaseId: "off-1", subscriptionId: "s-slack", title: "Remove from Slack Business+", description: "Unassign Jordan's seat.", assignedToMemberId: "m-mgr-eng", dueDate: "2026-09-15", status: "PENDING", completedByMemberId: null, completedAt: null, createdAt: "2026-09-01T09:00:00Z" },
  { id: "ot-2", organizationId: "org-northwind", offboardingCaseId: "off-1", subscriptionId: "s-github", title: "Remove from GitHub Enterprise", description: "Revoke repository access and unassign seat.", assignedToMemberId: "m-mgr-eng", dueDate: "2026-09-15", status: "PENDING", completedByMemberId: null, completedAt: null, createdAt: "2026-09-01T09:00:00Z" },
  { id: "ot-3", organizationId: "org-northwind", offboardingCaseId: "off-1", subscriptionId: null, title: "Disable account & access", description: "General access checklist: email, VPN, password manager.", assignedToMemberId: "m-admin", dueDate: "2026-09-15", status: "COMPLETED", completedByMemberId: "m-admin", completedAt: "2026-09-02T09:00:00Z", createdAt: "2026-09-01T09:00:00Z" },
];

export const demoNotifications: Notification[] = [
  { id: "n-1", organizationId: "org-northwind", recipientMemberId: "m-owner", type: "REQUEST_SUBMITTED", title: "New request awaiting your decision", body: "Sam Lee submitted a request for Sentry Team.", href: "/app/northwind/requests/r-1", entityType: "request", entityId: "r-1", readAt: null, createdAt: "2026-08-25T09:05:00Z" },
  { id: "n-2", organizationId: "org-northwind", recipientMemberId: "m-owner", type: "RENEWAL_APPROACHING", title: "GitHub Enterprise renews in 17 days", body: "The cancellation notice deadline has already passed.", href: "/app/northwind/subscriptions/s-github", entityType: "subscription", entityId: "s-github", readAt: null, createdAt: "2026-09-01T08:00:00Z" },
  { id: "n-3", organizationId: "org-northwind", recipientMemberId: "m-owner", type: "JANITOR_FINDING", title: "New cost-control findings", body: "Adobe Creative Cloud is at 27% seat utilization.", href: "/app/northwind/janitor", entityType: "janitor", entityId: null, readAt: "2026-09-02T10:00:00Z", createdAt: "2026-09-02T07:00:00Z" },
  { id: "n-4", organizationId: "org-northwind", recipientMemberId: "m-owner", type: "REVIEW_DUE", title: "Adobe review is overdue", body: "The review scheduled for Aug 20 is in progress.", href: "/app/northwind/reviews", entityType: "review", entityId: "rv-2", readAt: null, createdAt: "2026-08-21T08:00:00Z" },
];

export const demoAuditLogs: AuditLog[] = [
  { id: "al-1", organizationId: "org-northwind", actorMemberId: "m-mgr-eng", action: "review.completed", entityType: "subscription_review", entityId: "rv-3", beforeData: { status: "IN_PROGRESS" }, afterData: { status: "COMPLETED", decision: "RENEGOTIATE" }, metadata: { subscription: "GitHub Enterprise" }, createdAt: "2026-07-18T09:00:00Z" },
  { id: "al-2", organizationId: "org-northwind", actorMemberId: "m-owner", action: "request.approved", entityType: "subscription_request", entityId: "r-3", beforeData: { status: "SUBMITTED" }, afterData: { status: "APPROVED" }, metadata: { vendor: "Framer" }, createdAt: "2026-08-15T09:00:00Z" },
  { id: "al-3", organizationId: "org-northwind", actorMemberId: "m-mgr-eng", action: "request.denied", entityType: "subscription_request", entityId: "r-4", beforeData: { status: "SUBMITTED" }, afterData: { status: "DENIED" }, metadata: { vendor: "Retool" }, createdAt: "2026-08-12T09:00:00Z" },
  { id: "al-4", organizationId: "org-northwind", actorMemberId: "m-owner", action: "subscription.archived", entityType: "subscription", entityId: "s-oldtool", beforeData: { status: "ACTIVE" }, afterData: { status: "CANCELLED", archived: true }, metadata: { vendor: "Trello" }, createdAt: "2026-06-01T09:00:00Z" },
  { id: "al-5", organizationId: "org-northwind", actorMemberId: "m-mgr-eng", action: "offboarding.created", entityType: "offboarding_case", entityId: "off-1", beforeData: null, afterData: { member: "Jordan Kim", tasks: 3 }, metadata: {}, createdAt: "2026-09-01T09:00:00Z" },
];
