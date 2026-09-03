import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing } from "lucide-react";
import { getOrgContext } from "@/lib/data/access";
import { listNotifications } from "@/lib/data/collections";
import { formatDateTime } from "@/lib/domain/dates";
import { PageHeader } from "@/components/stackceipt/page-header";
import { EmptyState } from "@/components/stackceipt/states";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await getOrgContext(orgSlug);
  if (!ctx) notFound();
  const { org, currentMember } = ctx;

  const notifications = await listNotifications(org.id, currentMember.id);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="In-app updates for this organization."
        actions={hasUnread ? <Button variant="outline" disabled>Mark all read</Button> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<BellRing className="size-5" />} title="You're all caught up" description="No notifications in this organization." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <Card className={`flex items-start gap-3 p-4 ${!n.readAt ? "border-l-2 border-l-[#171717]" : ""}`}>
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <BellRing className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!n.readAt ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                    {!n.readAt ? <span className="size-1.5 rounded-full bg-[#171717]" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt, { timezone: org.timezone })}</div>
                </div>
              </Card>
            );
            return n.href ? <Link key={n.id} href={n.href}>{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
