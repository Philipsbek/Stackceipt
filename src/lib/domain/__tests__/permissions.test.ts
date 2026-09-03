import { describe, expect, it } from "vitest";
import { can, type ActorContext } from "../permissions";

function actor(overrides: Partial<ActorContext> = {}): ActorContext {
  return {
    memberId: "m-self",
    role: "MEMBER",
    status: "ACTIVE",
    managedDepartmentIds: [],
    ...overrides,
  };
}

describe("membership gating", () => {
  it("suspended members have no access", () => {
    const a = actor({ role: "OWNER", status: "SUSPENDED" });
    expect(can(a, "organization.read")).toBe(false);
    expect(can(a, "subscription.read")).toBe(false);
  });
  it("invited (not yet active) members have no access", () => {
    expect(can(actor({ role: "ADMIN", status: "INVITED" }), "member.read")).toBe(false);
  });
});

describe("owner vs admin invariants", () => {
  it("only owner can delete org or transfer ownership", () => {
    const owner = actor({ role: "OWNER" });
    const admin = actor({ role: "ADMIN" });
    expect(can(owner, "organization.delete")).toBe(true);
    expect(can(owner, "organization.transferOwnership")).toBe(true);
    expect(can(admin, "organization.delete")).toBe(false);
    expect(can(admin, "organization.transferOwnership")).toBe(false);
  });
  it("admin can manage members and subscriptions", () => {
    const admin = actor({ role: "ADMIN" });
    expect(can(admin, "member.updateRole")).toBe(true);
    expect(can(admin, "subscription.update")).toBe(true);
    expect(can(admin, "audit.read")).toBe(true);
  });
});

describe("manager role (Owner/Admin-only approvals model)", () => {
  const mgr = actor({ role: "MANAGER", memberId: "m-mgr", managedDepartmentIds: ["d-1"] });
  it("cannot create or edit subscriptions (even in a managed department)", () => {
    expect(can(mgr, "subscription.create", { departmentId: "d-1" })).toBe(false);
    expect(can(mgr, "subscription.update", { departmentId: "d-1" })).toBe(false);
    expect(can(mgr, "subscription.archive", { departmentId: "d-1" })).toBe(false);
  });
  it("cannot decide requests", () => {
    expect(can(mgr, "request.decide", { authorMemberId: "m-x", departmentId: "d-1" })).toBe(false);
  });
  it("retains oversight reads (reviews, offboarding, janitor, reports)", () => {
    expect(can(mgr, "review.read")).toBe(true);
    expect(can(mgr, "offboarding.read")).toBe(true);
    expect(can(mgr, "janitor.read")).toBe(true);
    expect(can(mgr, "report.read")).toBe(true);
    expect(can(mgr, "subscription.read")).toBe(true);
  });
  it("cannot run janitor or read the audit log", () => {
    expect(can(mgr, "janitor.run")).toBe(false);
    expect(can(mgr, "audit.read")).toBe(false);
  });
  it("can still submit and cancel their own requests", () => {
    expect(can(mgr, "request.create")).toBe(true);
    expect(can(mgr, "request.cancel", { authorMemberId: "m-mgr" })).toBe(true);
  });
});

describe("self-approval is impossible for every role", () => {
  it("owner cannot decide their own request", () => {
    const owner = actor({ role: "OWNER", memberId: "m-owner" });
    expect(can(owner, "request.decide", { authorMemberId: "m-owner" })).toBe(false);
    expect(can(owner, "request.decide", { authorMemberId: "m-other" })).toBe(true);
  });
  it("admin cannot decide their own request", () => {
    const admin = actor({ role: "ADMIN", memberId: "m-admin" });
    expect(can(admin, "request.decide", { authorMemberId: "m-admin" })).toBe(false);
    expect(can(admin, "request.decide", { authorMemberId: "m-other" })).toBe(true);
  });
});

describe("member scope", () => {
  const member = actor({ role: "MEMBER", memberId: "m-self" });
  it("can create and cancel own requests", () => {
    expect(can(member, "request.create")).toBe(true);
    expect(can(member, "request.cancel", { authorMemberId: "m-self" })).toBe(true);
    expect(can(member, "request.cancel", { authorMemberId: "m-other" })).toBe(false);
  });
  it("cannot decide requests, read audit, or run janitor", () => {
    expect(can(member, "request.decide", { authorMemberId: "m-x" })).toBe(false);
    expect(can(member, "audit.read")).toBe(false);
    expect(can(member, "janitor.run")).toBe(false);
  });
  it("can complete a task assigned to them", () => {
    expect(can(member, "offboarding.complete", { assigneeMemberId: "m-self" })).toBe(true);
    expect(can(member, "offboarding.complete", { assigneeMemberId: "m-other" })).toBe(false);
  });
});
