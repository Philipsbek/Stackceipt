import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice } from "@/components/stackceipt/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor } = ctx;

  if (!can(actor, "organization.update")) {
    return <PermissionNotice description="Organization settings are managed by owners and admins." />;
  }

  const isOwner = actor.role === "OWNER";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Organization configuration. Changes are recorded in the audit log." />

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5">Organization name</Label>
            <Input defaultValue={org.name} />
          </div>
          <div>
            <Label className="mb-1.5">Slug</Label>
            <Input defaultValue={org.slug} />
          </div>
          <div>
            <Label className="mb-1.5">Base currency</Label>
            <Input defaultValue={org.baseCurrency} maxLength={3} />
            <p className="mt-1 text-xs text-muted-foreground">V1 is single-currency. All subscriptions use this currency.</p>
          </div>
          <div>
            <Label className="mb-1.5">Timezone</Label>
            <Input defaultValue={org.timezone} />
          </div>
          <div>
            <Label className="mb-1.5">Renewal window (days)</Label>
            <Input type="number" defaultValue={org.renewalWindowDays} />
          </div>
          <div className="sm:col-span-2">
            <Button disabled>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-[color:var(--danger-border)]">
          <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">Transfer ownership</div>
                <p className="text-sm text-muted-foreground">Make another owner. There is always exactly one owner.</p>
              </div>
              <Button variant="outline" disabled>Transfer…</Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-destructive">Delete organization</div>
                <p className="text-sm text-muted-foreground">Permanently remove this organization and all its data.</p>
              </div>
              <Button variant="destructive" disabled>Delete…</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
