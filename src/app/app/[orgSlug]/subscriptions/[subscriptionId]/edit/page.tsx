import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { getSubscription, listDepartmentsBasic } from "@/lib/data/subscriptions";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { PermissionNotice } from "@/components/stackceipt/states";
import { Button } from "@/components/ui/button";
import { SubscriptionForm } from "../../_components/subscription-form";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ orgSlug: string; subscriptionId: string }>;
}) {
  const { orgSlug, subscriptionId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const s = await getSubscription(org.id, subscriptionId, members);
  if (!s) notFound();

  if (!can(actor, "subscription.update", { departmentId: s.departmentId })) {
    return <PermissionNotice description="You can only edit subscriptions in departments you manage." />;
  }

  const departments = await listDepartmentsBasic(org.id);
  const memberOptions = members.filter((m) => m.status === "ACTIVE").map((m) => ({ id: m.id, name: m.fullName }));

  const initial = {
    vendorName: s.vendorName,
    productName: s.productName,
    description: s.description ?? "",
    category: s.category ?? "",
    websiteUrl: s.websiteUrl ?? "",
    status: s.status,
    departmentId: s.departmentId ?? "__none__",
    ownerMemberId: s.ownerMemberId ?? "__none__",
    billingCadence: s.billingCadence,
    billingIntervalMonths: s.billingIntervalMonths ? String(s.billingIntervalMonths) : "",
    amountMajor: (s.amountMinor / 100).toString(),
    currency: s.currency,
    startDate: s.startDate ?? "",
    nextRenewalDate: s.nextRenewalDate ?? "",
    endDate: s.endDate ?? "",
    autoRenews: s.autoRenews,
    noticePeriodDays: String(s.noticePeriodDays),
    seatsPurchased: s.seatsPurchased != null ? String(s.seatsPurchased) : "",
    seatsUsed: s.seatsUsed != null ? String(s.seatsUsed) : "",
    contractReference: s.contractReference ?? "",
    notes: s.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/subscriptions/${s.id}`}><ArrowLeft className="size-4" /> Back to subscription</Link>
        </Button>
        <PageHeader title={`Edit ${s.vendorName} ${s.productName}`} description="Changes to financial fields are recorded in the audit log." />
      </div>
      <SubscriptionForm base={base} orgSlug={org.slug} subscriptionId={s.id} baseCurrency={org.baseCurrency} departments={departments} members={memberOptions} mode="edit" initial={initial} />
    </div>
  );
}
