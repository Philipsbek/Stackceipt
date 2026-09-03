import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Button } from "@/components/ui/button";
import { RequestForm } from "../_components/request-form";
import { listDepartmentsBasic } from "@/lib/data/subscriptions";

export default async function NewRequestPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org } = ctx;
  const base = `/app/${org.slug}`;
  const departments = await listDepartmentsBasic(org.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`${base}/requests`}><ArrowLeft className="size-4" /> Requests</Link>
        </Button>
        <PageHeader title="New request" description="Request new software. It goes to the people who can approve it for your department." />
      </div>
      <RequestForm base={base} orgSlug={org.slug} baseCurrency={org.baseCurrency} departments={departments} />
    </div>
  );
}
