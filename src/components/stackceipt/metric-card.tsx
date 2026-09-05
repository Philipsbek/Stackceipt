import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Explanatory tooltip for metrics that could be misread (e.g. annualized ≠ cash). */
  tooltip?: string;
  href?: string;
  className?: string;
  emphasis?: boolean;
}

export function MetricCard({ label, value, hint, tooltip, href, className, emphasis }: MetricCardProps) {
  const body = (
    <Card
      className={cn(
        "p-5 transition-colors",
        href && "hover:border-[#d4d4d4]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {tooltip ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground" aria-label={`About ${label}`}>
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className={cn("mt-2 font-semibold tracking-tight tabular-nums", emphasis ? "text-2xl sm:text-3xl" : "text-2xl")}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {body}
      </Link>
    );
  }
  return body;
}
