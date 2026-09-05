"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeTaskAction, cancelTaskAction } from "@/lib/actions/offboarding";

interface Props {
  orgSlug: string;
  taskId: string;
  title: string;
  description: string | null;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  isSubscriptionTask: boolean;
  canComplete: boolean;
  canCancel?: boolean;
}

export function TaskItem({ orgSlug, taskId, title, description, assignee, dueDate, status, isSubscriptionTask, canComplete, canCancel }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const done = status === "COMPLETED";
  const cancelled = status === "CANCELLED";

  async function cancel() {
    setBusy(true);
    const result = await cancelTaskAction(orgSlug, taskId);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task cancelled");
    router.refresh();
  }

  async function complete() {
    setBusy(true);
    const result = await completeTaskAction(orgSlug, taskId);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("Task completed", {
      description: isSubscriptionTask ? "The member's seat assignment was released in Stackceipt." : undefined,
    });
    router.refresh();
  }

  return (
    <li className="flex items-start justify-between gap-3 px-5 py-3">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${done ? "border-transparent bg-[color:var(--success-bg)] text-[color:var(--success)]" : "border-border"}`}>
          {done ? <Check className="size-3.5" /> : null}
        </span>
        <div>
          <div className={`text-sm font-medium ${done || cancelled ? "text-muted-foreground line-through" : ""}`}>{title}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
          <div className="mt-0.5 text-xs text-muted-foreground">
            {assignee ?? "Unassigned"}{dueDate ? ` · due ${dueDate}` : ""}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {done ? (
          <Badge variant="success">Done</Badge>
        ) : cancelled ? (
          <Badge variant="soft">Cancelled</Badge>
        ) : (
          <>
            {canComplete ? (
              isSubscriptionTask ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={busy}>Complete</Button>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Complete this task?</DialogTitle>
                        <DialogDescription>
                          Completing &ldquo;{title}&rdquo; will remove this member&apos;s seat assignment in Stackceipt. This does not revoke
                          access in the vendor&apos;s own system — do that separately.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
                        <Button onClick={complete} disabled={busy}>Complete &amp; unassign</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={complete} disabled={busy}>Complete</Button>
              )
            ) : null}
            {canCancel ? (
              <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" aria-label="Cancel task" title="Cancel task" onClick={cancel} disabled={busy}>
                <X className="size-4" />
              </Button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}
