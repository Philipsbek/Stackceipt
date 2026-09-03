import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listOffboardingCases } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/dates";
import { OFFBOARDING_STATUS_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice, EmptyState } from "@/components/stackceipt/states";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default async function OffboardingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  if (!can(actor, "offboarding.read")) {
    return <PermissionNotice description="Offboarding is available to managers, admins, and owners." />;
  }

  const cases = await listOffboardingCases(org.id, members);

  return (
    <div className="space-y-6">
      <PageHeader title="Offboarding" description="When someone leaves, reclaim every seat they held. Stackceipt tracks the checklist — it can't revoke access in vendor systems." />

      {cases.length === 0 ? (
        <EmptyState title="No offboarding cases" description="Start a case from a team member's page when they depart." />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const pct = c.totalTasks === 0 ? 0 : (c.completedTasks / c.totalTasks) * 100;
            return (
              <Link key={c.id} href={`${base}/offboarding/${c.id}`}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{c.memberName}</div>
                      <div className="text-xs text-muted-foreground">Departs {formatDate(c.departureDate)}</div>
                    </div>
                    <Badge variant={c.status === "COMPLETED" ? "success" : "warning"}>{OFFBOARDING_STATUS_LABELS[c.status]}</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Progress value={pct} />
                    <div className="text-xs text-muted-foreground">{c.completedTasks} of {c.totalTasks} tasks complete</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
