"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateOrganizationAction, transferOwnershipAction, deleteOrganizationAction } from "@/lib/actions/organizations";
import type { Member } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyCombobox } from "@/components/stackceipt/currency-combobox";
import { timezoneForCurrency } from "@/lib/domain/currencies";
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

interface Org {
  slug: string;
  name: string;
  baseCurrency: string;
  timezone: string;
  renewalWindowDays: number;
}

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

export function GeneralSettingsForm({ orgSlug, org }: { orgSlug: string; org: Org }) {
  const router = useRouter();
  const [name, setName] = React.useState(org.name);
  const [slug, setSlug] = React.useState(org.slug);
  const [currency, setCurrency] = React.useState(org.baseCurrency);
  const timezone = timezoneForCurrency(currency); // follows the currency
  const [renewalWindowDays, setRenewalWindowDays] = React.useState(String(org.renewalWindowDays));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dirty =
    name !== org.name || slug !== org.slug || currency !== org.baseCurrency ||
    timezone !== org.timezone || Number(renewalWindowDays) !== org.renewalWindowDays;

  async function save() {
    setBusy(true);
    setError(null);
    const result = await updateOrganizationAction(orgSlug, {
      name,
      slug,
      baseCurrency: currency,
      timezone,
      renewalWindowDays: Number(renewalWindowDays),
    });
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label className="mb-1.5">Organization name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div>
        <Label className="mb-1.5">Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
        <p className="mt-1 text-xs text-muted-foreground">Changing this changes your workspace URL.</p>
      </div>
      <div>
        <Label className="mb-1.5">Base currency</Label>
        <CurrencyCombobox value={currency} onChange={setCurrency} />
        <p className="mt-1 text-xs text-muted-foreground">Single-currency workspace. Changing this re-labels amounts — it does not convert them.</p>
      </div>
      <div>
        <Label className="mb-1.5">Renewal window (days)</Label>
        <Input type="number" min={1} max={365} value={renewalWindowDays} onChange={(e) => setRenewalWindowDays(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label className="mb-1.5">Timezone</Label>
        <div className="flex h-9 items-center rounded-lg border border-transparent bg-secondary px-3 text-sm text-muted-foreground">
          {timezone}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Set automatically from your currency.</p>
      </div>
      {error ? <p className="sm:col-span-2 rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button onClick={save} disabled={busy || !dirty || name.trim().length < 2 || !slug}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
        </Button>
      </div>
    </div>
  );
}

export function TransferOwnershipControl({ orgSlug, members }: { orgSlug: string; members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const candidates = members.filter((m) => m.status === "ACTIVE" && m.role !== "OWNER");

  async function transfer() {
    setBusy(true);
    setError(null);
    const result = await transferOwnershipAction(orgSlug, target);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Ownership transferred");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTarget(""); setError(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={candidates.length === 0}>Transfer…</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>The chosen member becomes owner; you become an admin. There is always exactly one owner.</DialogDescription>
        </DialogHeader>
        <div>
          <Label className="mb-1.5">New owner</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
            <SelectContent>
              {candidates.map((m) => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          {error ? <p className="mt-3 rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={transfer} disabled={busy || !target}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteOrgControl({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteOrganizationAction(orgSlug, confirm);
    // On success the action redirects; only errors return here.
    setBusy(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirm(""); setError(null); } }}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete…</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete organization</DialogTitle>
          <DialogDescription>
            This permanently removes <span className="font-medium text-foreground">{orgName}</span> and all its data — subscriptions,
            requests, reviews, members, and history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label className="mb-1.5">Type <span className="font-medium text-foreground">{orgName}</span> to confirm</Label>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={orgName} />
          {error ? <p className="mt-3 rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={remove} disabled={busy || confirm.trim() !== orgName}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Delete organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
