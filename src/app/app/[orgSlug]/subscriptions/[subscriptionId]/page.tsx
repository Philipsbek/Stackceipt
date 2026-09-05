import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Pencil,
  ShieldAlert,
  Users,
} from "lucide-react";
import { getOrgContext, nameFromMembers } from "@/lib/data/access";
import { assignmentsFor, getSubscription } from "@/lib/data/subscriptions";
import { listFindings } from "@/lib/data/janitor";
import { listAuditLogs, listReviews } from "@/lib/data/collections";
import { listDocuments } from "@/lib/data/documents";
import { DocumentList, DocumentUploader } from "../_components/documents-panel";
import { can } from "@/lib/domain/permissions";
import { formatDate, relativeDays, daysUntil, todayInTimezone } from "@/lib/domain/dates";
import { BILLING_CADENCE_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import {
  SubscriptionStatusBadge,
  CadenceBadge,
  SeverityBadge,
  ReviewStatusBadge,
} from "@/components/stackceipt/status-badge";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; subscriptionId: string }>;
}) {
  const { orgSlug, subscriptionId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const s = await getSubscription(org.id, subscriptionId, members);
  if (!s) notFound();

  const canReadAudit = can(actor, "audit.read");
  const [assignmentsRaw, allFindings, allReviews, auditAll, documents] = await Promise.all([
    assignmentsFor(org.id, s.id),
    listFindings(org),
    listReviews(org.id, members),
    canReadAudit ? listAuditLogs(org.id) : Promise.resolve([]),
    listDocuments(org.id, s.id),
  ]);
  const assignments = assignmentsRaw.filter((a) => !a.unassignedAt);
  const findings = allFindings.filter((f) => f.subscriptionId === s.id);
  const reviews = allReviews.filter((r) => r.subscriptionId === s.id);
  const audit = auditAll.filter((a) => a.entityId === s.id);
  const canEdit = can(actor, "subscription.update", { departmentId: s.departmentId });

  const today = todayInTimezone(org.timezone);
  const renewalDays = daysUntil(s.nextRenewalDate, today);
  const noticeDays = daysUntil(s.noticeDeadline, today);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/subscriptions`}>
            <ArrowLeft className="size-4" /> Subscriptions
          </Link>
        </Button>
        <PageHeader
          title={`${s.vendorName} ${s.productName}`}
          description={s.description ?? undefined}
          actions={
            canEdit ? (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={`${base}/subscriptions/${s.id}/edit`}>
                    <Pencil className="size-4" /> Edit
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SubscriptionStatusBadge status={s.status} />
          <CadenceBadge cadence={s.billingCadence} />
          {s.category ? <Badge variant="soft">{s.category}</Badge> : null}
          {s.websiteUrl ? (
            <a
              href={s.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Website <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      {/* Cost summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {s.billingCadence === "ONE_TIME" ? "One-time spend" : "Monthly recurring"}
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">
            {s.billingCadence === "ONE_TIME" ? (
              <Money minor={s.amountMinor} currency={s.currency} />
            ) : (
              <Money minor={s.monthlyMinor} currency={s.currency} />
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {s.billingCadence === "ONE_TIME" ? "Charged" : "Annual committed"}
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">
            {s.billingCadence === "ONE_TIME" ? (
              <Money minor={s.amountMinor} currency={s.currency} />
            ) : (
              <Money minor={s.annualizedMinor} currency={s.currency} />
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {BILLING_CADENCE_LABELS[s.billingCadence]} charge of <Money minor={s.amountMinor} currency={s.currency} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next renewal</div>
          <div className="mt-1.5 text-2xl font-semibold">{formatDate(s.nextRenewalDate, { style: "medium" })}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {renewalDays !== null ? relativeDays(renewalDays) : "No renewal date"}
            {s.autoRenews ? " · auto-renews" : " · does not auto-renew"}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Notice / renewal alert */}
          {noticeDays !== null && noticeDays <= 21 && s.autoRenews && s.billingCadence !== "ONE_TIME" ? (
            <Card className="border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-5 text-[color:var(--warning)]" />
                <div className="text-sm">
                  <div className="font-medium text-[color:var(--warning)]">
                    {noticeDays < 0 ? "Cancellation notice deadline passed" : "Cancellation notice deadline approaching"}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    Notice deadline is {formatDate(s.noticeDeadline)} ({relativeDays(noticeDays)}), based on a{" "}
                    {s.noticePeriodDays}-day notice period before the {formatDate(s.nextRenewalDate)} renewal.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Billing & contract */}
          <Card>
            <CardHeader><CardTitle>Billing & contract</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="Billing cadence" value={BILLING_CADENCE_LABELS[s.billingCadence]} />
              <Detail label="Amount / charge" value={<Money minor={s.amountMinor} currency={s.currency} />} />
              <Detail label="Currency" value={s.currency} />
              <Detail label="Start date" value={formatDate(s.startDate)} />
              <Detail label="End date" value={formatDate(s.endDate)} />
              <Detail label="Notice period" value={`${s.noticePeriodDays} days`} />
              <Detail label="Contract reference" value={s.contractReference ?? "—"} />
              <Detail label="Last verified" value={s.lastVerifiedAt ? formatDate(s.lastVerifiedAt.slice(0, 10)) : "Never"} />
              <Detail label="Last reviewed" value={s.lastReviewedAt ? formatDate(s.lastReviewedAt.slice(0, 10)) : "Never"} />
            </CardContent>
          </Card>

          {/* Seats & assigned members */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Seats & assignments</CardTitle>
              {s.seats.known ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {s.seats.used}/{s.seats.purchased} used
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {s.seats.utilizationPercent !== null ? (
                <div className="space-y-1.5">
                  <Progress value={Math.min(100, s.seats.utilizationPercent)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(s.seats.utilizationPercent)}% utilization</span>
                    <span>{s.seats.unused} unused</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Seat counts are not recorded for this subscription.</p>
              )}

              <Separator />

              {assignments.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="size-4" /> No members are assigned in Stackceipt.
                </div>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback>{initials(nameFromMembers(members, a.memberId))}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <div className="font-medium">{nameFromMembers(members, a.memberId)}</div>
                        <div className="text-xs text-muted-foreground">Assigned {formatDate(a.assignedAt.slice(0, 10))}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Reviews</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${base}/reviews`}>All reviews</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews scheduled.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {reviews.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarClock className="size-4 text-muted-foreground" />
                        <span>Scheduled {formatDate(r.scheduledFor)}</span>
                        {r.assigneeName ? <span className="text-muted-foreground">· {r.assigneeName}</span> : null}
                      </div>
                      <ReviewStatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ownership</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Detail label="Accountable owner" value={s.ownerName ?? <span className="text-[color:var(--warning)]">Unassigned</span>} />
              <Detail label="Department" value={s.departmentName ?? <span className="text-[color:var(--warning)]">None</span>} />
              <Detail label="Added by" value={nameFromMembers(members, s.createdByMemberId)} />
            </CardContent>
          </Card>

          {/* Janitor findings */}
          <Card>
            <CardHeader><CardTitle>Cost-control findings</CardTitle></CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No findings. This record looks healthy.</p>
              ) : (
                <ul className="space-y-3">
                  {findings.map((f) => (
                    <li key={f.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{f.title}</span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                      {f.estimatedSavingsMinor ? (
                        <p className="text-xs font-medium">
                          Potential savings: <Money minor={f.estimatedSavingsMinor} currency={s.currency} suffix="/yr" showCents={false} />
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {canEdit ? <DocumentUploader orgSlug={org.slug} subscriptionId={s.id} /> : null}
            </CardHeader>
            <CardContent>
              <DocumentList orgSlug={org.slug} documents={documents} canManage={canEdit} />
              <p className="mt-3 text-xs text-muted-foreground">
                Private files in an access-controlled bucket, served via short-lived signed URLs. 25 MB max.
              </p>
            </CardContent>
          </Card>

          {s.notes ? (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.notes}</p></CardContent>
            </Card>
          ) : null}

          {/* Activity (audit) */}
          {canReadAudit ? (
            <Card>
              <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
              <CardContent>
                {audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recorded activity.</p>
                ) : (
                  <ul className="space-y-3">
                    {audit.map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="font-medium">{a.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {nameFromMembers(members, a.actorMemberId)} · {formatDate(a.createdAt.slice(0, 10))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
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

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
