import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listTeam } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { InviteDialog } from "./_components/invite-dialog";
import { TeamTable } from "./_components/team-table";

export default async function TeamPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;
  const base = `/app/${org.slug}`;

  const team = await listTeam(org.id, members);
  const canInvite = can(actor, "member.invite");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Everyone in this organization, their role, and what they can access."
        actions={canInvite ? <InviteDialog orgSlug={org.slug} /> : undefined}
      />

      <TeamTable team={team} base={base} />
    </div>
  );
}
