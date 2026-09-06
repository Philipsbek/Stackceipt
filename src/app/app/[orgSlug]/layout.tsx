import { notFound } from "next/navigation";
import { getMyOrganizations, getOrgContext } from "@/lib/data/access";
import { listNotifications, unreadCount } from "@/lib/data/collections";
import { can } from "@/lib/domain/permissions";
import { NAV_ITEMS } from "@/lib/nav";
import { AppShell } from "@/components/shell/app-shell";

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
  const [unread, allNotifications] = await Promise.all([
    unreadCount(org.id, currentMember.id),
    listNotifications(org.id, currentMember.id),
  ]);
  const recentNotifications = allNotifications.slice(0, 8);

  return (
    <AppShell
      org={{ slug: org.slug, name: org.name }}
      orgs={orgs}
      user={{ name: currentMember.fullName, email: currentMember.email, role: currentMember.role }}
      navItems={navItems}
      unreadCount={unread}
      notifications={recentNotifications}
      timezone={org.timezone}
      isReadOnly={isReadOnly}
    >
      {children}
    </AppShell>
  );
}
