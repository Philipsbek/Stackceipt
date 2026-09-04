import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Member, Organization } from "@/lib/domain/types";
import type { ActorContext } from "@/lib/domain/permissions";
import type {
  MembershipStatus,
  OrganizationRole,
} from "@/lib/domain/enums";

/**
 * Access + session layer (Supabase-backed).
 *
 * Every page reads the current user and their org context through here. RLS is the
 * independent backstop; these functions provide friendly, typed access on top of it.
 */

export interface OrgContext {
  org: Organization;
  currentMember: Member;
  members: Member[];
  actor: ActorContext;
  /** True when the viewer is the public read-only demo guest. */
  isReadOnly: boolean;
}

/** Is this email the configured demo guest account? */
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = process.env.DEMO_EMAIL;
  return Boolean(demo && email && email.toLowerCase() === demo.toLowerCase());
}

type MemberRowRaw = {
  id: string;
  organization_id: string;
  user_id: string | null;
  role: OrganizationRole;
  status: MembershipStatus;
  invited_email: string | null;
  joined_at: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

function mapMember(r: MemberRowRaw, emailOverride?: string | null): Member {
  return {
    id: r.id,
    organizationId: r.organization_id,
    userId: r.user_id,
    role: r.role,
    status: r.status,
    fullName: r.profiles?.full_name || r.invited_email || "Pending member",
    email: emailOverride ?? r.invited_email ?? "",
    invitedEmail: r.invited_email,
    joinedAt: r.joined_at,
    createdAt: r.created_at,
  };
}

function mapOrg(r: {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
  timezone: string;
  renewal_window_days: number;
  created_at: string;
}): Organization {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    baseCurrency: r.base_currency,
    timezone: r.timezone,
    renewalWindowDays: r.renewal_window_days,
    createdAt: r.created_at,
  };
}

export const getSession = cache(async (): Promise<{ userId: string; email: string | null } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
});

export const getOrgContext = cache(async (slug: string): Promise<OrgContext | null> => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("id, name, slug, base_currency, timezone, renewal_window_days, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!orgRow) return null;

  // Members and departments both depend only on the org id — fetch in parallel.
  const [membersRes, deptsRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, organization_id, user_id, role, status, invited_email, joined_at, created_at, profiles(full_name)")
      .eq("organization_id", orgRow.id),
    supabase
      .from("departments")
      .select("id, manager_member_id")
      .eq("organization_id", orgRow.id)
      .is("archived_at", null),
  ]);

  const rows = (membersRes.data ?? []) as unknown as MemberRowRaw[];
  const currentRaw = rows.find((m) => m.user_id === session.userId && m.status === "ACTIVE");
  // Not an active member → indistinguishable from "org does not exist".
  if (!currentRaw) return null;

  const members = rows.map((r) =>
    mapMember(r, r.user_id === session.userId ? session.email : undefined),
  );
  const currentMember = mapMember(currentRaw, session.email);

  const managedDepartmentIds = ((deptsRes.data ?? []) as Array<{ id: string; manager_member_id: string | null }>)
    .filter((d) => d.manager_member_id === currentMember.id)
    .map((d) => d.id);

  const isReadOnly = isDemoEmail(session.email);
  const actor: ActorContext = {
    memberId: currentMember.id,
    role: currentMember.role,
    status: currentMember.status,
    managedDepartmentIds,
    isReadOnly,
  };

  return { org: mapOrg(orgRow), currentMember, members, actor, isReadOnly };
});

export const getMyOrganizations = cache(async (): Promise<Organization[]> => {
  const session = await getSession();
  if (!session) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(id, name, slug, base_currency, timezone, renewal_window_days, created_at)")
    .eq("user_id", session.userId)
    .eq("status", "ACTIVE");

  const orgs = ((data ?? []) as unknown as Array<{ organizations: Parameters<typeof mapOrg>[0] | null }>)
    .map((row) => row.organizations)
    .filter((o): o is Parameters<typeof mapOrg>[0] => Boolean(o))
    .map(mapOrg);
  // De-dupe and sort by name.
  const seen = new Set<string>();
  return orgs.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/** Resolve a member's display name from an already-loaded members array. */
export function nameFromMembers(members: Member[], id: string | null | undefined): string {
  if (!id) return "—";
  return members.find((m) => m.id === id)?.fullName ?? "—";
}
