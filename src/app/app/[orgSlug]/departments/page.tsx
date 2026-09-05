import { notFound } from "next/navigation";
import { getOrgContext } from "@/lib/data/access";
import { listDepartments } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/stackceipt/page-header";
import { DepartmentDialog } from "./_components/department-dialog";
import { DepartmentsGrid } from "./_components/departments-grid";
import type { DeptMember } from "./_components/department-members";

export default async function DepartmentsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, actor, members } = ctx;

  const departments = (await listDepartments(org.id, members)).filter((d) => !d.archivedAt);
  const canCreate = can(actor, "department.create");
  const canManageMembers = can(actor, "department.update");
  const roster: DeptMember[] = members
    .filter((m) => m.status === "ACTIVE")
    .map((m) => ({ id: m.id, name: m.fullName, email: m.email }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Attribute software spend to the teams that use it."
        actions={canCreate ? <DepartmentDialog orgSlug={org.slug} members={members} /> : undefined}
      />

      <DepartmentsGrid
        orgSlug={org.slug}
        baseCurrency={org.baseCurrency}
        departments={departments}
        members={members}
        roster={roster}
        canCreate={canCreate}
        canManage={canManageMembers}
      />
    </div>
  );
}
