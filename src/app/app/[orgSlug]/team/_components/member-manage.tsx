"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { changeMemberRoleAction, setMemberSuspendedAction, removeMemberAction } from "@/lib/actions/team";
import { createOffboardingCaseAction } from "@/lib/actions/offboarding";
import { ORGANIZATION_ROLES, ROLE_LABELS, type OrganizationRole } from "@/lib/domain/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
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

interface Props {
  orgSlug: string;
  member: { id: string; fullName: string; role: OrganizationRole; status: string };
  canManage: boolean;
  canOffboard: boolean;
  hasOpenOffboarding: boolean;
}

export function MemberManage({ orgSlug, member, canManage, canOffboard, hasOpenOffboarding }: Props) {
  const router = useRouter();
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [role, setRole] = React.useState<OrganizationRole>(member.role);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [departureDate, setDepartureDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The owner isn't managed here — role, suspension, offboarding, and removal
  // don't apply. Ownership changes via Settings → Transfer ownership.
  const isOwner = member.role === "OWNER";

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await removeMemberAction(orgSlug, member.id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Member removed");
    setRemoveOpen(false);
    router.push(`/app/${orgSlug}/team`);
  }

  async function saveRole() {
    setBusy(true);
    setError(null);
    const result = await changeMemberRoleAction(orgSlug, member.id, role);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Role updated");
    setRoleOpen(false);
    router.refresh();
  }

  async function toggleSuspend() {
    const suspend = member.status === "ACTIVE";
    setBusy(true);
    const result = await setMemberSuspendedAction(orgSlug, member.id, suspend);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(suspend ? "Member suspended" : "Member reactivated");
    router.refresh();
  }

  async function startOffboarding() {
    setBusy(true);
    setError(null);
    const result = await createOffboardingCaseAction(orgSlug, { memberId: member.id, departureDate, notes });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Offboarding started");
    setOffboardOpen(false);
    if (result.id) router.push(`/app/${orgSlug}/offboarding/${result.id}`);
    else router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canManage && !isOwner ? (
        <Dialog open={roleOpen} onOpenChange={(v) => { setRoleOpen(v); if (!v) { setRole(member.role); setError(null); } }}>
          <DialogTrigger asChild>
            <Button variant="outline">Change role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change role</DialogTitle>
              <DialogDescription>Set {member.fullName}&apos;s role in this organization.</DialogDescription>
            </DialogHeader>
            <div>
              <Label className="mb-1.5">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrganizationRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRoleOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={saveRole} disabled={busy || role === member.role}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManage && !isOwner ? (
        <Button variant="outline" onClick={toggleSuspend} disabled={busy}>
          {member.status === "ACTIVE" ? "Suspend" : "Reactivate"}
        </Button>
      ) : null}

      {canOffboard && !hasOpenOffboarding && !isOwner ? (
        <Dialog open={offboardOpen} onOpenChange={(v) => { setOffboardOpen(v); if (!v) { setDepartureDate(""); setNotes(""); setError(null); } }}>
          <DialogTrigger asChild>
            <Button variant="outline">Start offboarding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start offboarding</DialogTitle>
              <DialogDescription>
                Open a case for {member.fullName}. Stackceipt seeds a task for each seat they hold plus an access-revocation step.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5">Departure date</Label>
                <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for the offboarding" />
              </div>
              {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOffboardOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={startOffboarding} disabled={busy || !departureDate}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManage && member.status !== "REMOVED" && !isOwner ? (
        <Dialog open={removeOpen} onOpenChange={(v) => { setRemoveOpen(v); if (!v) setError(null); }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-destructive hover:text-destructive">Remove</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove {member.fullName}?</DialogTitle>
              <DialogDescription>
                They lose access to this organization. Their history is preserved, and you can re-invite them later.
              </DialogDescription>
            </DialogHeader>
            {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRemoveOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="destructive" onClick={remove} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Remove member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
