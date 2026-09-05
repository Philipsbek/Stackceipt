import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge, MembershipStatusBadge } from "@/components/stackceipt/status-badge";
import { EmptyState } from "@/components/stackceipt/states";
import { MemberManage } from "../_components/member-manage";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; memberId: string }>;
}) {
  const { orgSlug, memberId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const member = members.find((m) => m.id === memberId);
  if (!member) notFound();

  const supabase = await createClient();
  const [{ data: assignRows }, { data: taskRows }, { data: caseRows }] = await Promise.all([
    supabase
      .from("subscription_members")
      .select("id, assigned_at, subscriptions(id, vendor_name, product_name)")
      .eq("organization_id", org.id)
      .eq("member_id", member.id)
      .is("unassigned_at", null),
    supabase
      .from("offboarding_tasks")
      .select("id, title")
      .eq("organization_id", org.id)
      .eq("assigned_to_member_id", member.id)
      .eq("status", "PENDING"),
    supabase
      .from("offboarding_cases")
      .select("id")
      .eq("organization_id", org.id)
      .eq("member_id", member.id)
      .in("status", ["OPEN", "IN_PROGRESS"]),
  ]);

  const assignments = (assignRows ?? []) as any[];
  const tasks = (taskRows ?? []) as any[];
  const hasOpenOffboarding = (caseRows ?? []).length > 0;
  const canManage = can(actor, "member.updateRole");
  const canOffboard = can(actor, "offboarding.create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/team`}><ArrowLeft className="size-4" /> Team</Link>
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="size-12"><AvatarFallback className="text-sm">{initials(member.fullName)}</AvatarFallback></Avatar>
          <div>
            <PageHeader title={member.fullName} description={member.email} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <RoleBadge role={member.role} />
          <MembershipStatusBadge status={member.status} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Subscription assignments ({assignments.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="p-5"><EmptyState title="No assignments" description="This member isn't assigned to any subscription seats." /></div>
          ) : (
            <ul className="divide-y divide-border">
              {assignments.map((a) => {
                const s = a.subscriptions;
                if (!s) return null;
                return (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`${base}/subscriptions/${s.id}`} className="font-medium hover:underline">{s.vendor_name} {s.product_name}</Link>
                    <span className="text-xs text-muted-foreground">Since {formatDate(String(a.assigned_at).slice(0, 10))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {tasks.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Open offboarding tasks</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <li key={t.id} className="px-5 py-3 text-sm">{t.title}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {(canManage || canOffboard) && member.role !== "OWNER" ? (
        <Card>
          <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
          <CardContent>
            <MemberManage
              orgSlug={org.slug}
              member={{ id: member.id, fullName: member.fullName, role: member.role, status: member.status }}
              canManage={canManage}
              canOffboard={canOffboard}
              hasOpenOffboarding={hasOpenOffboarding}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
/* eslint-enable @typescript-eslint/no-explicit-any */
