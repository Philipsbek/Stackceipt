import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext, nameFromMembers } from "@/lib/data/access";
import { getOffboardingCase } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/dates";
import { OFFBOARDING_STATUS_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TaskItem } from "./_components/task-item";

export default async function OffboardingCaseDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; caseId: string }>;
}) {
  const { orgSlug, caseId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const c = await getOffboardingCase(org.id, caseId, members);
  if (!c) notFound();

  const pct = c.totalTasks === 0 ? 0 : (c.completedTasks / c.totalTasks) * 100;
  const allDone = c.completedTasks >= c.totalTasks && c.totalTasks > 0;
  const canComplete = can(actor, "offboarding.complete", { assigneeMemberId: actor.memberId });
  const canManage = can(actor, "offboarding.update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/offboarding`}><ArrowLeft className="size-4" /> Offboarding</Link>
        </Button>
        <PageHeader
          title={`Offboarding ${c.memberName}`}
          description={`Departure date ${formatDate(c.departureDate)}. Initiated by ${nameFromMembers(members, c.initiatedByMemberId)}.`}
          actions={<Badge variant={c.status === "COMPLETED" ? "success" : "warning"}>{OFFBOARDING_STATUS_LABELS[c.status]}</Badge>}
        />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">{c.completedTasks} of {c.totalTasks} tasks</span>
        </div>
        <Progress value={pct} className="mt-2" />
      </Card>

      {c.notes ? (
        <Card><CardContent className="p-5 text-sm text-muted-foreground">{c.notes}</CardContent></Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {c.tasks.map((t) => (
              <TaskItem
                key={t.id}
                title={t.title}
                description={t.description}
                assignee={t.assignedToMemberId ? nameFromMembers(members, t.assignedToMemberId) : null}
                dueDate={t.dueDate ? formatDate(t.dueDate) : null}
                status={t.status}
                isSubscriptionTask={Boolean(t.subscriptionId)}
                canComplete={canComplete || canManage}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      {canManage ? (
        <div className="flex justify-end">
          <Button disabled={!allDone} variant={allDone ? "default" : "outline"}>
            {allDone ? "Complete offboarding" : "Complete all tasks first"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
