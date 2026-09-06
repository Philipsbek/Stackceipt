import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BellRing, CalendarClock, ClipboardCheck, LayoutGrid,
  ShieldCheck, FileUp, Calculator, BadgeDollarSign,
  Check, Clock3, UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/brand/wordmark";
import { Money } from "@/components/stackceipt/money";
import { SubscriptionStatusBadge } from "@/components/stackceipt/status-badge";
import { DemoCtaButton } from "@/components/landing/demo-cta-button";
import { MotionReveal } from "@/components/landing/motion-reveal";
import { FloatingFaq } from "@/components/landing/floating-faq";
import { LandingScrollEffects } from "@/components/landing/scroll-effects";
import { ContextVault } from "@/components/landing/context-vault";
import { CapabilityTabs } from "@/components/landing/capability-tabs";
import { startDemoAction } from "@/lib/actions/auth";

const primaryFeatures = [
  { icon: LayoutGrid, image: "/images/stack-to-control.png", title: "Subscription inventory", body: "One governed source of truth for every tool, its owner, seats, and true annualized cost.", glow: "confetti-glow-violet" },
  { icon: CalendarClock, image: "/images/renewal-decision.png", title: "Renewals & notice windows", body: "See what renews next and the exact date you must give notice — before you auto-renew by accident.", glow: "confetti-glow-cyan" },
  { icon: ClipboardCheck, image: "/images/approval-workflow.png", title: "Requests & approvals", body: "A lightweight approval workflow with department scope, audit trail, and one-click conversion to a tracked subscription.", glow: "confetti-glow-orange" },
];

export default function ConfettiLanding() {
  return (
    <div className="confetti-landing min-h-dvh overflow-hidden bg-background text-foreground">
      <LandingScrollEffects />

      <header data-landing-header className="confetti-nav-wrap sticky top-4 z-40 mx-auto max-w-[720px] px-4">
        <div className="confetti-nav flex h-14 items-center justify-between rounded-[14px] border border-white/10 bg-[#1a1a1a] px-3 shadow-2xl shadow-black/30">
          <Link href="/" aria-label="Stackceipt home" className="shrink-0"><Wordmark height={32} className="brightness-0 invert" /></Link>
          <nav className="hidden items-center gap-6 text-sm text-[#b8b8b8] md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
            <a href="#control" className="transition-colors hover:text-white">Control</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden text-white hover:bg-white/10 sm:inline-flex"><Link href="/auth/login">Log in</Link></Button>
            <Button asChild size="sm" className="confetti-purple-button bg-[#9b22e8] text-white hover:bg-[#aa36ef]"><Link href="/auth/sign-up">Get started</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="confetti-hero relative mx-auto min-h-[920px] max-w-[1400px] px-4 pb-24 pt-28 sm:px-6 lg:pt-36">
          <div className="confetti-hero-light" />
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <MotionReveal><Badge className="border border-white/10 bg-white/[0.06] text-[#c8c8c8]">Software subscription governance for SMBs</Badge></MotionReveal>
            <MotionReveal delay={80}><h1 className="confetti-display mx-auto mt-7 max-w-5xl text-balance">Know what your software stack is costing you.</h1></MotionReveal>
            <MotionReveal delay={150}><p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-[#a6a6a6] sm:text-lg">Stackceipt is the calm, financially precise place to track every subscription, renewal, approval, and review — and cut the cost of tools you no longer need.</p></MotionReveal>
            <MotionReveal delay={220}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="group h-12 bg-white px-7 text-[15px] text-black hover:bg-[#ededed]"><Link href="/auth/sign-up">Start tracking your stack <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button>
                <form action={startDemoAction}><DemoCtaButton /></form>
              </div>
              <p className="mt-4 text-xs text-[#777]">No credit card required. Set up your organization in minutes.</p>
            </MotionReveal>
          </div>
          <MotionReveal delay={260} className="relative z-10 mx-auto mt-20 max-w-5xl">
            <div className="confetti-product-stage rounded-[28px] p-[1px]">
              <div className="rounded-[27px] bg-black/70 p-3 backdrop-blur-sm sm:p-7"><ProductPreview /></div>
            </div>
          </MotionReveal>
        </section>

        <section id="features" className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="mx-auto max-w-4xl text-center">
            <h2 className="confetti-section-title">Everything, in one governed place</h2>
            <p className="mx-auto mt-6 max-w-xl text-base text-[#929292]">Purpose-built for the person who has to answer “what are we paying for, and why?”</p>
          </MotionReveal>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {primaryFeatures.map((feature, index) => (
              <MotionReveal key={feature.title} delay={index * 90} className="h-full">
                <article className="confetti-feature-card group h-full overflow-hidden rounded-[24px] border border-white/10 bg-[#151515]">
                  <div className={`relative h-64 overflow-hidden ${feature.glow}`}>
                    <Image src={feature.image} alt="" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover opacity-60 mix-blend-luminosity transition duration-700 group-hover:scale-[1.04] group-hover:opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent" />
                  </div>
                  <div className="p-6">
                    <feature.icon className="size-5 text-white" />
                    <h3 className="mt-5 text-xl font-medium">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#919191]">{feature.body}</p>
                  </div>
                </article>
              </MotionReveal>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="text-center"><h2 className="confetti-section-title">From scattered spend to clear action.</h2><p className="mx-auto mt-6 max-w-2xl text-[#929292]">Three simple steps give you a precise view of every software dollar—and enough time to act before the next renewal.</p></MotionReveal>
          <div className="relative mt-20 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden h-px bg-white/15 md:block" />
            {[
              { icon: FileUp, title: "Add your stack", body: "Enter subscriptions manually or import a CSV. No complicated setup." },
              { icon: Calculator, title: "See the real cost", body: "Monthly, quarterly, and annual plans become one dependable number." },
              { icon: BadgeDollarSign, title: "Act before renewal", body: "Review upcoming renewals and reclaim waste while you still have time." },
            ].map((step, index) => (
              <MotionReveal key={step.title} delay={index * 100}>
                <article className="relative rounded-[20px] border border-white/10 bg-[#121212] p-6 text-center transition hover:-translate-y-1 hover:border-white/25">
                  <div className="relative z-10 mx-auto flex size-16 items-center justify-center rounded-full border border-white/15 bg-black shadow-[0_0_0_8px_#000]"><step.icon className="size-5" /></div>
                  <p className="mt-7 text-xs uppercase tracking-[0.16em] text-[#777]">Step 0{index + 1}</p><h3 className="mt-2 text-xl">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[#8f8f8f]">{step.body}</p>
                </article>
              </MotionReveal>
            ))}
          </div>
          <MotionReveal className="mt-8"><div className="flex flex-col items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-[#171717] px-6 py-5 sm:flex-row"><p className="text-sm">One source of truth. One clear annual number. No guesswork.</p><Button asChild size="sm" className="group bg-white text-black hover:bg-[#ededed]"><Link href="/auth/sign-up">Build your inventory <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button></div></MotionReveal>
        </section>

        <section id="control" className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="mx-auto max-w-5xl text-center"><h2 className="confetti-section-title">Catch the renewal before it catches you.</h2><p className="mx-auto mt-6 max-w-2xl text-[#929292]">Stackceipt separates the renewal date from the date that actually matters: your cancellation notice deadline. You see the window early enough to decide.</p></MotionReveal>
          <div className="mt-16 grid items-center gap-10 lg:grid-cols-[0.78fr_1.22fr]">
            <MotionReveal>
              <div><Badge className="border border-white/10 bg-white/[0.06] text-[#bcbcbc]">Renewal control</Badge><ul className="mt-7 space-y-4">{["Notice deadlines calculated clearly", "Upcoming commitments prioritized", "Owners know when action is required"].map((item) => <li key={item} className="flex items-center gap-3 text-sm text-[#b3b3b3]"><span className="flex size-7 items-center justify-center rounded-full bg-white text-black"><Check className="size-3.5" /></span>{item}</li>)}</ul></div>
            </MotionReveal>
            <MotionReveal delay={100}><div className="confetti-gradient-frame confetti-glow-cyan rounded-[28px] p-4 sm:p-8"><RenewalIllustration /></div></MotionReveal>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal><div className="confetti-vault-frame rounded-[28px] p-4 sm:p-8"><ContextVault /></div></MotionReveal>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="mx-auto max-w-4xl text-center"><h2 className="confetti-section-title">Every tool has a reason, an owner, and a decision.</h2><p className="mx-auto mt-6 max-w-2xl text-[#929292]">Requests move through a clear approval path. Owners and admins stay in control, while every decision remains visible in the audit trail.</p></MotionReveal>
          <MotionReveal delay={100} className="mx-auto mt-16 max-w-4xl"><div className="confetti-gradient-frame confetti-glow-violet rounded-[28px] p-4 sm:p-8"><ApprovalIllustration /></div></MotionReveal>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="mx-auto max-w-4xl text-center"><h2 className="confetti-section-title">Know what needs attention next.</h2><p className="mx-auto mt-6 max-w-xl text-[#929292]">Reviews, offboarding, cost-control findings, and secure records stay together.</p></MotionReveal>
          <MotionReveal><CapabilityTabs /></MotionReveal>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-28 sm:px-6 lg:py-40">
          <MotionReveal className="mx-auto max-w-4xl text-center"><h2 className="confetti-section-title">See your real annual commitment</h2><p className="mx-auto mt-6 max-w-xl text-[#929292]">Add your subscriptions and Stackceipt does the annualized math and finds the waste.</p></MotionReveal>
          <MotionReveal delay={100} className="mt-16">
            <div className="grid gap-5 md:grid-cols-[0.6fr_0.4fr]">
              <div className="confetti-closing-visual relative min-h-[420px] overflow-hidden rounded-[26px] border border-white/10 bg-[#151515] p-6"><div className="absolute inset-0 confetti-glow-orange opacity-80" /><div className="relative z-10 mx-auto max-w-xl pt-16"><ProductPreview /></div></div>
              <div className="grid gap-5"><div className="rounded-[24px] border border-white/10 bg-[#171717] p-7"><CalendarClock className="size-10 text-[#aaa]" /><p className="mt-20 text-2xl">Never miss the notice window.</p></div><div className="confetti-glow-violet rounded-[24px] border border-white/10 p-7"><p className="text-sm text-[#b9b9b9]">Ready to know your stack?</p><Button asChild size="lg" className="group mt-6 w-full bg-white text-black hover:bg-[#ededed]"><Link href="/auth/sign-up">Get started <ArrowRight className="transition-transform group-hover:translate-x-1" /></Link></Button></div></div>
            </div>
          </MotionReveal>
        </section>
      </main>

      <footer className="mx-auto max-w-[1400px] px-4 pb-8 pt-20 sm:px-6">
        <div className="confetti-footer rounded-t-[56px] border border-white/10 px-6 pb-8 pt-16 sm:px-10 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
            <div><Wordmark height={42} className="brightness-0 invert" /><p className="mt-5 max-w-sm text-sm leading-6 text-[#8e8e8e]">Know what your software stack is costing you.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild className="bg-[#9b22e8] text-white hover:bg-[#aa36ef]"><Link href="/auth/sign-up">Get started</Link></Button><form action={startDemoAction}><DemoCtaButton /></form></div></div>
            <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3"><div><p className="font-medium">Product</p><div className="mt-4 space-y-3 text-[#888]"><a className="block hover:text-white" href="#features">Features</a><a className="block hover:text-white" href="#how-it-works">How it works</a><a className="block hover:text-white" href="#control">Renewals</a></div></div><div><p className="font-medium">Account</p><div className="mt-4 space-y-3 text-[#888]"><Link className="block hover:text-white" href="/auth/login">Log in</Link><Link className="block hover:text-white" href="/auth/sign-up">Sign up</Link></div></div><div><p className="font-medium">Stackceipt</p><div className="mt-4 space-y-3 text-[#888]"><span className="block">Subscription governance</span><span className="block">Demo build</span></div></div></div>
          </div>
          <div className="mt-20 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#686868] sm:flex-row"><p>© {new Date().getFullYear()} Stackceipt.</p><p>Know what your software stack is costing you.</p></div>
        </div>
      </footer>
      <FloatingFaq />
    </div>
  );
}

function ProductPreview() {
  return (
    <Card className="confetti-ui-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3"><div className="flex gap-1.5"><span className="size-2 rounded-full bg-white/20" /><span className="size-2 rounded-full bg-white/20" /><span className="size-2 rounded-full bg-white/20" /></div><span className="text-xs text-[#888]">Northwind Labs · Dashboard</span><BellRing className="size-4 text-[#777]" /></div>
      <div className="space-y-4 p-4 sm:p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-[#777]">Monthly recurring</p><p className="mt-2 text-xl font-semibold"><Money minor={1_698_400} currency="USD" showCents={false} /></p></div><div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-[#777]">Annual committed</p><p className="mt-2 text-xl font-semibold"><Money minor={20_380_800} currency="USD" showCents={false} /></p></div></div>
        <div className="space-y-2">{[{v:"Adobe Creative Cloud",c:599900,s:"ACTIVE" as const,u:"27% used"},{v:"GitHub Enterprise",c:2100000,s:"ACTIVE" as const,u:"Renews in 17d"},{v:"Linear Business",c:16800,s:"TRIAL" as const,u:"Trial"}].map(row => <div key={row.v} className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.025] px-3 py-3"><div><p className="text-sm font-medium">{row.v}</p><p className="text-xs text-[#777]">{row.u}</p></div><div className="flex items-center gap-3"><SubscriptionStatusBadge status={row.s} /><span className="text-sm font-medium"><Money minor={row.c} currency="USD" suffix="/yr" showCents={false} /></span></div></div>)}</div>
      </div>
    </Card>
  );
}

function RenewalIllustration() {
  return <Card className="confetti-ui-card overflow-hidden p-0"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="flex items-center gap-2 text-sm"><CalendarClock className="size-4" /> Renewal timeline</span><Badge className="bg-white/10 text-[#bbb]">Next 60 days</Badge></div><div className="p-6"><div className="ml-3 space-y-6 border-l border-white/15 pl-7">{[{day:"Today",title:"Review usage",detail:"12 of 40 seats active"},{day:"17 days",title:"Notice deadline",detail:"Decision required",active:true},{day:"47 days",title:"Contract renews",detail:"$21,000 annual commitment"}].map(item => <div key={item.title} className="relative"><span className={`absolute -left-[35px] top-1 size-3 rounded-full border-2 border-[#121212] ${item.active ? "bg-white" : "bg-[#555]"}`} /><p className="text-xs text-[#777]">{item.day}</p><div className={`mt-2 rounded-[14px] border p-4 ${item.active ? "border-white/50 bg-white/[0.06]" : "border-white/10 bg-black/20"}`}><div className="flex justify-between"><p className="text-sm font-medium">{item.title}</p>{item.active && <Clock3 className="size-4" />}</div><p className="mt-1 text-sm text-[#777]">{item.detail}</p></div></div>)}</div></div></Card>;
}

function ApprovalIllustration() {
  return <Card className="confetti-ui-card p-5 sm:p-7"><div className="rounded-[14px] border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-[#777]">New request</p><div className="mt-3 flex justify-between gap-3"><div><p className="font-medium">Figma Professional</p><p className="text-sm text-[#777]">Design · 8 seats · $1,440/year</p></div><Badge className="bg-white/10 text-[#bbb]">Pending</Badge></div></div><div className="mx-auto h-8 w-px bg-white/15" /><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="rounded-[14px] border border-white/10 p-4 text-center"><UserRoundCheck className="mx-auto size-5" /><p className="mt-3 text-sm">Admin review</p></div><ArrowRight className="size-4 text-[#777]" /><div className="rounded-[14px] border border-white/30 bg-white text-center text-black p-4"><Check className="mx-auto size-5" /><p className="mt-3 text-sm">Approved</p></div></div><div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-[#777]"><ShieldCheck className="size-4" />Decision recorded automatically in the audit trail</div></Card>;
}
