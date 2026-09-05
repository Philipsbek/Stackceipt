"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveFindingAction, dismissFindingAction } from "@/lib/actions/janitor";

export function RunJanitorButton() {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  return (
    <Button
      onClick={() => {
        setRunning(true);
        // Findings are recomputed deterministically from live data on every
        // load, so a rescan is a real refresh of the rules engine.
        router.refresh();
        toast.success("Janitor rescanned", { description: "Findings recomputed from your current data." });
        setTimeout(() => setRunning(false), 400);
      }}
      disabled={running}
    >
      {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      Run Janitor
    </Button>
  );
}

export function FindingActions({ orgSlug, fingerprint, title }: { orgSlug: string; fingerprint: string; title: string }) {
  const router = useRouter();
  const [dismissOpen, setDismissOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function resolve() {
    setBusy(true);
    const result = await resolveFindingAction(orgSlug, fingerprint);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Finding resolved", { description: `"${title}" marked resolved.` });
    router.refresh();
  }

  async function dismiss() {
    setBusy(true);
    const result = await dismissFindingAction(orgSlug, fingerprint, reason);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setDismissOpen(false);
    toast.success("Finding dismissed");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Finding actions" disabled={busy}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={resolve}>Mark resolved</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDismissOpen(true)}>Dismiss…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss finding</DialogTitle>
            <DialogDescription>A reason is required. Dismissed findings can reappear if the underlying record changes.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1.5">Reason <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this not actionable?" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissOpen(false)} disabled={busy}>Cancel</Button>
            <Button disabled={busy || reason.trim().length < 3} onClick={dismiss}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
