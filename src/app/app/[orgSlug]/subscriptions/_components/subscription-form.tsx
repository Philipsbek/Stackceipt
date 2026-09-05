"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  subscriptionInputSchema,
  toMinor,
  type SubscriptionInput,
} from "@/lib/domain/validation";
import { annualizedMinor, monthlyMinor, formatMoney } from "@/lib/domain/money";
import { createSubscriptionAction, updateSubscriptionAction } from "@/lib/actions/subscriptions";
import {
  BILLING_CADENCES,
  BILLING_CADENCE_LABELS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/domain/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductCombobox } from "@/components/stackceipt/product-combobox";

type FormState = {
  vendorName: string;
  productName: string;
  description: string;
  category: string;
  websiteUrl: string;
  status: string;
  departmentId: string;
  ownerMemberId: string;
  billingCadence: string;
  billingIntervalMonths: string;
  amountMajor: string;
  currency: string;
  startDate: string;
  nextRenewalDate: string;
  endDate: string;
  autoRenews: boolean;
  noticePeriodDays: string;
  seatsPurchased: string;
  seatsUsed: string;
  contractReference: string;
  notes: string;
};

interface Props {
  base: string;
  orgSlug: string;
  subscriptionId?: string;
  baseCurrency: string;
  departments: { id: string; name: string }[];
  members: { id: string; name: string }[];
  initial?: Partial<FormState>;
  mode: "create" | "edit";
}

const NONE = "__none__";

export function SubscriptionForm({ base, orgSlug, subscriptionId, baseCurrency, departments, members, initial, mode }: Props) {
  const router = useRouter();
  const [state, setState] = React.useState<FormState>({
    vendorName: "",
    productName: "",
    description: "",
    category: "",
    websiteUrl: "",
    status: "ACTIVE",
    departmentId: NONE,
    ownerMemberId: NONE,
    billingCadence: "MONTHLY",
    billingIntervalMonths: "",
    amountMajor: "",
    currency: baseCurrency,
    startDate: "",
    nextRenewalDate: "",
    endDate: "",
    autoRenews: true,
    noticePeriodDays: "30",
    seatsPurchased: "",
    seatsUsed: "",
    contractReference: "",
    notes: "",
    ...initial,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const amountNum = parseFloat(state.amountMajor);
  const intervalNum = state.billingIntervalMonths ? parseInt(state.billingIntervalMonths, 10) : null;
  const previewValid = !Number.isNaN(amountNum) && amountNum >= 0;
  const minor = previewValid ? toMinor(amountNum) : 0;
  const cadence = state.billingCadence as SubscriptionInput["billingCadence"];
  const previewMonthly = monthlyMinor(minor, cadence, intervalNum);
  const previewAnnual = annualizedMinor(minor, cadence, intervalNum);

  function buildInput(): SubscriptionInput {
    return {
      vendorName: state.vendorName,
      productName: state.productName,
      description: state.description || null,
      category: state.category || null,
      websiteUrl: state.websiteUrl || null,
      status: state.status as SubscriptionInput["status"],
      departmentId: state.departmentId === NONE ? null : state.departmentId,
      ownerMemberId: state.ownerMemberId === NONE ? null : state.ownerMemberId,
      billingCadence: cadence,
      billingIntervalMonths: intervalNum,
      amountMajor: Number.isNaN(amountNum) ? NaN : amountNum,
      currency: state.currency,
      startDate: state.startDate || null,
      nextRenewalDate: state.nextRenewalDate || null,
      endDate: state.endDate || null,
      autoRenews: state.autoRenews,
      noticePeriodDays: state.noticePeriodDays ? parseInt(state.noticePeriodDays, 10) : 0,
      seatsPurchased: state.seatsPurchased ? parseInt(state.seatsPurchased, 10) : null,
      seatsUsed: state.seatsUsed ? parseInt(state.seatsUsed, 10) : null,
      contractReference: state.contractReference || null,
      notes: state.notes || null,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = subscriptionInputSchema.safeParse(buildInput());
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    if (parsed.data.currency !== baseCurrency) {
      setErrors({ currency: `Must match the organization currency (${baseCurrency})` });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const result =
      mode === "create"
        ? await createSubscriptionAction(orgSlug, parsed.data)
        : await updateSubscriptionAction(orgSlug, subscriptionId!, parsed.data);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "Subscription added" : "Changes saved");
    router.push(result.id ? `${base}/subscriptions/${result.id}` : `${base}/subscriptions`);
    router.refresh();
  }

  const showInterval = state.billingCadence === "CUSTOM";
  const showRenewal = state.billingCadence !== "ONE_TIME";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Product" error={errors.productName} required>
            <ProductCombobox
              value={state.productName}
              onSelect={(product) => {
                setState((current) => ({
                  ...current,
                  productName: product.name,
                  vendorName: product.vendor,
                  category: product.category,
                  websiteUrl: product.website,
                }));
                setErrors((current) => ({ ...current, productName: "", vendorName: "" }));
              }}
              onCustom={(name) => {
                // Vendor is derived from the product; for a custom product default it to the name.
                setState((current) => ({ ...current, productName: name, vendorName: name }));
                setErrors((current) => ({ ...current, productName: "", vendorName: "" }));
              }}
            />
          </Field>
          <Field label="Vendor" error={errors.vendorName}>
            <div className="flex h-9 items-center rounded-lg border border-transparent bg-secondary px-3 text-sm text-muted-foreground">
              {state.vendorName || "Set from the product"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Set automatically from the product.</p>
          </Field>
          <Field label="Category" error={errors.category}>
            <Input value={state.category} onChange={(e) => set("category", e.target.value)} placeholder="Design" />
          </Field>
          <Field label="Website" error={errors.websiteUrl}>
            <Input value={state.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://figma.com" />
          </Field>
          <Field label="Description" error={errors.description} className="sm:col-span-2">
            <Textarea value={state.description} onChange={(e) => set("description", e.target.value)} placeholder="What is this tool used for?" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ownership & status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Status" error={errors.status}>
            <Select value={state.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{SUBSCRIPTION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Department" error={errors.departmentId}>
            <Select value={state.departmentId} onValueChange={(v) => set("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Accountable owner" error={errors.ownerMemberId}>
            <Select value={state.ownerMemberId} onValueChange={(v) => set("ownerMemberId", v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Billing cadence" error={errors.billingCadence}>
              <Select value={state.billingCadence} onValueChange={(v) => set("billingCadence", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_CADENCES.map((c) => <SelectItem key={c} value={c}>{BILLING_CADENCE_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Amount per ${BILLING_CADENCE_LABELS[cadence].toLowerCase()} charge`} error={errors.amountMajor} required>
              <Input inputMode="decimal" value={state.amountMajor} onChange={(e) => set("amountMajor", e.target.value)} placeholder="45.00" />
            </Field>
            <Field label="Currency" error={errors.currency}>
              <Input value={state.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} maxLength={3} />
            </Field>
          </div>
          {showInterval ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Interval (months)" error={errors.billingIntervalMonths} required>
                <Input inputMode="numeric" value={state.billingIntervalMonths} onChange={(e) => set("billingIntervalMonths", e.target.value)} placeholder="6" />
              </Field>
            </div>
          ) : null}

          {/* Derived cost preview */}
          {previewValid && state.billingCadence !== "ONE_TIME" ? (
            <div className="flex flex-wrap gap-6 rounded-md border border-border bg-secondary/60 px-4 py-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Monthly recurring</div>
                <div className="font-semibold tabular-nums">{formatMoney(previewMonthly, state.currency || baseCurrency)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Annual committed</div>
                <div className="font-semibold tabular-nums">{formatMoney(previewAnnual, state.currency || baseCurrency)}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showRenewal ? (
        <Card>
          <CardHeader><CardTitle>Renewal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Start date" error={errors.startDate}>
                <Input type="date" value={state.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Next renewal" error={errors.nextRenewalDate}>
                <Input type="date" value={state.nextRenewalDate} onChange={(e) => set("nextRenewalDate", e.target.value)} />
              </Field>
              <Field label="End date" error={errors.endDate}>
                <Input type="date" value={state.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
              <Field label="Notice period (days)" error={errors.noticePeriodDays}>
                <Input inputMode="numeric" value={state.noticePeriodDays} onChange={(e) => set("noticePeriodDays", e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={state.autoRenews} onCheckedChange={(v) => set("autoRenews", v)} />
              Automatically renews
            </label>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Seats & notes</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Seats purchased" error={errors.seatsPurchased}>
            <Input inputMode="numeric" value={state.seatsPurchased} onChange={(e) => set("seatsPurchased", e.target.value)} placeholder="10" />
          </Field>
          <Field label="Seats used" error={errors.seatsUsed}>
            <Input inputMode="numeric" value={state.seatsUsed} onChange={(e) => set("seatsUsed", e.target.value)} placeholder="8" />
          </Field>
          <Field label="Contract reference" error={errors.contractReference}>
            <Input value={state.contractReference} onChange={(e) => set("contractReference", e.target.value)} placeholder="MSA-2026-114" />
          </Field>
          <Field label="Notes" error={errors.notes} className="sm:col-span-2">
            <Textarea value={state.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href={`${base}/subscriptions`}>Cancel</Link>
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === "create" ? "Add subscription" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1">
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
