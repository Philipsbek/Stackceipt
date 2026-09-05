import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice } from "@/components/stackceipt/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GeneralSettingsForm, TransferOwnershipControl, DeleteOrgControl } from "./_components/settings-form";

export default async function SettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;

  if (!can(actor, "organization.update")) {
    return <PermissionNotice description="Organization settings are managed by owners and admins." />;
  }

  const isOwner = actor.role === "OWNER";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Organization configuration. Changes are recorded in the audit log." />

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent>
          <GeneralSettingsForm
            orgSlug={org.slug}
            org={{ slug: org.slug, name: org.name, baseCurrency: org.baseCurrency, timezone: org.timezone, renewalWindowDays: org.renewalWindowDays }}
          />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-[color:var(--danger-border)]">
          <CardHeader><CardTitle className="text-destructive">Danger zone</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">Transfer ownership</div>
                <p className="text-sm text-muted-foreground">Make another member the owner. There is always exactly one owner.</p>
              </div>
              <TransferOwnershipControl orgSlug={org.slug} members={members} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-destructive">Delete organization</div>
                <p className="text-sm text-muted-foreground">Permanently remove this organization and all its data.</p>
              </div>
              <DeleteOrgControl orgSlug={org.slug} orgName={org.name} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
