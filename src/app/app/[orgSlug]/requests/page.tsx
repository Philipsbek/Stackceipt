import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getOrgContext, nameFromMembers } from "@/lib/data/access";
import { listRequests } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { annualizedMinor } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import { RequestStatusBadge, CadenceBadge } from "@/components/stackceipt/status-badge";
import { EmptyState } from "@/components/stackceipt/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SubscriptionRequest } from "@/lib/domain/types";

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const all = await listRequests(org.id);
  const mine = all.filter((r) => r.requestedByMemberId === actor.memberId);
  const awaiting = all.filter(
    (r) => r.status === "SUBMITTED" && can(actor, "request.decide", { departmentId: r.departmentId, authorMemberId: r.requestedByMemberId }),
  );
  const completed = all.filter((r) => ["APPROVED", "DENIED", "CANCELLED"].includes(r.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Ask for new software and track approvals with a clear audit trail."
        actions={
          can(actor, "request.create") ? (
            <Button asChild>
              <Link href={`${base}/requests/new`}><Plus className="size-4" /> New request</Link>
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue={awaiting.length > 0 ? "awaiting" : "mine"}>
        <TabsList>
          <TabsTrigger value="awaiting">Awaiting me ({awaiting.length})</TabsTrigger>
          <TabsTrigger value="mine">My requests ({mine.length})</TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="awaiting"><RequestList base={base} members={members} rows={awaiting} emptyTitle="Nothing awaiting your decision" /></TabsContent>
        <TabsContent value="mine"><RequestList base={base} members={members} rows={mine} emptyTitle="You haven't made any requests" /></TabsContent>
        <TabsContent value="all"><RequestList base={base} members={members} rows={all} emptyTitle="No requests yet" /></TabsContent>
        <TabsContent value="completed"><RequestList base={base} members={members} rows={completed} emptyTitle="No completed requests" /></TabsContent>
      </Tabs>
    </div>
  );
}

function RequestList({ base, members, rows, emptyTitle }: { base: string; members: import("@/lib/domain/types").Member[]; rows: SubscriptionRequest[]; emptyTitle: string }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Link key={r.id} href={`${base}/requests/${r.id}`} className="block">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{r.vendorName} {r.productName}</span>
                <RequestStatusBadge status={r.status} />
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                By {nameFromMembers(members, r.requestedByMemberId)} · {formatDate(r.createdAt.slice(0, 10))}
                {r.neededBy ? ` · needed by ${formatDate(r.neededBy)}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CadenceBadge cadence={r.billingCadence} />
              <span className="text-sm font-medium tabular-nums">
                <Money minor={annualizedMinor(r.amountMinor, r.billingCadence, r.billingIntervalMonths)} currency={r.currency} suffix="/yr" showCents={false} />
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
