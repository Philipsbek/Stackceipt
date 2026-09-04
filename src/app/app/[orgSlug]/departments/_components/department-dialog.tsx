"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { createDepartmentAction, updateDepartmentAction } from "@/lib/actions/departments";
import type { DepartmentRow } from "@/lib/data/collections";
import type { Member } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  members: Member[];
  department?: DepartmentRow;
}

export function DepartmentDialog({ orgSlug, members, department }: Props) {
  const isEdit = Boolean(department);
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(department?.name ?? "");
  const [description, setDescription] = React.useState(department?.description ?? "");
  const [manager, setManager] = React.useState(department?.managerMemberId ?? "none");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  function reset() {
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setManager(department?.managerMemberId ?? "none");
    setError(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const input = { name, description, managerMemberId: manager };
    const result = isEdit
      ? await updateDepartmentAction(orgSlug, department!.id, input)
      : await createDepartmentAction(orgSlug, input);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(isEdit ? "Department updated" : "Department created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${department!.name}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button><Plus className="size-4" /> New department</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name, description, or manager for this department."
              : "Group subscriptions and attribute spend to a team."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              maxLength={120}
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this team covers"
            />
          </div>
          <div>
            <Label className="mb-1.5">Manager <span className="text-muted-foreground">(optional)</span></Label>
            <Select value={manager} onValueChange={setManager}>
              <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {activeMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || name.trim().length === 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
