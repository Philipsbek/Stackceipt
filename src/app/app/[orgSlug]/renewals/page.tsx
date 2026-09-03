import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listSubscriptions, type SubscriptionRow } from "@/lib/data/subscriptions";
import { daysUntil, formatDate, relativeDays, todayInTimezone, urgencyBucket, type Urgency } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/stackceipt/states";

const GROUPS: { key: Urgency; title: string; badge: "danger" | "warning" | "soft" | "outline" }[] = [
  { key: "overdue", title: "Notice deadline passed", badge: "danger" },
  { key: "urgent", title: "Next 14 days", badge: "warning" },
  { key: "soon", title: "Next 30 days", badge: "soft" },
  { key: "upcoming", title: "Later in the window", badge: "outline" },
];

export default async function RenewalsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, members } = ctx;
  const base = `/app/${org.slug}`;
  const today = todayInTimezone(org.timezone);

  const subs = (await listSubscriptions(org.id, members))
    .filter((s) => (s.status === "ACTIVE" || s.status === "TRIAL") && s.nextRenewalDate && s.billingCadence !== "ONE_TIME")
    .map((s) => ({ s, urgency: urgencyBucket(s.nextRenewalDate, today, org.renewalWindowDays) }))
    .filter((x) => x.urgency !== "none")
    .sort((a, b) => (a.s.nextRenewalDate ?? "").localeCompare(b.s.nextRenewalDate ?? ""));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewals"
        description={`Everything renewing in the next ${org.renewalWindowDays} days, with the exact date you must give notice.`}
      />

      {subs.length === 0 ? (
        <EmptyState title="Nothing renewing soon" description={`No active subscription renews in the next ${org.renewalWindowDays} days.`} />
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const rows = subs.filter((x) => x.urgency === group.key).map((x) => x.s);
            if (rows.length === 0) return null;
            return (
              <Card key={group.key}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{group.title}</CardTitle>
                  <Badge variant={group.badge}>{rows.length}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {rows.map((s) => <RenewalRow key={s.id} base={base} s={s} today={today} />)}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RenewalRow({ base, s, today }: { base: string; s: SubscriptionRow; today: string }) {
  const noticeDays = daysUntil(s.noticeDeadline, today);
  const noticePassed = noticeDays !== null && noticeDays < 0;
  return (
    <li className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`${base}/subscriptions/${s.id}`} className="block truncate font-medium hover:underline">
          {s.vendorName} {s.productName}
        </Link>
        <div className="text-xs text-muted-foreground">
          Renews {formatDate(s.nextRenewalDate)} · {s.departmentName ?? "No department"} · {s.ownerName ?? "No owner"}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs">
          <div className={noticePassed ? "font-medium text-destructive" : "text-muted-foreground"}>
            Notice by {formatDate(s.noticeDeadline)}
          </div>
          <div className="text-muted-foreground">{noticeDays !== null ? relativeDays(noticeDays) : ""}</div>
        </div>
        <span className="w-24 text-right text-sm font-medium tabular-nums">
          <Money minor={s.annualizedMinor} currency={s.currency} suffix="/yr" showCents={false} />
        </span>
      </div>
    </li>
  );
}
