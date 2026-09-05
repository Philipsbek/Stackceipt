import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { getRequest } from "@/lib/data/collections";
import { listDepartmentsBasic } from "@/lib/data/subscriptions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { RequestForm, NONE, type RequestFormValues } from "../../_components/request-form";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ orgSlug: string; requestId: string }>;
}) {
  const { orgSlug, requestId } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor } = ctx;
  const base = `/app/${org.slug}`;

  const r = await getRequest(org.id, requestId);
  // Only the author may edit, and only while it's still a draft.
  if (!r || r.status !== "DRAFT" || r.requestedByMemberId !== actor.memberId) notFound();

  const departments = await listDepartmentsBasic(org.id);

  const initial: Partial<RequestFormValues> = {
    vendorName: r.vendorName === "Untitled" ? "" : r.vendorName,
    productName: r.productName === "Untitled" ? "" : r.productName,
    businessJustification: r.businessJustification === "(draft)" ? "" : r.businessJustification,
    departmentId: r.departmentId ?? NONE,
    requestedSeats: r.requestedSeats != null ? String(r.requestedSeats) : "",
    amountMajor: r.amountMinor > 0 ? String(r.amountMinor / 100) : "",
    currency: r.currency,
    billingCadence: r.billingCadence,
    billingIntervalMonths: r.billingIntervalMonths != null ? String(r.billingIntervalMonths) : "",
    neededBy: r.neededBy ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/requests/${requestId}`}><ArrowLeft className="size-4" /> Back to request</Link>
        </Button>
        <PageHeader title="Edit draft" description="Update the details, then save the draft or submit it for approval." />
      </div>
      <RequestForm base={base} orgSlug={org.slug} baseCurrency={org.baseCurrency} departments={departments} requestId={requestId} initial={initial} />
    </div>
  );
}
