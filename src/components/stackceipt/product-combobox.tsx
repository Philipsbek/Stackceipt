"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_CATALOG, type ProductCatalogItem } from "@/lib/product-catalog";

type Props = {
  value: string;
  onSelect: (product: ProductCatalogItem) => void;
  onCustom: (name: string) => void;
};

function ProductIcon({ product, className }: { product: ProductCatalogItem; className?: string }) {
  if (!product.icon) {
    return (
      <span className={cn("flex size-5 items-center justify-center text-[10px] font-semibold text-muted-foreground", className)} aria-hidden="true">
        {product.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  const darkBrand = isDarkHex(product.icon.hex);
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5", darkBrand && "dark:invert", className)} style={{ color: `#${product.icon.hex}` }}>
      <path fill="currentColor" d={product.icon.path} />
    </svg>
  );
}

function isDarkHex(hex: string): boolean {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 < 70;
}

export function ProductCombobox({ value, onSelect, onCustom }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [customMode, setCustomMode] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selected = PRODUCT_CATALOG.find((product) => product.name.toLowerCase() === value.trim().toLowerCase());
  const normalizedQuery = query.trim().toLowerCase();
  const results = PRODUCT_CATALOG.filter((product) =>
    `${product.name} ${product.vendor} ${product.category}`.toLowerCase().includes(normalizedQuery),
  );
  const exactMatch = PRODUCT_CATALOG.some((product) => product.name.toLowerCase() === normalizedQuery);

  React.useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function choose(product: ProductCatalogItem) {
    onSelect(product);
    setQuery("");
    setOpen(false);
  }

  function addCustomProduct() {
    const name = customName.trim();
    if (!name) return;
    onCustom(name);
    setCustomName("");
    setCustomMode(false);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="flex min-w-0 items-center gap-2">
          {selected ? <span className="flex size-7 shrink-0 items-center justify-center rounded-md dark:bg-white/10"><ProductIcon product={selected} /></span> : value ? <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-secondary text-[10px] font-semibold">{value.slice(0, 1).toUpperCase()}</span> : null}
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || "Select or add a product"}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[280px] overflow-hidden rounded-xl border border-border bg-popover shadow-[0_12px_36px_-16px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" className="h-10 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm" />
          </div>
          <div role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {results.map((product) => (
              <button key={product.id} type="button" role="option" aria-selected={selected?.id === product.id} onClick={() => choose(product)} className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card dark:border-white/15 dark:bg-white/10"><ProductIcon product={product} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{product.name}</span><span className="block truncate text-xs text-muted-foreground">{product.vendor} · {product.category}</span></span>
                {selected?.id === product.id ? <Check className="size-4" /> : null}
              </button>
            ))}
            {normalizedQuery && !exactMatch ? (
              <button type="button" onClick={() => { onCustom(query.trim()); setQuery(""); setOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none">
                <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold">+</span>
                <span><span className="block text-sm font-medium">Add custom product</span><span className="block max-w-[220px] truncate text-xs text-muted-foreground">{query.trim()}</span></span>
              </button>
            ) : null}
            {!results.length && !normalizedQuery ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Start typing to search.</p> : null}
          </div>
          <div className="border-t border-border p-2">
            {customMode ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomProduct();
                    }
                  }}
                  placeholder="Custom product name"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" onClick={addCustomProduct} disabled={!customName.trim()} className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">Add</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setCustomName(query.trim()); setCustomMode(true); }} className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-secondary">
                <span className="text-base leading-none">+</span> Add a product not listed
              </button>
            )}
          </div>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Product selection does not connect to the platform.</p>
        </div>
      ) : null}
    </div>
  );
}
