import type { MembershipStatus, OrganizationRole } from "./enums";

/**
 * Centralized permission catalog (see master spec §6).
 *
 * This is the single source of truth for "can this member do X?". It is used for
 * navigation visibility AND as the first server-side check. It is NEVER the only
 * enforcement layer — Postgres RLS is the independent tenant/permission backstop.
 * UI hiding is a convenience, not a security boundary.
 */

export const PERMISSION_KEYS = [
  "organization.read",
  "organization.update",
  "organization.delete",
  "organization.transferOwnership",
  "member.read",
  "member.invite",
  "member.updateRole",
  "member.suspend",
  "member.remove",
  "department.read",
  "department.create",
  "department.update",
  "department.delete",
  "subscription.read",
  "subscription.create",
  "subscription.update",
  "subscription.archive",
  "subscription.assignMembers",
  "document.read",
  "document.upload",
  "document.delete",
  "request.read",
  "request.create",
  "request.decide",
  "request.cancel",
  "review.read",
  "review.schedule",
  "review.complete",
  "offboarding.read",
  "offboarding.create",
  "offboarding.update",
  "offboarding.complete",
  "janitor.read",
  "janitor.run",
  "janitor.resolve",
  "janitor.dismiss",
  "report.read",
  "report.export",
  "audit.read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface ActorContext {
  memberId: string;
  role: OrganizationRole;
  status: MembershipStatus;
  /** Department ids this member is the designated manager of. */
  managedDepartmentIds: readonly string[];
}

export interface ResourceScope {
  /** Department the resource belongs to (subscription, request, offboarding task). */
  departmentId?: string | null;
  /** Accountable owner of a subscription. */
  ownerMemberId?: string | null;
  /** Author of a request. */
  authorMemberId?: string | null;
  /** Member a task/case is assigned to. */
  assigneeMemberId?: string | null;
  /** Subject member (profile, membership target). */
  subjectMemberId?: string | null;
}

function isActive(actor: ActorContext): boolean {
  return actor.status === "ACTIVE";
}

/**
 * The core authorization decision. Returns true only when the member may perform
 * `permission` on the (optional) scoped resource.
 */
export function can(
  actor: ActorContext,
  permission: PermissionKey,
  scope: ResourceScope = {},
): boolean {
  // Only active members have any access at all.
  if (!isActive(actor)) return false;

  const { role } = actor;
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isOwnerOrAdmin = isOwner || isAdmin;
  const self = scope.authorMemberId === actor.memberId;

  switch (permission) {
    // ── Organization ───────────────────────────────────────────────
    case "organization.read":
      return true; // any active member
    case "organization.update":
      return isOwnerOrAdmin;
    case "organization.delete":
      return isOwner;
    case "organization.transferOwnership":
      return isOwner;

    // ── Members ────────────────────────────────────────────────────
    case "member.read":
      return true; // co-members are visible in a limited form
    case "member.invite":
    case "member.updateRole":
    case "member.suspend":
    case "member.remove":
      return isOwnerOrAdmin;

    // ── Departments ────────────────────────────────────────────────
    case "department.read":
      return true;
    case "department.create":
    case "department.delete":
      return isOwnerOrAdmin;
    case "department.update":
      return isOwnerOrAdmin;

    // ── Subscriptions ──────────────────────────────────────────────
    case "subscription.read":
      // Owner/Admin/Manager see the full inventory. Members see assigned/owned only —
      // the data layer scopes MEMBER reads; here we allow the read intent.
      return true;
    case "subscription.create":
    case "subscription.update":
    case "subscription.archive":
    case "subscription.assignMembers":
      return isOwnerOrAdmin;

    // ── Documents ──────────────────────────────────────────────────
    case "document.read":
      return true; // scoped by subscription visibility at the data layer
    case "document.upload":
    case "document.delete":
      return isOwnerOrAdmin;

    // ── Requests ───────────────────────────────────────────────────
    case "request.read":
      return true; // members see their own; the data layer scopes the list
    case "request.create":
      return true; // any active member may submit a request
    case "request.decide":
      // Only Owner/Admin decide, and never your own request.
      if (self) return false;
      return isOwnerOrAdmin;
    case "request.cancel":
      // Author may cancel their own; owner/admin may cancel any.
      return isOwnerOrAdmin || self;

    // ── Reviews ────────────────────────────────────────────────────
    case "review.read":
      return isOwnerOrAdmin || isManager; // managers retain oversight visibility
    case "review.schedule":
      return isOwnerOrAdmin;
    case "review.complete":
      // Owner/Admin, or the member the review is explicitly assigned to.
      return isOwnerOrAdmin || scope.assigneeMemberId === actor.memberId;

    // ── Offboarding ────────────────────────────────────────────────
    case "offboarding.read":
      return isOwnerOrAdmin || isManager; // managers retain oversight visibility
    case "offboarding.create":
    case "offboarding.update":
      return isOwnerOrAdmin;
    case "offboarding.complete":
      // Owner/Admin, or the assignee of the task.
      return isOwnerOrAdmin || scope.assigneeMemberId === actor.memberId;

    // ── Janitor ────────────────────────────────────────────────────
    case "janitor.read":
      return isOwnerOrAdmin || isManager; // managers can view findings
    case "janitor.run":
    case "janitor.resolve":
    case "janitor.dismiss":
      return isOwnerOrAdmin;

    // ── Reports ────────────────────────────────────────────────────
    case "report.read":
      return isOwnerOrAdmin || isManager;
    case "report.export":
      return isOwnerOrAdmin || isManager;

    // ── Audit ──────────────────────────────────────────────────────
    case "audit.read":
      return isOwnerOrAdmin;

    default:
      return false;
  }
}

/** Convenience assertion that throws a typed authorization error. */
export class AuthorizationError extends Error {
  constructor(public permission: PermissionKey) {
    super(`Not authorized: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function authorize(
  actor: ActorContext,
  permission: PermissionKey,
  scope: ResourceScope = {},
): void {
  if (!can(actor, permission, scope)) {
    throw new AuthorizationError(permission);
  }
}
