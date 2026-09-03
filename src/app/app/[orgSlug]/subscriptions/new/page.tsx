import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice } from "@/components/stackceipt/states";
import { Button } from "@/components/ui/button";
import { SubscriptionForm } from "../_components/subscription-form";
import { listDepartmentsBasic } from "@/lib/data/subscriptions";

export default async function NewSubscriptionPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  if (!can(actor, "subscription.create")) {
    return <PermissionNotice description="You need manager or admin access to add subscriptions." />;
  }

  const departments = await listDepartmentsBasic(org.id);
  const memberOptions = members
    .filter((m) => m.status === "ACTIVE")
    .map((m) => ({ id: m.id, name: m.fullName }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/subscriptions`}><ArrowLeft className="size-4" /> Subscriptions</Link>
        </Button>
        <PageHeader title="Add subscription" description="Record a tool, its cost, and its renewal so Stackceipt can track it." />
      </div>
      <SubscriptionForm base={base} orgSlug={org.slug} baseCurrency={org.baseCurrency} departments={departments} members={memberOptions} mode="create" />
    </div>
  );
}
