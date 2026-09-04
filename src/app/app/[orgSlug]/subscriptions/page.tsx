import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { distinctCategories, listDepartmentsBasic, listSubscriptions, type SubscriptionRow } from "@/lib/data/subscriptions";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import {
  SubscriptionStatusBadge,
  CadenceBadge,
} from "@/components/stackceipt/status-badge";
import { EmptyState } from "@/components/stackceipt/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubscriptionsToolbar } from "./_components/toolbar";
import { ProductMark } from "@/components/stackceipt/product-mark";

export default async function SubscriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const rows = await listSubscriptions(org.id, members, {
    status: sp.status,
    departmentId: sp.department,
    category: sp.category,
    search: sp.q,
    sort: sp.sort as never,
    includeArchived: sp.status === "ARCHIVED",
  });

  const [departments, categories] = await Promise.all([
    listDepartmentsBasic(org.id),
    distinctCategories(org.id),
  ]);
  const canCreate = can(actor, "subscription.create");
  const hasFilters = Boolean(sp.q || sp.status || sp.department || sp.category);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Every tool your organization pays for, with its true annualized cost."
        actions={
          canCreate ? (
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

      <SubscriptionsToolbar departments={departments} categories={categories} />

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No subscriptions match these filters" : "No subscriptions yet"}
          description={
            hasFilters
              ? "Try clearing a filter or adjusting your search."
              : "Add your first subscription to start tracking your software spend."
          }
          action={
            !hasFilters && canCreate ? (
              <Button asChild>
                <Link href={`${base}/subscriptions/new`}>
                  <Plus className="size-4" /> Add subscription
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {rows.length} subscription{rows.length === 1 ? "" : "s"}
          </p>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Product / category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Annualized</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Renews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductMark productName={s.productName} vendorName={s.vendorName} />
                        <div className="min-w-0">
                          <Link href={`${base}/subscriptions/${s.id}`} className="block truncate font-medium hover:underline">
                            {s.productName}
                          </Link>
                          <div className="truncate text-xs text-muted-foreground">{s.category ?? "Uncategorized"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><SubscriptionStatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{s.departmentName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.billingCadence === "ONE_TIME" ? <span className="text-muted-foreground">—</span> : <Money minor={s.monthlyMinor} currency={s.currency} />}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {s.billingCadence === "ONE_TIME" ? (
                        <span className="text-muted-foreground">One-time</span>
                      ) : (
                        <Money minor={s.annualizedMinor} currency={s.currency} />
                      )}
                    </TableCell>
                    <TableCell><SeatCell s={s} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {s.nextRenewalDate ? formatDate(s.nextRenewalDate, { style: "short" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((s) => (
              <Link key={s.id} href={`${base}/subscriptions/${s.id}`} className="block">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProductMark productName={s.productName} vendorName={s.vendorName} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.productName}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.category ?? "Uncategorized"}</div>
                      </div>
                    </div>
                    <SubscriptionStatusBadge status={s.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-lg font-semibold tabular-nums">
                        {s.billingCadence === "ONE_TIME" ? (
                          <Money minor={s.amountMinor} currency={s.currency} />
                        ) : (
                          <Money minor={s.annualizedMinor} currency={s.currency} suffix="/yr" showCents={false} />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <CadenceBadge cadence={s.billingCadence} />
                        {s.departmentName ? <span className="text-xs text-muted-foreground">{s.departmentName}</span> : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {s.nextRenewalDate ? <>Renews<br />{formatDate(s.nextRenewalDate, { style: "short" })}</> : null}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SeatCell({ s }: { s: SubscriptionRow }) {
  if (!s.seats.known) return <span className="text-xs text-muted-foreground">Unknown</span>;
  const util = s.seats.utilizationPercent;
  return (
    <div className="text-sm tabular-nums">
      {s.seats.used}/{s.seats.purchased}
      {util !== null ? (
        <span className={util < 60 ? "ml-1 text-[color:var(--warning)]" : "ml-1 text-muted-foreground"}>
          ({Math.round(util)}%)
        </span>
      ) : null}
    </div>
  );
}
