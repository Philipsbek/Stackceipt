"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCY_OPTIONS, COMMON_CURRENCY_COUNT, currencyName } from "@/lib/domain/currencies";

export function CurrencyCombobox({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? CURRENCY_OPTIONS.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : CURRENCY_OPTIONS;
  // Only show the "Common" divider when browsing the unfiltered list.
  const commonCount = q ? 0 : COMMON_CURRENCY_COUNT;

  React.useEffect(() => {
    if (!open) return;
    setQuery(""); // start each open with a fresh search
    inputRef.current?.focus();
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function choose(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
  }

  const selectedName = value ? currencyName(value) : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((c) => !c)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-secondary px-3 text-sm transition-colors hover:border-border hover:bg-[#ededed] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-border"
        data-state={open ? "open" : "closed"}
      >
        <span className="flex min-w-0 items-center gap-2">
          {value ? <span className="font-medium">{value}</span> : null}
          <span className={cn("truncate text-muted-foreground", !value && "text-muted-foreground")}>
            {value ? selectedName : "Select currency"}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[260px] overflow-hidden rounded-xl border border-border bg-popover shadow-[0_12px_36px_-16px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search currency or code…"
              className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
              aria-label="Search currencies"
            />
          </div>
          <div role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No currency found.</p>
            ) : (
              results.map((c, i) => (
                <React.Fragment key={c.code}>
                  {i === 0 && commonCount > 0 ? (
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Common</p>
                  ) : null}
                  {i === commonCount && commonCount > 0 ? (
                    <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">All currencies</p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    onClick={() => choose(c.code)}
                    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="w-10 shrink-0 text-sm font-semibold tabular-nums">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{c.name}</span>
                    {c.code === value ? <Check className="size-4 shrink-0" /> : null}
                  </button>
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
