import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyCompact } from "@/lib/domain/money";

interface MoneyProps {
  minor: number;
  currency: string;
  className?: string;
  compact?: boolean;
  showCents?: boolean;
  /** Muted per-period suffix, e.g. "/mo" or "/yr". */
  suffix?: string;
}

/** Tabular, scannable monetary value. */
export function Money({ minor, currency, className, compact, showCents, suffix }: MoneyProps) {
  const text = compact
    ? formatMoneyCompact(minor, currency)
    : formatMoney(minor, currency, { showCents });
  return (
    <span data-slot="money" className={cn("tabular-nums", className)}>
      {text}
      {suffix ? <span className="ml-0.5 text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}
