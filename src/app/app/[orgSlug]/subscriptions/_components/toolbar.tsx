"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABELS } from "@/lib/domain/enums";

interface ToolbarProps {
  departments: { id: string; name: string }[];
  categories: string[];
}

export function SubscriptionsToolbar({ departments, categories }: ToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("q") ?? "");
  const [isPending, startTransition] = React.useTransition();

  const update = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  // Debounce search into the URL.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if ((params.get("q") ?? "") !== search) update("q", search || null);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters =
    params.get("q") || params.get("status") || params.get("department") || params.get("category");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor, product, category…"
          className="pl-9 pr-9"
          aria-label="Search subscriptions"
          aria-busy={isPending}
        />
        {isPending ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <Select value={params.get("status") ?? "all"} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {SUBSCRIPTION_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("department") ?? "all"} onValueChange={(v) => update("department", v)}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by department">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("category") ?? "all"} onValueChange={(v) => update("category", v)}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("sort") ?? "cost_desc"} onValueChange={(v) => update("sort", v === "cost_desc" ? null : v)}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cost_desc">Cost: high to low</SelectItem>
          <SelectItem value="cost_asc">Cost: low to high</SelectItem>
          <SelectItem value="renewal">Renewal date</SelectItem>
          <SelectItem value="vendor">Vendor A–Z</SelectItem>
          <SelectItem value="updated">Recently updated</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X className="size-4" /> Clear
        </Button>
      ) : null}
    </div>
  );
}
