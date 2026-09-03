import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext, nameFromMembers } from "@/lib/data/access";
import { getRequest } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { annualizedMinor, monthlyMinor } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { BILLING_CADENCE_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import { RequestStatusBadge } from "@/components/stackceipt/status-badge";
import { RequestActions } from "../_components/request-actions";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; requestId: string }>;
}) {
  const { orgSlug, requestId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const r = await getRequest(org.id, requestId);
  if (!r) notFound();

  const isAuthor = r.requestedByMemberId === actor.memberId;
  const canDecide = can(actor, "request.decide", { departmentId: r.departmentId, authorMemberId: r.requestedByMemberId });
  const canCancel = can(actor, "request.cancel", { authorMemberId: r.requestedByMemberId }) && (r.status === "SUBMITTED" || r.status === "DRAFT");
  const canConvert = can(actor, "subscription.create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/requests`}><ArrowLeft className="size-4" /> Requests</Link>
        </Button>
        <PageHeader
          title={`${r.vendorName} ${r.productName}`}
          description={`Requested by ${nameFromMembers(members, r.requestedByMemberId)}${isAuthor ? " (you)" : ""}`}
        />
        <div className="mt-3"><RequestStatusBadge status={r.status} /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Cadence</div>
          <div className="mt-1.5 text-lg font-semibold">{BILLING_CADENCE_LABELS[r.billingCadence]}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Monthly recurring</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums">
            {r.billingCadence === "ONE_TIME" ? "—" : <Money minor={monthlyMinor(r.amountMinor, r.billingCadence, r.billingIntervalMonths)} currency={r.currency} />}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Annual committed</div>
          <div className="mt-1.5 text-lg font-semibold tabular-nums">
            <Money minor={annualizedMinor(r.amountMinor, r.billingCadence, r.billingIntervalMonths)} currency={r.currency} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Business justification</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{r.businessJustification}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Detail label="Requested seats" value={r.requestedSeats ?? "—"} />
          <Detail label="Charge amount" value={<Money minor={r.amountMinor} currency={r.currency} />} />
          <Detail label="Needed by" value={formatDate(r.neededBy)} />
          <Detail label="Submitted" value={formatDate(r.createdAt.slice(0, 10))} />
          {r.decidedAt ? <Detail label="Decided" value={formatDate(r.decidedAt.slice(0, 10))} /> : null}
          {r.decidedByMemberId ? <Detail label="Decided by" value={nameFromMembers(members, r.decidedByMemberId)} /> : null}
        </CardContent>
      </Card>

      {r.decisionNote ? (
        <Card>
          <CardHeader><CardTitle>Decision note</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.decisionNote}</p></CardContent>
        </Card>
      ) : null}

      {isAuthor && r.status === "SUBMITTED" && !canDecide ? (
        <p className="text-sm text-muted-foreground">You can&apos;t approve your own request — an owner, admin, or your department manager will decide.</p>
      ) : null}

      <RequestActions orgSlug={org.slug} requestId={r.id} canDecide={canDecide} canCancel={canCancel} canConvert={canConvert} status={r.status} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}
