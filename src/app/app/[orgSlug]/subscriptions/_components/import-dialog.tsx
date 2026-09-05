"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, Upload } from "lucide-react";
import { importSubscriptionsAction, type ImportResult } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ImportDialog({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [csv, setCsv] = React.useState("");
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setCsv(await file.text());
  }

  async function run() {
    if (!csv.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await importSubscriptionsAction(orgSlug, csv);
    setBusy(false);
    if (res.error && !res.imported) {
      setResult(res);
      return;
    }
    setResult(res);
    toast.success(`Imported ${res.imported ?? 0} subscription${res.imported === 1 ? "" : "s"}`);
    router.refresh();
  }

  function reset() {
    setCsv("");
    setFileName("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><FileUp className="size-4" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import subscriptions from CSV</DialogTitle>
          <DialogDescription>
            Include a header row. Recognized columns: <span className="font-medium text-foreground">vendor, product, category, amount, cadence, renewal, seats</span>.
            Amounts use your workspace currency; cadence is MONTHLY, QUARTERLY, or ANNUAL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="size-4" /> {fileName || "Choose a CSV file"}
          </Button>

          {result ? (
            <div className="rounded-md border border-border bg-surface-alt p-3 text-sm">
              {result.error && !result.imported ? (
                <p className="text-destructive">{result.error}</p>
              ) : (
                <p className="font-medium">Imported {result.imported ?? 0}{result.skipped ? `, skipped ${result.skipped}` : ""}.</p>
              )}
              {result.errors && result.errors.length > 0 ? (
                <ul className="mt-1.5 max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs text-muted-foreground">
                  {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 8 ? <li>…and {result.errors.length - 8} more</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {result?.imported ? (
            <Button onClick={() => { setOpen(false); reset(); }}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={run} disabled={busy || !csv.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
