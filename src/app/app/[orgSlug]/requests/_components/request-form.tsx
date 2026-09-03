"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { requestInputSchema, toMinor, type RequestInput } from "@/lib/domain/validation";
import { annualizedMinor, formatMoney } from "@/lib/domain/money";
import { BILLING_CADENCES, BILLING_CADENCE_LABELS } from "@/lib/domain/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRequestAction } from "@/lib/actions/requests";

const NONE = "__none__";

export function RequestForm({
  base,
  orgSlug,
  baseCurrency,
  departments,
}: {
  base: string;
  orgSlug: string;
  baseCurrency: string;
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = React.useState({
    vendorName: "",
    productName: "",
    businessJustification: "",
    departmentId: NONE,
    requestedSeats: "",
    amountMajor: "",
    currency: baseCurrency,
    billingCadence: "MONTHLY",
    billingIntervalMonths: "",
    neededBy: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  const amountNum = parseFloat(f.amountMajor);
  const interval = f.billingIntervalMonths ? parseInt(f.billingIntervalMonths, 10) : null;
  const annual = !Number.isNaN(amountNum)
    ? annualizedMinor(toMinor(amountNum), f.billingCadence as RequestInput["billingCadence"], interval)
    : 0;

  async function submit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();
    const input: RequestInput = {
      vendorName: f.vendorName,
      productName: f.productName,
      businessJustification: f.businessJustification,
      departmentId: f.departmentId === NONE ? null : f.departmentId,
      requestedSeats: f.requestedSeats ? parseInt(f.requestedSeats, 10) : null,
      amountMajor: Number.isNaN(amountNum) ? NaN : amountNum,
      currency: f.currency,
      billingCadence: f.billingCadence as RequestInput["billingCadence"],
      billingIntervalMonths: interval,
      neededBy: f.neededBy || null,
    };
    const parsed = requestInputSchema.safeParse(input);
    if (!parsed.success && !asDraft) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    const result = await createRequestAction(orgSlug, input, asDraft);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(asDraft ? "Draft saved" : "Request submitted", {
      description: asDraft ? undefined : "The people who can approve it have been notified.",
    });
    router.push(result.id ? `${base}/requests/${result.id}` : `${base}/requests`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => submit(e, false)} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>What do you need?</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Vendor" error={errors.vendorName} required>
            <Input value={f.vendorName} onChange={(e) => set("vendorName", e.target.value)} placeholder="Sentry" />
          </Field>
          <Field label="Product" error={errors.productName} required>
            <Input value={f.productName} onChange={(e) => set("productName", e.target.value)} placeholder="Team" />
          </Field>
          <Field label="Department" error={errors.departmentId}>
            <Select value={f.departmentId} onValueChange={(v) => set("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Seats needed" error={errors.requestedSeats}>
            <Input inputMode="numeric" value={f.requestedSeats} onChange={(e) => set("requestedSeats", e.target.value)} placeholder="10" />
          </Field>
          <Field label="Business justification" error={errors.businessJustification} required className="sm:col-span-2">
            <Textarea value={f.businessJustification} onChange={(e) => set("businessJustification", e.target.value)} placeholder="Why does the team need this? What problem does it solve?" className="min-h-24" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expected cost</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Cadence" error={errors.billingCadence}>
              <Select value={f.billingCadence} onValueChange={(v) => set("billingCadence", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CADENCES.map((c) => <SelectItem key={c} value={c}>{BILLING_CADENCE_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Amount / charge" error={errors.amountMajor} required>
              <Input inputMode="decimal" value={f.amountMajor} onChange={(e) => set("amountMajor", e.target.value)} placeholder="80.00" />
            </Field>
            {f.billingCadence === "CUSTOM" ? (
              <Field label="Interval (months)" error={errors.billingIntervalMonths} required>
                <Input inputMode="numeric" value={f.billingIntervalMonths} onChange={(e) => set("billingIntervalMonths", e.target.value)} placeholder="6" />
              </Field>
            ) : null}
            <Field label="Needed by" error={errors.neededBy}>
              <Input type="date" value={f.neededBy} onChange={(e) => set("neededBy", e.target.value)} />
            </Field>
          </div>
          {!Number.isNaN(amountNum) && f.billingCadence !== "ONE_TIME" ? (
            <div className="rounded-md border border-border bg-secondary/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Annualized: </span>
              <span className="font-semibold tabular-nums">{formatMoney(annual, f.currency)}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={(e) => submit(e, true)} disabled={submitting}>Save draft</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit request
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, required, className, children }: { label: string; error?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1">{label}{required ? <span className="text-destructive">*</span> : null}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
