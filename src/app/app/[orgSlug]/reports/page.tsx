import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { listFindings } from "@/lib/data/janitor";
import { listRequests } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { totalPotentialSavings } from "@/lib/domain/janitor";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice } from "@/components/stackceipt/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";

export default async function ReportsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  if (!can(actor, "report.read")) {
    return <PermissionNotice description="Reports are available to managers, admins, and owners." />;
  }

  const canExport = can(actor, "report.export");
  const subs = (await listSubscriptions(org.id, members)).filter((s) => s.status === "ACTIVE" || s.status === "TRIAL");
  const findings = await listFindings(org);
  const requests = await listRequests(org.id);

  const byVendor = [...subs]
    .filter((s) => s.billingCadence !== "ONE_TIME")
    .sort((a, b) => b.annualizedMinor - a.annualizedMinor)
    .slice(0, 8);

  const requestOutcomes = {
    approved: requests.filter((r) => r.status === "APPROVED").length,
    denied: requests.filter((r) => r.status === "DENIED").length,
    submitted: requests.filter((r) => r.status === "SUBMITTED").length,
    cancelled: requests.filter((r) => r.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Data-backed views of spend, utilization, and outcomes. Exports respect your access and escape spreadsheet formulas." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top spend by vendor</CardTitle>
            {canExport ? <ExportButton base={base} report="subscriptions" label="Subscriptions CSV" /> : null}
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {byVendor.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="truncate">{s.vendorName} {s.productName}</span>
                  <span className="font-medium tabular-nums"><Money minor={s.annualizedMinor} currency={org.baseCurrency} showCents={false} /></span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Seat utilization</CardTitle>
            {canExport ? <ExportButton base={base} report="seats" label="Seats CSV" /> : null}
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {subs.filter((s) => s.seats.known).sort((a, b) => (a.seats.utilizationPercent ?? 100) - (b.seats.utilizationPercent ?? 100)).slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="truncate">{s.vendorName} {s.productName}</span>
                  <span className={`tabular-nums ${(s.seats.utilizationPercent ?? 100) < 60 ? "text-[color:var(--warning)]" : "text-muted-foreground"}`}>
                    {s.seats.used}/{s.seats.purchased} ({Math.round(s.seats.utilizationPercent ?? 0)}%)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Janitor savings</CardTitle>
            {canExport ? <ExportButton base={base} report="findings" label="Findings CSV" /> : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Open findings</span>
              <span className="font-medium tabular-nums">{findings.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Supportable potential savings</span>
              <span className="font-medium tabular-nums"><Money minor={totalPotentialSavings(findings)} currency={org.baseCurrency} showCents={false} /></span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Request outcomes</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Outcome label="Approved" value={requestOutcomes.approved} />
            <Outcome label="Denied" value={requestOutcomes.denied} />
            <Outcome label="Awaiting" value={requestOutcomes.submitted} />
            <Outcome label="Cancelled" value={requestOutcomes.cancelled} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExportButton({ base, report, label }: { base: string; report: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`${base}/reports/export?report=${report}`}><Download className="size-4" /> {label}</a>
    </Button>
  );
}

function Outcome({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
