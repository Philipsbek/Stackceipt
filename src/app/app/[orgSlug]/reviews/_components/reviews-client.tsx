"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { scheduleReviewAction, completeReviewAction } from "@/lib/actions/reviews";
import { REVIEW_DECISIONS, REVIEW_DECISION_LABELS, type ReviewDecision } from "@/lib/domain/enums";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Option = { id: string; label: string };

export function ScheduleReviewDialog({
  orgSlug,
  subscriptions,
  members,
}: {
  orgSlug: string;
  subscriptions: Option[];
  members: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [subscriptionId, setSubscriptionId] = React.useState("");
  const [scheduledFor, setScheduledFor] = React.useState("");
  const [assignee, setAssignee] = React.useState("none");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setSubscriptionId("");
    setScheduledFor("");
    setAssignee("none");
    setError(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await scheduleReviewAction(orgSlug, { subscriptionId, scheduledFor, assignedToMemberId: assignee });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Review scheduled");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><CalendarPlus className="size-4" /> Schedule review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a review</DialogTitle>
          <DialogDescription>Book a check on whether a subscription still earns its cost.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Subscription</Label>
            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger><SelectValue placeholder="Choose a subscription" /></SelectTrigger>
              <SelectContent>
                {subscriptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Scheduled for</Label>
            <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Assignee <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !subscriptionId || !scheduledFor}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteReviewButton({ orgSlug, reviewId, label }: { orgSlug: string; reviewId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [decision, setDecision] = React.useState<ReviewDecision | "">("");
  const [summary, setSummary] = React.useState("");
  const [seats, setSeats] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!decision) { setError("Choose a decision."); return; }
    setBusy(true);
    setError(null);
    const recommendedSeats = seats.trim() === "" ? null : Number(seats);
    const result = await completeReviewAction(orgSlug, reviewId, { decision, summary, recommendedSeats });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Review completed");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Complete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete review</DialogTitle>
          <DialogDescription>Record the outcome for {label}. This never changes the subscription on its own.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as ReviewDecision)}>
              <SelectTrigger><SelectValue placeholder="Choose a decision" /></SelectTrigger>
              <SelectContent>
                {REVIEW_DECISIONS.map((d) => <SelectItem key={d} value={d}>{REVIEW_DECISION_LABELS[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What did you find, and why this decision?" />
          </div>
          <div>
            <Label className="mb-1.5">Recommended seats <span className="text-muted-foreground">(optional)</span></Label>
            <Input type="number" min={0} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="e.g. 10" />
          </div>
          {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !decision || summary.trim().length < 3}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Complete review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
