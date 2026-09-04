"use client";

import { useEffect, useState } from "react";
import { FileText, LockKeyhole, MessageSquareText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const records = [
  { id: "contract", label: "Contract", icon: FileText, eyebrow: "Master agreement", title: "Figma Professional", meta: "Effective Jan 1 – Dec 31", rows: [["Term", "12 months"], ["Notice period", "30 days"], ["Auto-renewal", "Enabled"]] },
  { id: "ownership", label: "Ownership", icon: UserRound, eyebrow: "Subscription owner", title: "Design team", meta: "Maintained in your workspace", rows: [["Owner", "Maya Chen"], ["Seats recorded", "8"], ["Next review", "October 1"]] },
  { id: "decision", label: "Decision note", icon: MessageSquareText, eyebrow: "Approval context", title: "Approved for Design", meta: "Recorded by workspace admin", rows: [["Reason", "Client delivery"], ["Owner", "Design team"], ["Next review", "October 1"]] },
];

export function ContextVault() {
  const firstRecord = records[0]!;
  const [activeId, setActiveId] = useState(firstRecord.id);
  const [paused, setPaused] = useState(false);
  const active = records.find((record) => record.id === activeId) ?? firstRecord;

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveId((current) => {
        const index = records.findIndex((record) => record.id === current);
        return records[(index + 1) % records.length]!.id;
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [paused]);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">Context that survives handoffs</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The reason behind every subscription stays with it.</h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">Keep contract details, ownership, and approval context beside the cost—so the next review starts with answers, not detective work.</p>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Subscription records">
          {records.map((record) => {
            const Icon = record.icon;
            const selected = record.id === active.id;
            return <button key={record.id} type="button" role="tab" aria-selected={selected} onClick={() => setActiveId(record.id)} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-300", selected ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-[#a3a3a3]")}><Icon className="size-4" />{record.label}</button>;
          })}
        </div>
      </div>

      <div className="context-vault relative min-h-[390px] overflow-hidden rounded-xl border border-border bg-[#ededed] p-5 sm:p-8">
        <div className="absolute -right-8 -top-10 size-44 rounded-full border border-[#d4d4d4]" />
        <div className="absolute -bottom-16 -left-10 size-52 rounded-full border border-[#d4d4d4]" />
        <div key={active.id} className="context-document relative mx-auto max-w-md rounded-xl border border-border bg-card p-5 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.38)] sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div><p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">{active.eyebrow}</p><h3 className="mt-2 text-xl font-semibold">{active.title}</h3><p className="mt-1 text-sm text-muted-foreground">{active.meta}</p></div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><active.icon className="size-4" /></span>
          </div>
          <dl className="divide-y divide-border py-2">
            {active.rows.map(([term, value]) => <div key={term} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-muted-foreground">{term}</dt><dd className="font-medium">{value}</dd></div>)}
          </dl>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-xs font-medium"><LockKeyhole className="size-4" />Private to your organization</div>
        </div>
      </div>
    </div>
  );
}
