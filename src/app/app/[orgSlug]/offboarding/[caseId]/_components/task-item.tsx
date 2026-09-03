"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
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

interface Props {
  title: string;
  description: string | null;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  isSubscriptionTask: boolean;
  canComplete: boolean;
}

export function TaskItem({ title, description, assignee, dueDate, status, isSubscriptionTask, canComplete }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const done = status === "COMPLETED";

  function complete() {
    setOpen(false);
    toast.success("Task completed (demo)", {
      description: isSubscriptionTask ? "The member's seat assignment is removed in the same transaction." : undefined,
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
          <div className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{title}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
          <div className="mt-0.5 text-xs text-muted-foreground">
            {assignee ?? "Unassigned"}{dueDate ? ` · due ${dueDate}` : ""}
          </div>
        </div>
      </div>

      {done ? (
        <Badge variant="success">Done</Badge>
      ) : canComplete ? (
        isSubscriptionTask ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Complete</Button>
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
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={complete}>Complete & unassign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={complete}>Complete</Button>
        )
      ) : null}
    </li>
  );
}
