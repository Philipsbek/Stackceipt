import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        solid: "border-transparent bg-primary text-primary-foreground",
        soft: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success)]",
        warning: "border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning)]",
        danger: "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-[color:var(--danger)]",
        info: "border-[color:var(--info-border)] bg-[color:var(--info-bg)] text-[color:var(--info)]",
      },
    },
    defaultVariants: { variant: "soft" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
