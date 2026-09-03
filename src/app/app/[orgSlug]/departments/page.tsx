import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { listDepartments } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stackceipt/money";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/stackceipt/states";

export default async function DepartmentsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;

  const departments = (await listDepartments(org.id, members)).filter((d) => !d.archivedAt);
  const canCreate = can(actor, "department.create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Attribute software spend to the teams that use it."
        actions={canCreate ? <Button disabled><Plus className="size-4" /> New department</Button> : undefined}
      />

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" description="Create a department to organize subscriptions and spend." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{d.name}</CardTitle>
                  {d.managerName ? <Badge variant="soft">{d.managerName}</Badge> : <Badge variant="warning">No manager</Badge>}
                </div>
                {d.description ? <p className="text-sm text-muted-foreground">{d.description}</p> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Annual cost</div>
                    <div className="text-xl font-semibold tabular-nums"><Money minor={d.annualizedMinor} currency={org.baseCurrency} showCents={false} /></div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{d.subscriptionCount} subscriptions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
