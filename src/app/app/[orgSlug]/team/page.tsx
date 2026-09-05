import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listTeam } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { formatDate } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge, MembershipStatusBadge } from "@/components/stackceipt/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteDialog } from "./_components/invite-dialog";

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

      <Card className="hidden overflow-hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead className="text-right">Assignments</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8"><AvatarFallback>{initials(m.fullName)}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{m.fullName}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><RoleBadge role={m.role} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <MembershipStatusBadge status={m.status} />
                    {m.hasOpenOffboarding ? <Badge variant="warning">Offboarding</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  {m.departmentNames.length ? (
                    <div className="flex flex-wrap gap-1">
                      {m.departmentNames.map((d) => <Badge key={d} variant="soft">{d}</Badge>)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.subscriptionCount}</TableCell>
                <TableCell className="text-muted-foreground">{m.joinedAt ? formatDate(m.joinedAt.slice(0, 10)) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Link href={`${base}/team/${m.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">View</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-3 md:hidden">
        {team.map((m) => (
          <Link key={m.id} href={`${base}/team/${m.id}`}>
            <Card className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-9"><AvatarFallback>{initials(m.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <div className="font-medium">{m.fullName}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                  {m.departmentNames.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.departmentNames.slice(0, 3).map((d) => <Badge key={d} variant="soft" className="text-[10px]">{d}</Badge>)}
                    </div>
                  ) : null}
                </div>
              </div>
              <RoleBadge role={m.role} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
