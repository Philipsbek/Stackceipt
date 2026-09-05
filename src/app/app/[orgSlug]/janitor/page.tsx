import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { listFindings } from "@/lib/data/janitor";
import { can } from "@/lib/domain/permissions";
import { totalPotentialSavings } from "@/lib/domain/janitor";
import { JANITOR_SEVERITIES } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice, EmptyState } from "@/components/stackceipt/states";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/stackceipt/metric-card";
import { Money } from "@/components/stackceipt/money";
import { SeverityBadge } from "@/components/stackceipt/status-badge";
import { RunJanitorButton, FindingActions } from "./_components/janitor-client";

const SEVERITY_ORDER = ["HIGH", "MEDIUM", "LOW", "INFO"] as const;

export default async function JanitorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor } = ctx;
  const base = `/app/${org.slug}`;

  if (!can(actor, "janitor.read")) {
    return <PermissionNotice description="The Janitor is available to managers, admins, and owners." />;
  }

  const findings = (await listFindings(org)).sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity as never) - SEVERITY_ORDER.indexOf(b.severity as never),
  );
  const savings = totalPotentialSavings(findings);
  const bySeverity = Object.fromEntries(
    JANITOR_SEVERITIES.map((sev) => [sev, findings.filter((f) => f.severity === sev).length]),
  ) as Record<string, number>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Janitor"
        description="A deterministic rules engine — not AI — that surfaces data-quality, renewal, ownership, and utilization risks from your own data."
        actions={can(actor, "janitor.run") ? <RunJanitorButton /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open findings" emphasis value={findings.length} />
        <MetricCard label="High severity" emphasis value={bySeverity.HIGH ?? 0} />
        <MetricCard
          label="Supportable savings"
          emphasis
          value={<Money minor={savings} currency={org.baseCurrency} showCents={false} />}
          tooltip="Only findings with a mechanically defensible per-seat derivation contribute savings. Risk-only findings show no number."
        />
        <MetricCard label="Rules evaluated" emphasis value={12} hint="Idempotent, fingerprinted" />
      </div>

      {findings.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-5" />} title="Nothing to clean up" description="No findings — your subscription data looks healthy." />
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="font-medium">{f.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{f.ruleKey}</code>
                    {f.estimatedSavingsMinor ? (
                      <span className="font-medium text-foreground">
                        Potential savings: <Money minor={f.estimatedSavingsMinor} currency={org.baseCurrency} suffix="/yr" showCents={false} />
                      </span>
                    ) : (
                      <span>No provable savings</span>
                    )}
                    {f.subscriptionId ? (
                      <Link href={`${base}/subscriptions/${f.subscriptionId}`} className="hover:text-foreground hover:underline">
                        View subscription
                      </Link>
                    ) : null}
                  </div>
                </div>
                {can(actor, "janitor.resolve") ? <FindingActions orgSlug={org.slug} fingerprint={f.fingerprint} title={f.title} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-5 text-xs text-muted-foreground">
          Findings are computed deterministically and de-duplicated by an organization-scoped fingerprint, so
          re-running the scan updates existing findings rather than creating duplicates. Nothing here uses AI.
        </CardContent>
      </Card>
    </div>
  );
}
