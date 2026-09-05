import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/domain/enums";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "./_components/account-form";

export const metadata = { title: "Your account" };

export default async function AccountPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { actor, currentMember } = ctx;

  // Read the raw profile name (not the "Pending member" display fallback).
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: profile } = userData.user
    ? await supabase.from("profiles").select("full_name").eq("id", userData.user.id).maybeSingle()
    : { data: null };
  const rawName = (profile?.full_name as string | undefined) ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Your account" description="Manage how you appear in this workspace." />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm initialName={rawName} email={currentMember.email} role={ROLE_LABELS[actor.role]} />
        </CardContent>
      </Card>
    </div>
  );
}
