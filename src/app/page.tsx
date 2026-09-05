import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  Calculator,
  CalendarClock,
  Check,
  Clock3,
  ClipboardCheck,
  FileUp,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/stackceipt/money";
import { SubscriptionStatusBadge } from "@/components/stackceipt/status-badge";
import { Wordmark } from "@/components/brand/wordmark";
import { DemoCtaButton } from "@/components/landing/demo-cta-button";
import { MotionReveal } from "@/components/landing/motion-reveal";
import { LandingScrollEffects } from "@/components/landing/scroll-effects";
import { ContextVault } from "@/components/landing/context-vault";
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
      <LandingScrollEffects />
      {/* Header (transparent over the mint hero, solid on scroll) */}
      <header data-landing-header className="landing-header-enter sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Stackceipt home">
            <Wordmark height={40} className="landing-logo" />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="landing-nav-light">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="landing-nav-cta">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero — full-bleed dark band pulled up behind the transparent nav.
          The extra pixel of pull-up hides any sub-pixel sliver of the page
          background at the very top edge. */}
      <section className="landing-hero-bg relative -mt-[calc(3.5rem+1px)] overflow-hidden">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div className="space-y-7">
              <MotionReveal delay={50}>
                <p className="flex items-center gap-2 text-sm font-medium text-white/55">
                  <span className="size-1.5 rounded-full bg-white/45" />
                  Software subscription governance for SMBs
                </p>
              </MotionReveal>
              <MotionReveal delay={120}>
                <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Know what your software stack is costing you.
                </h1>
              </MotionReveal>
              <MotionReveal delay={190}>
                <p className="max-w-xl text-base text-white/65 sm:text-lg">
                  One calm, financially precise place to track every subscription, renewal,
                  approval, and review — and cut the cost of tools you no longer need.
                </p>
              </MotionReveal>
              <MotionReveal delay={260}>
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="group h-12 px-7 text-[15px] !bg-white !text-[#0a0a0a] hover:!bg-white/90">
                    <Link href="/auth/sign-up">
                      Start tracking your stack
                      <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 group-active:translate-x-0 motion-reduce:transition-none" />
                    </Link>
                  </Button>
                  <form action={startDemoAction}>
                    <DemoCtaButton />
                  </form>
                </div>
              </MotionReveal>
              <MotionReveal delay={330}>
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-medium text-white">Built for finance &amp; ops teams</p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
                      <Sparkles className="size-3.5" /> Deterministic — no AI guesswork
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/80">
                      <ShieldCheck className="size-3.5" /> Row-level security &amp; audit log
                    </span>
                  </div>
                  <p className="text-xs text-white/45">No credit card required. Set up your organization in minutes.</p>
                </div>
              </MotionReveal>
            </div>

            {/* Product interface collage */}
            <MotionReveal delay={180} className="landing-preview-shell">
              <div data-scroll-parallax="-0.018" className="landing-scroll-parallax">
                <HeroCollage />
              </div>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <MotionReveal className="mb-8 max-w-2xl">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Everything, in one governed place</h2>
            <p className="text-sm text-muted-foreground">
              Purpose-built for the person who has to answer &ldquo;what are we paying for, and why?&rdquo;
            </p>
          </div>
        </MotionReveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, index) => (
            <MotionReveal key={f.title} delay={(index % 3) * 80} className="h-full">
              <Card className="landing-feature-card group h-full p-5">
                <div className="landing-feature-icon flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <f.icon className="size-4.5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            </MotionReveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <MotionReveal>
          <Card className="overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="soft">Simple from day one</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                From scattered spend to clear action.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Three simple steps give you a precise view of every software dollar—and enough
                time to act before the next renewal.
              </p>
            </div>

            <div className="relative mt-10">
              <div className="landing-roadmap-line absolute left-[16.66%] right-[16.66%] top-8 hidden h-px bg-border md:block" />
              <ol className="grid gap-5 md:grid-cols-3">
                {[
                  {
                    icon: FileUp,
                    title: "Add your stack",
                    body: "Enter subscriptions manually or import a CSV. No complicated setup.",
                    visual: (
                      <div className="space-y-2">
                        <div className="h-2 w-2/3 rounded-full bg-[#d4d4d4]" />
                        <div className="h-2 w-full rounded-full bg-[#e5e5e5]" />
                        <div className="flex items-center gap-2 pt-1 text-xs font-medium">
                          <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">+</span>
                          Subscription added
                        </div>
                      </div>
                    ),
                  },
                  {
                    icon: Calculator,
                    title: "See the real cost",
                    body: "Monthly, quarterly, and annual plans become one dependable number.",
                    visual: (
                      <div>
                        <p className="text-xs text-muted-foreground">Annual committed</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">$203,808</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e5e5e5]">
                          <div className="h-full w-3/4 rounded-full bg-foreground" />
                        </div>
                      </div>
                    ),
                  },
                  {
                    icon: BadgeDollarSign,
                    title: "Act before renewal",
                    body: "Review upcoming renewals and reclaim waste while you still have time.",
                    visual: (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Savings found</p>
                          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">$24,360</p>
                        </div>
                        <span className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium">Review</span>
                      </div>
                    ),
                  },
                ].map((step, index) => (
                  <li key={step.title} className="landing-roadmap-step group relative">
                    <div className="relative z-10 mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-[0_0_0_8px_#fff]">
                      <step.icon className="size-5 text-foreground" />
                    </div>
                    <div className="mt-6 text-center">
                      <span className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">Step {index + 1}</span>
                      <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                      <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">{step.body}</p>
                    </div>
                    <div className="mt-5 min-h-[104px] rounded-lg border border-border bg-background p-4 text-left">
                      {step.visual}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-lg bg-[#0a0a0a] px-5 py-4 text-[#fafafa] sm:flex-row">
              <p className="text-sm font-medium">One source of truth. One clear annual number. No guesswork.</p>
              <Button asChild variant="secondary" size="sm" className="group shrink-0">
                <Link href="/auth/sign-up">
                  Build your inventory
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Card>
        </MotionReveal>
      </section>

      {/* Subscription context */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <MotionReveal><ContextVault /></MotionReveal>
      </section>

      {/* Renewal visibility */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <MotionReveal>
            <div className="max-w-lg">
              <Badge variant="outline">Renewal control</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Catch the renewal before it catches you.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Stackceipt separates the renewal date from the date that actually matters: your
                cancellation notice deadline. You see the window early enough to decide.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Notice deadlines calculated clearly", "Upcoming commitments prioritized", "Owners know when action is required"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-secondary">
                      <Check className="size-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </MotionReveal>
          <MotionReveal delay={120}>
            <RenewalIllustration />
          </MotionReveal>
        </div>
      </section>

      {/* Approval clarity */}
      <section className="border-y border-border bg-surface-alt">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <MotionReveal delay={100} className="order-2 lg:order-1">
            <ApprovalIllustration />
          </MotionReveal>
          <MotionReveal className="order-1 lg:order-2">
            <div className="max-w-lg lg:ml-auto">
              <Badge variant="outline">Built-in accountability</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Every tool has a reason, an owner, and a decision.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Requests move through a clear approval path. Owners and admins stay in control,
                while every decision remains visible in the audit trail.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Owner-controlled', 'No self-approval', 'Audit-ready'].map((label) => (
                  <Badge key={label} variant="soft">{label}</Badge>
                ))}
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6">
        <MotionReveal>
          <Card className="landing-cta-card flex flex-col items-start justify-between gap-4 p-8 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">See your real annual commitment</h2>
              <p className="text-sm text-muted-foreground">
                Add your subscriptions and Stackceipt does the annualized math and finds the waste.
              </p>
            </div>
            <Button asChild size="lg" className="group">
              <Link href="/auth/sign-up">
                Get started <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
          </Card>
        </MotionReveal>
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

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Fine graph-paper grid, strongest top-right (behind the collage), fading
          out toward the headline for legibility. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(125% 125% at 82% 12%, #000 0%, rgba(0,0,0,0.35) 48%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(125% 125% at 82% 12%, #000 0%, rgba(0,0,0,0.35) 48%, transparent 82%)",
        }}
      />
      {/* Concentric rings behind the collage */}
      <svg className="absolute -right-28 -top-28 h-[660px] w-[660px] opacity-[0.06]" viewBox="0 0 660 660" fill="none" stroke="white" strokeWidth="1.25">
        <circle cx="330" cy="330" r="110" />
        <circle cx="330" cy="330" r="190" />
        <circle cx="330" cy="330" r="270" />
        <circle cx="330" cy="330" r="350" />
      </svg>
      {/* Oversized Stackceipt "stacked layers" mark, bottom-left, very faint */}
      <svg className="absolute -bottom-20 -left-16 hidden h-[360px] w-[360px] opacity-[0.05] lg:block" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M50 12 L86 30 L50 48 L14 30 Z" />
        <path d="M14 50 L50 68 L86 50" />
        <path d="M14 70 L50 88 L86 70" />
      </svg>
      {/* Soft top vignette so the nav stays clean */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/25 to-transparent" />
    </div>
  );
}

function HeroCollage() {
  // The overlapping composition is laid out at a fixed design size and scaled
  // down proportionally on smaller screens (via container-query units), so it
  // looks identical on desktop, tablet, and mobile — nothing reflows or moves.
  return (
    <div className="hero-collage-frame">
      <div className="hero-collage-inner">
        {/* Base: dashboard */}
        <ProductPreview className="hero-float absolute left-[5%] top-9 z-10 w-[74%]" />

        {/* Janitor savings — top right */}
        <SavingsCard className="hero-float absolute right-0 top-0 z-30 w-[52%] rotate-[1.4deg]" />

        {/* Renewal notice — bottom left */}
        <RenewalCard className="hero-float absolute bottom-0 left-0 z-20 w-[54%] -rotate-[1.4deg]" />

        {/* Spend trend — bottom right */}
        <SpendTrendCard className="hero-float absolute bottom-7 right-1 z-40 w-[50%]" />
      </div>
    </div>
  );
}

function SavingsCard({ className }: { className?: string }) {
  const items = [
    { t: "Unused seats · Figma", s: "HIGH" as const, v: 144000 },
    { t: "Duplicate tool · Notion", s: "MEDIUM" as const, v: 96000 },
    { t: "Trial ending · Linear", s: "LOW" as const, v: 0 },
  ];
  const dot: Record<string, string> = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#0891b2" };
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4" /> Janitor findings
        </div>
        <Badge variant="soft">4 open</Badge>
      </div>
      <div className="space-y-2.5 p-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Supportable savings</div>
          <div className="text-xl font-semibold tabular-nums"><Money minor={240000} currency="USD" suffix="/yr" showCents={false} /></div>
        </div>
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.t} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot[i.s] }} />
                <span className="truncate">{i.t}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                {i.v ? <Money minor={i.v} currency="USD" showCents={false} /> : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RenewalCard({ className }: { className?: string }) {
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4" /> Upcoming renewal
        </div>
        <Badge variant="warning">Notice in 17d</Badge>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">GitHub Enterprise</div>
            <div className="text-xs text-muted-foreground">Engineering · Renews Sep 20</div>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums"><Money minor={2100000} currency="USD" suffix="/yr" showCents={false} /></span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-alt px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" /> Give notice by Sep 3 to avoid auto-renew
        </div>
      </div>
    </Card>
  );
}

function SpendTrendCard({ className }: { className?: string }) {
  const bars = [42, 55, 48, 63, 58, 71, 66, 78];
  const max = Math.max(...bars);
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Monthly recurring</div>
          <div className="text-xl font-semibold tabular-nums"><Money minor={1_698_400} currency="USD" showCents={false} /></div>
        </div>
        <Badge variant="soft" className="gap-1">
          <BadgeDollarSign className="size-3.5" /> +6%
        </Badge>
      </div>
      <div className="flex h-16 items-end gap-1.5 px-4 pb-4 pt-3">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 rounded-t bg-[#171717]" style={{ height: `${(b / max) * 100}%`, opacity: 0.35 + (i / bars.length) * 0.65 }} />
        ))}
      </div>
    </Card>
  );
}

function ProductPreview({ className }: { className?: string }) {
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ""}`}>
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
            <div key={r.v} className="landing-preview-row flex items-center justify-between rounded-md border border-border px-3 py-2">
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

function RenewalIllustration() {
  return (
    <Card className="landing-illustration overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4" /> Renewal timeline
        </div>
        <Badge variant="soft">Next 60 days</Badge>
      </div>
      <div className="p-5 sm:p-7">
        <div className="relative ml-3 space-y-7 border-l border-border pl-7">
          {[
            { day: "Today", title: "Review usage", detail: "12 of 40 seats active", active: false },
            { day: "17 days", title: "Notice deadline", detail: "Decision required", active: true },
            { day: "47 days", title: "Contract renews", detail: "$21,000 annual commitment", active: false },
          ].map((event) => (
            <div key={event.title} className="landing-timeline-item relative">
              <span className={`absolute -left-[35px] top-1 size-3 rounded-full border-2 border-card ${event.active ? "bg-foreground" : "bg-[#d4d4d4]"}`} />
              <p className="text-xs font-medium text-muted-foreground">{event.day}</p>
              <div className={`mt-1 rounded-lg border p-3 ${event.active ? "border-foreground bg-background" : "border-border"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{event.title}</p>
                  {event.active && <Clock3 className="size-4" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ApprovalIllustration() {
  return (
    <Card className="landing-illustration overflow-hidden p-5 sm:p-7">
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">New request</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Figma Professional</p>
            <p className="mt-1 text-sm text-muted-foreground">Design · 8 seats · $1,440/year</p>
          </div>
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>

      <div className="mx-auto h-6 w-px bg-border" />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-secondary">
            <UserRoundCheck className="size-4" />
          </div>
          <p className="mt-2 text-sm font-semibold">Admin review</p>
          <p className="text-xs text-muted-foreground">Checks need & cost</p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
        <div className="rounded-lg border border-foreground bg-foreground p-3 text-center text-background">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-background text-foreground">
            <Check className="size-4" />
          </div>
          <p className="mt-2 text-sm font-semibold">Approved</p>
          <p className="text-xs text-[#a3a3a3]">Ready to track</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <ShieldCheck className="size-4" /> Decision recorded automatically in the audit trail
      </div>
    </Card>
  );
}
