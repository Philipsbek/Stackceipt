"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "Can I try Stackceipt without signing up?",
    answer: "Yes. Select View the live demo to explore a ready-made workspace in guest mode.",
  },
  {
    question: "How does Stackceipt calculate costs?",
    answer: "It normalizes monthly, quarterly, annual, and custom billing cycles into clear recurring and annual totals.",
  },
  {
    question: "Who can approve or edit subscriptions?",
    answer: "Only organization owners and admins can approve requests or change subscription records. Managers and members have scoped access.",
  },
  {
    question: "Can I import my existing subscriptions?",
    answer: "Yes. You can add subscriptions manually or import them from a CSV file.",
  },
  {
    question: "Is company data kept separate?",
    answer: "Yes. Each organization is isolated using database row-level security and protected access rules.",
  },
  {
    question: "How long does setup take?",
    answer: "You can create an organization and begin tracking subscriptions in just a few minutes.",
  },
];

export function FloatingFaq() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-5 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          id="landing-faq-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="landing-faq-title"
          className="faq-panel absolute bottom-[calc(100%+12px)] right-0 w-[calc(100vw-32px)] max-w-[380px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <h2 id="landing-faq-title" className="text-base font-semibold tracking-tight">
                Frequently asked questions
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Quick answers about Stackceipt.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-2 size-8"
              aria-label="Close frequently asked questions"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>
          </div>

          <div className="max-h-[min(62vh,480px)] overflow-y-auto px-5 py-2">
            {faqs.map((faq) => (
              <details key={faq.question} className="faq-item border-b border-border last:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium marker:hidden">
                  {faq.question}
                  <ChevronDown className="faq-chevron size-4 shrink-0 text-muted-foreground" />
                </summary>
                <p className="-mt-1 pb-4 pr-6 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        className="faq-trigger h-11 gap-2 rounded-lg px-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
        aria-expanded={isOpen}
        aria-controls="landing-faq-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X /> : <CircleHelp />}
        {isOpen ? "Close" : "FAQ"}
      </Button>
    </div>
  );
}
