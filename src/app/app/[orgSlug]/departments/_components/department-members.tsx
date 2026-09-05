"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, Check, Plus, X } from "lucide-react";
import { addDepartmentMemberAction, removeDepartmentMemberAction } from "@/lib/actions/departments";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface DeptMember {
  id: string;
  name: string;
  email: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function DepartmentMembers({
  orgSlug,
  departmentId,
  members,
  roster,
  canManage,
}: {
  orgSlug: string;
  departmentId: string;
  members: DeptMember[];
  roster: DeptMember[];
  canManage: boolean;
}) {
  const MAX_SHOWN = 6;
  const shown = members.slice(0, MAX_SHOWN);
  const overflow = members.length - shown.length;

  return (
    <div className="flex items-center justify-between gap-2">
      {members.length === 0 ? (
        <span className="text-xs text-muted-foreground">No members yet</span>
      ) : (
        <TooltipProvider delayDuration={100}>
          <div className="flex items-center -space-x-2">
            {shown.map((m) => (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <span className="rounded-full ring-2 ring-card">
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="font-medium">{m.name}</div>
                  {m.email ? <div className="text-xs opacity-80">{m.email}</div> : null}
                </TooltipContent>
              </Tooltip>
            ))}
            {overflow > 0 ? (
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-muted-foreground ring-2 ring-card">
                +{overflow}
              </span>
            ) : null}
          </div>
        </TooltipProvider>
      )}

      {canManage ? (
        <ManageMembersDialog orgSlug={orgSlug} departmentId={departmentId} members={members} roster={roster} />
      ) : null}
    </div>
  );
}

function ManageMembersDialog({
  orgSlug,
  departmentId,
  members,
  roster,
}: {
  orgSlug: string;
  departmentId: string;
  members: DeptMember[];
  roster: DeptMember[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const inDept = React.useMemo(() => new Set(members.map((m) => m.id)), [members]);

  async function toggle(member: DeptMember, isIn: boolean) {
    setPendingId(member.id);
    const result = isIn
      ? await removeDepartmentMemberAction(orgSlug, departmentId, member.id)
      : await addDepartmentMemberAction(orgSlug, departmentId, member.id);
    setPendingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(isIn ? `Removed ${member.name}` : `Added ${member.name}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
          <UserPlus className="size-4" /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Department members</DialogTitle>
          <DialogDescription>Add or remove people from this department.</DialogDescription>
        </DialogHeader>
        {roster.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active members in this organization yet.</p>
        ) : (
          <ul className="-mx-2 max-h-[min(60vh,420px)] divide-y divide-border overflow-y-auto">
            {roster.map((m) => {
              const isIn = inDept.has(m.id);
              const busy = pendingId === m.id;
              return (
                <li key={m.id} className="flex items-center gap-3 px-2 py-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    {m.email ? <div className="truncate text-xs text-muted-foreground">{m.email}</div> : null}
                  </div>
                  <Button
                    variant={isIn ? "outline" : "default"}
                    size="sm"
                    className="shrink-0"
                    disabled={busy}
                    onClick={() => toggle(m, isIn)}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isIn ? (
                      <>
                        <X className="size-4" /> Remove
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" /> Add
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {members.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5" /> {members.length} in this department
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
