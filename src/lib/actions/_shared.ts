import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/data/access";
import type { NotificationType, OrganizationRole } from "@/lib/domain/enums";

type Supa = Awaited<ReturnType<typeof createClient>>;

export interface ActorCtx {
  supabase: Supa;
  orgId: string;
  baseCurrency: string;
  memberId: string;
  role: OrganizationRole;
  isReadOnly: boolean;
}

/** Standard rejection for a write attempted by the read-only demo guest. */
export const DEMO_READONLY_ERROR = "This is a read-only demo. Sign up to get your own workspace and make changes.";

/** Resolve the current authenticated user's active membership in an org (by slug). */
export async function resolveActor(orgSlug: string): Promise<ActorCtx | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, base_currency")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return null;

  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", org.id)
    .eq("user_id", userData.user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!member) return null;

  return {
    supabase,
    orgId: org.id as string,
    baseCurrency: org.base_currency as string,
    memberId: member.id as string,
    role: member.role as OrganizationRole,
    isReadOnly: isDemoEmail(userData.user.email),
  };
}

/** Append an audit entry via the hardened SECURITY DEFINER function (actor derived server-side). */
export async function appendAudit(
  supabase: Supa,
  orgId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await supabase.rpc("append_audit", {
    p_org: orgId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_before: before,
    p_after: after,
    p_metadata: metadata,
  });
}

/** Create in-app notifications for a set of recipients (no-op on empty). */
export async function notify(
  supabase: Supa,
  orgId: string,
  recipientMemberIds: string[],
  n: {
    type: NotificationType;
    title: string;
    body: string;
    href?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
): Promise<void> {
  const unique = [...new Set(recipientMemberIds)].filter(Boolean);
  if (unique.length === 0) return;
  await supabase.from("notifications").insert(
    unique.map((id) => ({
      organization_id: orgId,
      recipient_member_id: id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href ?? null,
      entity_type: n.entityType ?? null,
      entity_id: n.entityId ?? null,
    })),
  );
}

/** All ACTIVE member ids for an org. */
export async function activeMemberIds(supabase: Supa, orgId: string): Promise<string[]> {
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "ACTIVE");
  return (data ?? []).map((m) => (m as { id: string }).id);
}

/**
 * Broadcast a general ANNOUNCEMENT to the whole team — an informational
 * activity notification emitted on important edits. Recipients include the
 * actor so the edit is always visible in the notification feed.
 */
export async function announce(
  supabase: Supa,
  orgId: string,
  n: { title: string; body: string; href?: string | null; entityType?: string | null; entityId?: string | null },
): Promise<void> {
  const ids = await activeMemberIds(supabase, orgId);
  await notify(supabase, orgId, ids, { type: "ANNOUNCEMENT", ...n });
}

/** Active OWNER/ADMIN member ids for an org, plus an optional department manager. */
export async function approverMemberIds(
  supabase: Supa,
  orgId: string,
  departmentId: string | null,
): Promise<string[]> {
  const { data: admins } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("status", "ACTIVE")
    .in("role", ["OWNER", "ADMIN"]);
  const ids = (admins ?? []).map((m) => (m as { id: string }).id);

  if (departmentId) {
    const { data: dept } = await supabase
      .from("departments")
      .select("manager_member_id")
      .eq("id", departmentId)
      .maybeSingle();
    const mgr = (dept as { manager_member_id: string | null } | null)?.manager_member_id;
    if (mgr) ids.push(mgr);
  }
  return ids;
}
