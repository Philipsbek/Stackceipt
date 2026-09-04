import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardCheck,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/stackceipt/money";
import { SubscriptionStatusBadge } from "@/components/stackceipt/status-badge";
import { Wordmark } from "@/components/brand/wordmark";
import { DemoCtaButton } from "@/components/landing/demo-cta-button";
import { startDemoAction } from "@/lib/actions/auth";

const features = [
  { icon: LayoutGrid, title: "Subscription inventory", body: "One governed source of truth for every tool, its owner, seats, and true annualized cost." },
  { icon: CalendarClock, title: "Renewals & notice windows", body: "See what renews next and the exact date you must give notice — before you auto-renew by accident." },
  { icon: ClipboardCheck, title: "Requests & approvals", body: "A lightweight approval workflow with department scope, audit trail, and one-click conversion to a tracked subscription." },
  { icon: Sparkles, title: "Deterministic Janitor", body: "Rules — not AI — surface unowned tools, unused seats, duplicates, and missed notice deadlines with supportable savings." },
  { icon: UserMinus, title: "Offboarding", body: "When someone leaves, generate a checklist of every seat to reclaim so access and spend don't linger." },
  { icon: ShieldCheck, title: "Secure by default", body: "Multi-tenant isolation enforced in Postgres row-level security, with an append-only audit log." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Stackceipt home">
            <Wordmark height={40} />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-6">
            <Badge variant="soft" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-[#171717]" />
              Software subscription governance for SMBs
            </Badge>
            <h1 className="display-heading text-balance text-4xl sm:text-5xl">
              Know what your software stack is costing you.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Stackceipt is the calm, financially precise place to track every subscription,
              renewal, approval, and review — and cut the cost of tools you no longer need.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">
                  Start tracking your stack <ArrowRight className="size-4" />
                </Link>
              </Button>
              <form action={startDemoAction}>
                <DemoCtaButton />
              </form>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required. Set up your organization in minutes.
            </p>
          </div>

          {/* Real-component product preview */}
          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 max-w-2xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Everything, in one governed place</h2>
          <p className="text-sm text-muted-foreground">
            Purpose-built for the person who has to answer &ldquo;what are we paying for, and why?&rdquo;
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                <f.icon className="size-4.5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="flex flex-col items-start justify-between gap-4 p-8 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">See your real annual commitment</h2>
            <p className="text-sm text-muted-foreground">
              Add your subscriptions and Stackceipt does the annualized math and finds the waste.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/sign-up">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Wordmark height={34} />
          <p>Know what your software stack is costing you.</p>
          <p className="text-xs">© {new Date().getFullYear()} Stackceipt. Demo build.</p>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#e5e5e5]" />
          <span className="size-2.5 rounded-full bg-[#e5e5e5]" />
          <span className="size-2.5 rounded-full bg-[#e5e5e5]" />
        </div>
        <span className="text-xs text-muted-foreground">Northwind Labs · Dashboard</span>
        <BellRing className="size-3.5 text-muted-foreground" />
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly recurring</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              <Money minor={1_698_400} currency="USD" showCents={false} />
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Annual committed</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              <Money minor={20_380_800} currency="USD" showCents={false} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { v: "Adobe Creative Cloud", c: 599900, s: "ACTIVE" as const, u: "27% used" },
            { v: "GitHub Enterprise", c: 2100000, s: "ACTIVE" as const, u: "Renews in 17d" },
            { v: "Linear Business", c: 16800, s: "TRIAL" as const, u: "Trial" },
          ].map((r) => (
            <div key={r.v} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.v}</div>
                <div className="text-xs text-muted-foreground">{r.u}</div>
              </div>
              <div className="flex items-center gap-2">
                <SubscriptionStatusBadge status={r.s} />
                <span className="text-sm font-medium tabular-nums">
                  <Money minor={r.c} currency="USD" suffix="/yr" showCents={false} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
