import { notFound } from "next/navigation";
import { getMyOrganizations, getOrgContext } from "@/lib/data/access";
import { unreadCount } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { NAV_ITEMS } from "@/lib/nav";
import { AppShell } from "@/components/shell/app-shell";
import { ROLE_LABELS } from "@/lib/domain/enums";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);

  // Non-member or non-existent org are indistinguishable — always 404.
  if (!ctx) notFound();

  const { org, currentMember, actor, isReadOnly } = ctx;

  const navItems = NAV_ITEMS.filter(
    (item) => !item.permission || can(actor, item.permission),
  );

  const orgs = (await getMyOrganizations()).map((o) => ({ slug: o.slug, name: o.name }));
  const unread = await unreadCount(org.id, currentMember.id);

  return (
    <AppShell
      org={{ slug: org.slug, name: org.name }}
      orgs={orgs}
      user={{ name: currentMember.fullName, email: currentMember.email, role: ROLE_LABELS[currentMember.role] }}
      navItems={navItems}
      unreadCount={unread}
      isReadOnly={isReadOnly}
    >
      {children}
    </AppShell>
  );
}
