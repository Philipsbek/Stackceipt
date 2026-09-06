"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, X } from "lucide-react";

const faqs = [
  ["Can I try Stackceipt without signing up?", "Yes. Select View live demo to explore a ready-made workspace in guest mode."],
  ["Does Stackceipt connect to software platforms?", "No. Stackceipt organizes subscription information your team enters manually or imports by CSV."],
  ["How are costs calculated?", "Monthly, quarterly, annual, and custom billing cycles are normalized into clear recurring and annual totals."],
  ["Who can approve or edit subscriptions?", "Only organization owners and admins can approve requests or change subscription records."],
  ["Is company data kept separate?", "Yes. Each organization is isolated using database row-level security and protected access rules."],
];

export function FloatingFaq() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div ref={ref} className="fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
    {open && <section id="landing-faq-panel" role="dialog" aria-labelledby="faq-title" className="faq-panel absolute bottom-[calc(100%+12px)] right-0 w-[calc(100vw-32px)] max-w-[390px] overflow-hidden rounded-[20px] border border-white/10 bg-[#151515] text-white shadow-2xl">
      <div className="flex justify-between border-b border-white/10 p-5"><div><h2 id="faq-title" className="font-medium">Frequently asked questions</h2><p className="mt-1 text-sm text-[#888]">Quick answers about Stackceipt.</p></div><button type="button" aria-label="Close frequently asked questions" onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/10"><X className="size-4" /></button></div>
      <div className="max-h-[60vh] overflow-y-auto px-5 py-2">{faqs.map(([question, answer]) => <details key={question} className="faq-item border-b border-white/10 last:border-0"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium">{question}<ChevronDown className="faq-chevron size-4 shrink-0 text-[#777]" /></summary><p className="pb-4 pr-5 text-sm leading-6 text-[#8f8f8f]">{answer}</p></details>)}</div>
    </section>}
    <button type="button" aria-expanded={open} aria-controls="landing-faq-panel" onClick={() => setOpen(value => !value)} className="flex h-11 items-center gap-2 rounded-[14px] bg-[#9b22e8] px-4 text-sm font-medium text-white shadow-xl shadow-black/30 transition hover:bg-[#aa36ef]"><CircleHelp className="size-4" />{open ? "Close" : "FAQ"}</button>
  </div>;
}
