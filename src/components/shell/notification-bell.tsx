"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, Check, Megaphone } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { PushControls } from "@/components/pwa/push-controls";
import { formatDateTime } from "@/lib/domain/dates";
import type { Notification } from "@/lib/domain/types";
import type { NotificationType } from "@/lib/domain/enums";

function iconFor(type: NotificationType) {
  return type === "ANNOUNCEMENT" ? Megaphone : BellRing;
}

interface Props {
  orgSlug: string;
  notifications: Notification[];
  unreadCount: number;
  isReadOnly: boolean;
  timezone: string;
}

export function NotificationBell({ orgSlug, notifications, unreadCount, isReadOnly, timezone }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [locallyRead, setLocallyRead] = React.useState<Set<string>>(new Set());
  const [allRead, setAllRead] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [panelTop, setPanelTop] = React.useState(64);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const shownUnread = allRead ? 0 : Math.max(0, unreadCount);

  // Below the `sm` breakpoint the panel drops from the header edge across the
  // viewport instead of anchoring to the bell (which would overflow the screen).
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Measure the header's actual bottom so the mobile panel sits just under it,
  // accounting for the read-only demo banner that can push the header down.
  React.useEffect(() => {
    if (!open || !isMobile) return;
    const measure = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setPanelTop(rect.bottom + 8);
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, isMobile]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function activate(n: Notification, isRead: boolean) {
    if (!isReadOnly && !isRead) {
      setLocallyRead((prev) => new Set(prev).add(n.id));
      void markNotificationReadAction(orgSlug, n.id).then(() => router.refresh());
    }
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  async function markAll() {
    setAllRead(true);
    const result = await markAllNotificationsReadAction(orgSlug);
    if (result.error) {
      setAllRead(false);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${shownUnread ? `, ${shownUnread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BellRing className="size-4.5" />
        {shownUnread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {shownUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={isMobile ? { top: panelTop } : undefined}
          className={`z-50 flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] ${
            isMobile
              ? "fixed left-3 right-3 w-auto"
              : "absolute right-0 top-[calc(100%+8px)] w-[360px] max-w-[calc(100vw-2rem)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {shownUnread > 0 && !isReadOnly ? (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Check className="size-3.5" /> Mark all read
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
          ) : (
            <div className="flex-1 overflow-y-auto py-1">
              {notifications.map((n) => {
                const isRead = Boolean(n.readAt) || locallyRead.has(n.id) || allRead;
                const Icon = iconFor(n.type);
                const isAnnouncement = n.type === "ANNOUNCEMENT";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => activate(n, isRead)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${!isRead ? "bg-secondary/30" : ""}`}
                  >
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${isAnnouncement ? "bg-[color:var(--success-bg)] text-[color:var(--success)]" : "bg-secondary text-muted-foreground"}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${!isRead ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                        {!isRead ? <span className="size-1.5 shrink-0 rounded-full bg-[#171717]" /> : null}
                      </span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{n.body}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateTime(n.createdAt, { timezone })}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <PushControls orgSlug={orgSlug} isReadOnly={isReadOnly} />

          <Link
            href={`/app/${orgSlug}/notifications`}
            onClick={() => setOpen(false)}
            className="border-t border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
