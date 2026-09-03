"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { createOrganizationAction } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
const TIMEZONES = ["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore"];

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function OnboardingForm() {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("America/New_York");
  const [renewalWindow, setRenewalWindow] = React.useState("90");
  const [loading, setLoading] = React.useState(false);

  const effectiveSlug = slugEdited ? slug : slugify(name);
  const valid = name.trim().length > 1 && effectiveSlug.length > 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    const result = await createOrganizationAction({
      name,
      slug: effectiveSlug,
      baseCurrency: currency,
      timezone,
      renewalWindowDays: parseInt(renewalWindow, 10) || 90,
    });
    setLoading(false);
    // On success the action redirects; only errors return here.
    if (result?.error) toast.error(result.error);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Create your organization</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5">Organization name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Labs" autoFocus />
          </div>
          <div>
            <Label className="mb-1.5">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">stackceipt.app/</span>
              <Input value={effectiveSlug} onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} placeholder="northwind" />
            </div>
            {effectiveSlug ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3" /> Your workspace URL. We&apos;ll tell you if it&apos;s taken.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5">Renewal window (days)</Label>
            <Input type="number" value={renewalWindow} onChange={(e) => setRenewalWindow(e.target.value)} className="w-32" />
            <p className="mt-1 text-xs text-muted-foreground">How far ahead to surface upcoming renewals. Common values: 30, 60, 90.</p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={!valid || loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Create organization
      </Button>
    </form>
  );
}
