import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listReviews, type ReviewRow } from "@/lib/data/collections";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { can } from "@/lib/domain/permissions";
import { daysUntil, formatDate, relativeDays, todayInTimezone } from "@/lib/domain/dates";
import { REVIEW_DECISION_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice, EmptyState } from "@/components/stackceipt/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewStatusBadge } from "@/components/stackceipt/status-badge";
import { ScheduleReviewDialog, CompleteReviewButton } from "./_components/reviews-client";

export default async function ReviewsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor } = ctx;
  const base = `/app/${org.slug}`;

  if (!can(actor, "review.read")) {
    return <PermissionNotice description="Reviews are visible to managers, admins, and owners." />;
  }

  const reviews = await listReviews(org.id, ctx.members);
  const today = todayInTimezone(org.timezone);
  const open = reviews.filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS");
  const completed = reviews.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  const canSchedule = can(actor, "review.schedule");
  const canComplete = can(actor, "review.complete");
  const subscriptionOptions = canSchedule
    ? (await listSubscriptions(org.id, ctx.members))
        .filter((s) => s.status === "ACTIVE" || s.status === "TRIAL")
        .map((s) => ({ id: s.id, label: `${s.vendorName} ${s.productName}` }))
    : [];
  const memberOptions = ctx.members.filter((m) => m.status === "ACTIVE").map((m) => ({ id: m.id, label: m.fullName }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Scheduled checks on whether a subscription still earns its cost. Completing a review never changes a subscription on its own."
        actions={canSchedule ? <ScheduleReviewDialog orgSlug={org.slug} subscriptions={subscriptionOptions} members={memberOptions} /> : undefined}
      />

      <Card>
        <CardHeader><CardTitle>Open reviews</CardTitle></CardHeader>
        <CardContent className="p-0">
          {open.length === 0 ? (
            <div className="p-5"><EmptyState title="No open reviews" description="Schedule a review from a subscription's page." /></div>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((r) => (
                <ReviewLi
                  key={r.id}
                  base={base}
                  orgSlug={org.slug}
                  r={r}
                  today={today}
                  showComplete={canComplete || r.assignedToMemberId === actor.memberId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completed</CardTitle></CardHeader>
        <CardContent className="p-0">
          {completed.length === 0 ? (
            <div className="p-5"><EmptyState title="No completed reviews yet" /></div>
          ) : (
            <ul className="divide-y divide-border">
              {completed.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`${base}/subscriptions/${r.subscriptionId}`} className="font-medium hover:underline">{r.subscriptionLabel}</Link>
                    <div className="text-xs text-muted-foreground">
                      {r.decision ? `${REVIEW_DECISION_LABELS[r.decision]} · ` : ""}Completed {formatDate(r.completedAt?.slice(0, 10))}
                      {r.summary ? ` — ${r.summary}` : ""}
                    </div>
                  </div>
                  <ReviewStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewLi({ base, orgSlug, r, today, showComplete }: { base: string; orgSlug: string; r: ReviewRow; today: string; showComplete: boolean }) {
  const d = daysUntil(r.scheduledFor, today);
  const overdue = d !== null && d < 0;
  return (
    <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href={`${base}/subscriptions/${r.subscriptionId}`} className="font-medium hover:underline">{r.subscriptionLabel}</Link>
        <div className="text-xs text-muted-foreground">
          Scheduled {formatDate(r.scheduledFor)} · {r.assigneeName ?? "Unassigned"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {overdue ? <Badge variant="danger">Overdue {relativeDays(d)}</Badge> : d !== null && d <= 14 ? <Badge variant="warning">{relativeDays(d)}</Badge> : null}
        <ReviewStatusBadge status={r.status} />
        {showComplete ? <CompleteReviewButton orgSlug={orgSlug} reviewId={r.id} label={r.subscriptionLabel} /> : null}
      </div>
    </li>
  );
}
