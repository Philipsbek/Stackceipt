"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, Check, Loader2, Megaphone } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/domain/dates";
import type { Notification } from "@/lib/domain/types";
import type { NotificationType } from "@/lib/domain/enums";

// General announcements (org activity) get a distinct megaphone; everything
// else keeps the bell.
function iconFor(type: NotificationType) {
  return type === "ANNOUNCEMENT" ? Megaphone : BellRing;
}
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MarkAllReadButton({ orgSlug, isReadOnly }: { orgSlug: string; isReadOnly: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function markAll() {
    setLoading(true);
    const result = await markAllNotificationsReadAction(orgSlug);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (isReadOnly) {
    return (
      <span title="Marking notifications is disabled in the read-only demo">
        <Button variant="outline" disabled aria-disabled>Mark all read</Button>
      </span>
    );
  }
  return (
    <Button variant="outline" onClick={markAll} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      Mark all read
    </Button>
  );
}

export function NotificationList({
  orgSlug,
  notifications,
  timezone,
  isReadOnly,
}: {
  orgSlug: string;
  notifications: Notification[];
  timezone: string;
  isReadOnly: boolean;
}) {
  const router = useRouter();
  const [locallyRead, setLocallyRead] = React.useState<Set<string>>(new Set());

  function activate(n: Notification, isRead: boolean) {
    if (!isReadOnly && !isRead) {
      setLocallyRead((prev) => new Set(prev).add(n.id));
      void markNotificationReadAction(orgSlug, n.id).then(() => router.refresh());
    }
    if (n.href) router.push(n.href);
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const isRead = Boolean(n.readAt) || locallyRead.has(n.id);
        const clickable = Boolean(n.href) || (!isReadOnly && !isRead);
        const Icon = iconFor(n.type);
        const isAnnouncement = n.type === "ANNOUNCEMENT";
        return (
          <Card
            key={n.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => activate(n, isRead) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      activate(n, isRead);
                    }
                  }
                : undefined
            }
            className={`flex items-start gap-3 p-4 ${!isRead ? "border-l-2 border-l-[#171717]" : ""} ${clickable ? "cursor-pointer transition-colors hover:bg-secondary/60" : ""}`}
          >
            <span
              className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg ${isAnnouncement ? "bg-[color:var(--success-bg)] text-[color:var(--success)]" : "bg-secondary text-muted-foreground"}`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!isRead ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                {!isRead ? <span className="size-1.5 rounded-full bg-[#171717]" /> : null}
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt, { timezone })}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
