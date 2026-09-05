import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // text-base on mobile keeps the field at 16px so iOS Safari doesn't
          // zoom the page on focus; text-sm from the sm breakpoint up.
          "flex h-9 w-full rounded-lg border border-transparent bg-secondary px-3 py-1 text-base text-foreground shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-transparent bg-secondary px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-border focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
