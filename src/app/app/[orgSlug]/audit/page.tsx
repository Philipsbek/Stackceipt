import { notFound } from "next/navigation";
import { getOrgContext, nameFromMembers } from "@/lib/data/access";
import { listAuditLogs } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { formatDateTime } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice, EmptyState } from "@/components/stackceipt/states";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AuditPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;

  if (!can(actor, "audit.read")) {
    return <PermissionNotice description="The audit log is restricted to owners and admins." />;
  }

  const logs = await listAuditLogs(org.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="An append-only record of security- and business-relevant events. Normal roles cannot alter it." />

      {logs.length === 0 ? (
        <EmptyState title="No audit events yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {logs.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{a.action}</code>
                      <Badge variant="outline">{a.entityType}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {nameFromMembers(members, a.actorMemberId)}
                      {a.metadata && Object.keys(a.metadata).length > 0 ? ` · ${Object.entries(a.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt, { timezone: org.timezone })}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
