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

export function RunJanitorButton() {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  return (
    <Button
      onClick={async () => {
        setRunning(true);
        await new Promise((r) => setTimeout(r, 700));
        setRunning(false);
        toast.success("Janitor scan complete (demo)", { description: "Findings are recomputed deterministically and de-duplicated by fingerprint." });
        router.refresh();
      }}
      disabled={running}
    >
      {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      Run Janitor
    </Button>
  );
}

export function FindingActions({ title }: { title: string }) {
  const router = useRouter();
  const [dismissOpen, setDismissOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  function resolve() {
    toast.success("Finding resolved (demo)", { description: `"${title}" marked resolved.` });
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Finding actions">
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
            <Button variant="ghost" onClick={() => setDismissOpen(false)}>Cancel</Button>
            <Button
              disabled={reason.trim().length < 3}
              onClick={() => {
                setDismissOpen(false);
                toast.success("Finding dismissed (demo)");
                router.refresh();
              }}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
