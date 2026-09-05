"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDisplayNameAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountForm({ initialName, email, role }: { initialName: string; email: string; role: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [busy, setBusy] = React.useState(false);

  const dirty = name.trim() !== initialName.trim();

  async function save() {
    setBusy(true);
    const result = await updateDisplayNameAction(name);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Name updated");
    router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label className="mb-1.5">Display name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your name" />
        <p className="mt-1 text-xs text-muted-foreground">How you appear to your team across the workspace.</p>
      </div>
      <div>
        <Label className="mb-1.5">Email</Label>
        <div className="flex h-9 items-center rounded-lg border border-transparent bg-secondary px-3 text-sm text-muted-foreground">{email}</div>
      </div>
      <div>
        <Label className="mb-1.5">Role</Label>
        <div className="flex h-9 items-center rounded-lg border border-transparent bg-secondary px-3 text-sm text-muted-foreground">{role}</div>
      </div>
      <div className="sm:col-span-2">
        <Button onClick={save} loading={busy} disabled={!dirty || name.trim().length < 1}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
