"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { addTaskAction } from "@/lib/actions/offboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddTaskForm({ orgSlug, caseId }: { orgSlug: string; caseId: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    const result = await addTaskAction(orgSlug, caseId, title);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setTitle("");
    toast.success("Task added");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-5 py-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" maxLength={200} className="h-9" />
      <Button type="submit" size="sm" disabled={busy || title.trim().length < 2}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
      </Button>
    </form>
  );
}
