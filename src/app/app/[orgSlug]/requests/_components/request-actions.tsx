"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Check, Loader2, Pencil, RotateCcw, Send, X } from "lucide-react";
import {
  cancelRequestAction,
  convertRequestAction,
  decideRequestAction,
  submitRequestAction,
} from "@/lib/actions/requests";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  orgSlug: string;
  base: string;
  requestId: string;
  canDecide: boolean;
  canCancel: boolean;
  canConvert: boolean;
  isAuthor: boolean;
  status: string;
}

export function RequestActions({ orgSlug, base, requestId, canDecide, canCancel, canConvert, isAuthor, status }: Props) {
  const router = useRouter();
  const [denyOpen, setDenyOpen] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [denyNote, setDenyNote] = React.useState("");
  const [approveNote, setApproveNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<{ error?: string; ok?: boolean }>, success: string) {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  if (status === "SUBMITTED") {
    return (
      <div className="flex flex-wrap gap-2">
        {canDecide ? (
          <>
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
              <DialogTrigger asChild>
                <Button disabled={busy}><Check className="size-4" /> Approve</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve this request</DialogTitle>
                  <DialogDescription>An optional note is shared with the requester and recorded in the audit log.</DialogDescription>
                </DialogHeader>
                <div>
                  <Label className="mb-1.5">Note (optional)</Label>
                  <Textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Approved — go ahead." />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      const ok = await run(() => decideRequestAction(orgSlug, requestId, "APPROVED", approveNote), "Request approved");
                      if (ok) setApproveOpen(false);
                    }}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Approve request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={busy}><X className="size-4" /> Deny</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deny this request</DialogTitle>
                  <DialogDescription>A reason is required and shared with the requester.</DialogDescription>
                </DialogHeader>
                <div>
                  <Label className="mb-1.5">Reason <span className="text-destructive">*</span></Label>
                  <Textarea value={denyNote} onChange={(e) => setDenyNote(e.target.value)} placeholder="Why is this being denied?" />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDenyOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    disabled={busy || denyNote.trim().length < 3}
                    onClick={async () => {
                      const ok = await run(() => decideRequestAction(orgSlug, requestId, "DENIED", denyNote), "Request denied");
                      if (ok) setDenyOpen(false);
                    }}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Deny request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
        {canCancel ? (
          <Button variant="ghost" disabled={busy} onClick={() => run(() => cancelRequestAction(orgSlug, requestId), "Request cancelled")}>
            <RotateCcw className="size-4" /> Cancel request
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === "DRAFT") {
    return (
      <div className="flex flex-wrap gap-2">
        {isAuthor ? (
          <>
            <Button disabled={busy} onClick={() => run(() => submitRequestAction(orgSlug, requestId), "Request submitted")}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit request
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/requests/${requestId}/edit`}><Pencil className="size-4" /> Edit draft</Link>
            </Button>
          </>
        ) : null}
        {canCancel ? (
          <Button variant="ghost" disabled={busy} onClick={() => run(() => cancelRequestAction(orgSlug, requestId), "Draft discarded")}>
            <RotateCcw className="size-4" /> Discard draft
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === "APPROVED" && canConvert) {
    return (
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          // On success this redirects server-side to the new subscription's edit page.
          const result = await convertRequestAction(orgSlug, requestId);
          setBusy(false);
          if (result?.error) toast.error(result.error);
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />} Convert to subscription
      </Button>
    );
  }

  return null;
}
