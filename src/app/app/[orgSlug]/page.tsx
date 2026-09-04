import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { getDashboardData } from "@/lib/data/dashboard";
import { can } from "@/lib/domain/permissions";
import { formatDate, todayInTimezone, urgencyBucket } from "@/lib/domain/dates";
import { cadenceSuffix } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { MetricCard } from "@/components/stackceipt/metric-card";
import { Money } from "@/components/stackceipt/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/stackceipt/states";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, currentMember, members, actor } = ctx;
  const base = `/app/${org.slug}`;
  const data = await getDashboardData(org, members);
  const today = todayInTimezone(org.timezone);

  const firstName = currentMember.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your organization's software spend and everything that needs a decision, at a glance."
        actions={
          can(actor, "subscription.create") ? (
            <Button asChild>
              <Link href={`${base}/subscriptions/new`}>
                <Plus className="size-4" /> Add subscription
              </Link>
            </Button>
          ) : actor.isReadOnly ? (
            <span title="Adding subscriptions is disabled in the read-only demo">
              <Button disabled aria-disabled>
                <Plus className="size-4" /> Add subscription
              </Button>
            </span>
          ) : undefined
        }
      />

      {/* Primary financial metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Monthly recurring"
          emphasis
          value={<Money minor={data.monthlyRecurringMinor} currency={data.currency} showCents={false} />}
          tooltip="Normalized recurring monthly total across active and trial subscriptions. One-time charges are excluded."
        />
        <MetricCard
          label="Annual committed"
          emphasis
          value={<Money minor={data.annualCommittedMinor} currency={data.currency} showCents={false} />}
          tooltip="Annualized recurring cost. This is committed cost, not cash paid to date."
        />
        <MetricCard label="Active subscriptions" emphasis value={data.activeCount} href={`${base}/subscriptions`} />
        <MetricCard
          label={`Renewals · ${data.renewalWindowDays}d`}
          emphasis
          value={data.renewalsInWindow.length}
          href={`${base}/renewals`}
        />
      </div>

      {/* Attention row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open requests" value={data.openRequests} href={`${base}/requests`} hint="Awaiting a decision" />
        <MetricCard label="Reviews due" value={data.reviewsDue} href={`${base}/reviews`} hint="Scheduled or in progress" />
        <MetricCard label="Janitor findings" value={data.openFindings} href={`${base}/janitor`} hint="Unresolved" />
        <MetricCard label="Offboarding tasks" value={data.openOffboardingTasks} href={`${base}/offboarding`} hint="Still open" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming renewals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming renewals</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/renewals`}>
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.renewalsInWindow.length === 0 ? (
              <EmptyState title="No renewals in the window" description={`Nothing renews in the next ${data.renewalWindowDays} days.`} />
            ) : (
              <ul className="divide-y divide-border">
                {data.renewalsInWindow.slice(0, 6).map((s) => {
                  const urgency = urgencyBucket(s.nextRenewalDate, today, data.renewalWindowDays);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`${base}/subscriptions/${s.id}`} className="block truncate text-sm font-medium hover:underline">
                          {s.vendorName} {s.productName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          Renews {formatDate(s.nextRenewalDate)} · {s.departmentName ?? "No department"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {urgency === "overdue" || urgency === "urgent" ? (
                          <Badge variant={urgency === "overdue" ? "danger" : "warning"}>
                            {urgency === "overdue" ? "Overdue" : "Soon"}
                          </Badge>
                        ) : null}
                        <span className="text-sm font-medium tabular-nums">
                          <Money minor={s.amountMinor} currency={s.currency} suffix={cadenceSuffix(s.billingCadence, s.billingIntervalMonths)} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Cost by department */}
        <Card>
          <CardHeader>
            <CardTitle>Annual cost by department</CardTitle>
          </CardHeader>
          <CardContent>
            <Breakdown items={data.byDepartment} currency={data.currency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Annual cost by category</CardTitle>
        </CardHeader>
        <CardContent>
          <Breakdown items={data.byCategory} currency={data.currency} columns />
        </CardContent>
      </Card>
    </div>
  );
}

function Breakdown({
  items,
  currency,
  columns,
}: {
  items: { name: string; annualizedMinor: number }[];
  currency: string;
  columns?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.annualizedMinor));
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <div className={columns ? "grid gap-x-8 gap-y-3 sm:grid-cols-2" : "space-y-3"}>
      {items.map((i) => (
        <div key={i.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{i.name}</span>
            <span className="font-medium tabular-nums">
              <Money minor={i.annualizedMinor} currency={currency} showCents={false} />
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#ececec]">
            <div className="h-full rounded-full bg-[#171717]" style={{ width: `${(i.annualizedMinor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
