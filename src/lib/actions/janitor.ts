"use server";

import { revalidatePath } from "next/cache";
import { announce, appendAudit, DEMO_READONLY_ERROR, resolveActor, type Supa } from "./_shared";
import { computeFindings } from "@/lib/data/janitor";
import { getOrgContext } from "@/lib/data/access";
import type { JanitorFinding } from "@/lib/domain/types";

export type ActionResult = { error?: string; ok?: boolean };

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}

/** Persist a finding's resolution state by fingerprint (upsert on the unique index). */
async function persist(
  supabase: Supa,
  orgId: string,
  finding: JanitorFinding,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("janitor_findings").upsert(
    {
      organization_id: orgId,
      subscription_id: finding.subscriptionId,
      rule_key: finding.ruleKey,
      fingerprint: finding.fingerprint,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      estimated_savings_minor: finding.estimatedSavingsMinor,
      evidence: finding.evidence ?? {},
      ...patch,
    },
    { onConflict: "organization_id,fingerprint" },
  );
  return error ? { error: friendly(error.message) } : {};
}

export async function resolveFindingAction(orgSlug: string, fingerprint: string): Promise<ActionResult> {
  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can resolve findings." };
  const { supabase, orgId, memberId } = actor;

  const ctx = await getOrgContext(orgSlug);
  if (!ctx) return { error: "Not authorized" };
  const finding = (await computeFindings(ctx.org)).find((f) => f.fingerprint === fingerprint);
  if (!finding) return { error: "This finding no longer applies." };

  const res = await persist(supabase, orgId, finding, {
    status: "RESOLVED",
    resolved_at: new Date().toISOString(),
    resolved_by_member_id: memberId,
  });
  if (res.error) return { error: res.error };

  await appendAudit(supabase, orgId, "janitor.resolved", "janitor_finding", null, null, { fingerprint, rule: finding.ruleKey }, {});
  await announce(supabase, orgId, {
    title: "Janitor finding resolved",
    body: `"${finding.title}" was marked resolved.`,
    href: `/app/${orgSlug}/janitor`,
    entityType: "janitor_finding",
    entityId: null,
  });
  revalidatePath(`/app/${orgSlug}/janitor`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}

export async function dismissFindingAction(orgSlug: string, fingerprint: string, reason: string): Promise<ActionResult> {
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < 3) return { error: "A reason is required to dismiss a finding." };

  const actor = await resolveActor(orgSlug);
  if (!actor) return { error: "Not authorized" };
  if (actor.isReadOnly) return { error: DEMO_READONLY_ERROR };
  if (actor.role !== "OWNER" && actor.role !== "ADMIN") return { error: "Only owners and admins can dismiss findings." };
  const { supabase, orgId, memberId } = actor;

  const ctx = await getOrgContext(orgSlug);
  if (!ctx) return { error: "Not authorized" };
  const finding = (await computeFindings(ctx.org)).find((f) => f.fingerprint === fingerprint);
  if (!finding) return { error: "This finding no longer applies." };

  const res = await persist(supabase, orgId, finding, {
    status: "DISMISSED",
    dismissal_reason: trimmed,
    resolved_by_member_id: memberId,
  });
  if (res.error) return { error: res.error };

  await appendAudit(supabase, orgId, "janitor.dismissed", "janitor_finding", null, null, { fingerprint, reason: trimmed }, {});
  await announce(supabase, orgId, {
    title: "Janitor finding dismissed",
    body: `"${finding.title}" was dismissed.`,
    href: `/app/${orgSlug}/janitor`,
    entityType: "janitor_finding",
    entityId: null,
  });
  revalidatePath(`/app/${orgSlug}/janitor`);
  revalidatePath(`/app/${orgSlug}`, "layout");
  return { ok: true };
}
