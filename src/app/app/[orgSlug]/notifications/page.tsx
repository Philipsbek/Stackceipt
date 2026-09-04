import { notFound } from "next/navigation";
import { BellRing } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { listNotifications } from "@/lib/data/collections";
import { PageHeader } from "@/components/stackceipt/page-header";
import { EmptyState } from "@/components/stackceipt/states";
import { MarkAllReadButton, NotificationList } from "./_components/notifications-client";

export default async function NotificationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, currentMember, isReadOnly } = ctx;

  const notifications = await listNotifications(org.id, currentMember.id);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="In-app updates for this organization."
        actions={hasUnread ? <MarkAllReadButton orgSlug={org.slug} isReadOnly={isReadOnly} /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<BellRing className="size-5" />} title="You're all caught up" description="No notifications in this organization." />
      ) : (
        <NotificationList orgSlug={org.slug} notifications={notifications} timezone={org.timezone} isReadOnly={isReadOnly} />
      )}
    </div>
  );
}
