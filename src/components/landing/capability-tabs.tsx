"use client";

import Image from "next/image";
import { LayoutGrid, ShieldCheck, Sparkles, UserMinus } from "lucide-react";
import { useState } from "react";

const tabs = [
  {
    icon: Sparkles,
    title: "Deterministic Janitor",
    body: "Rules — not AI — surface unowned tools, unused seats, duplicates, and missed notice deadlines with supportable savings.",
    image: "/images/capabilities/janitor.png",
    alt: "Stackceipt Janitor dashboard showing deterministic cost-control findings",
  },
  {
    icon: UserMinus,
    title: "Offboarding",
    body: "When someone leaves, generate a checklist of every seat to reclaim so access and spend don't linger.",
    image: "/images/capabilities/offboarding.png",
    alt: "Stackceipt offboarding interface showing tasks and seats to reclaim",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "Multi-tenant isolation enforced in Postgres row-level security, with an append-only audit log.",
    image: "/images/capabilities/security.png",
    alt: "Stackceipt security interface showing roles, permissions, and audit activity",
  },
  {
    icon: LayoutGrid,
    title: "One governed place",
    body: "Purpose-built for the person who has to answer “what are we paying for, and why?”",
    image: "/images/capabilities/inventory.png",
    alt: "Stackceipt subscription inventory with owners, renewals, costs, and statuses",
  },
] as const;

export function CapabilityTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="mt-14">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Stackceipt capabilities">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const selected = active === index;
          return (
            <button
              key={tab.title}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="capability-preview"
              onClick={() => setActive(index)}
              className={`group h-full rounded-[18px] border p-5 text-left transition duration-300 ${
                selected
                  ? "border-white/50 bg-white/[0.09] shadow-[0_18px_50px_-30px_rgba(168,85,247,0.8)]"
                  : "border-white/10 bg-[#151515] hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <Icon className={`size-5 transition-colors ${selected ? "text-[#c084fc]" : "text-[#aaa] group-hover:text-white"}`} />
              <h3 className="mt-5 font-medium text-white">{tab.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#8b8b8b]">{tab.body}</p>
            </button>
          );
        })}
      </div>

      <div id="capability-preview" role="tabpanel" className="confetti-product-stage mt-8 overflow-hidden rounded-[28px] p-[1px]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[27px] bg-[#0b0b0d]">
          {tabs.map((tab, index) => (
            <Image
              key={tab.image}
              src={tab.image}
              alt={tab.alt}
              fill
              priority={index === 0}
              sizes="(max-width: 1400px) 100vw, 1400px"
              className={`object-cover transition duration-500 ease-out ${active === index ? "scale-100 opacity-100" : "pointer-events-none scale-[1.015] opacity-0"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
