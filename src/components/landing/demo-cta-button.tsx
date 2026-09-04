"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function DemoCtaButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      variant="outline"
      disabled={pending}
      aria-label={pending ? "Opening the live demo" : "View the live demo"}
      className="group relative min-w-[13.5rem] overflow-hidden bg-background px-7 transition-[color,background-color,border-color,transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_8px_24px_rgba(10,10,10,0.14)] active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className="relative z-10 flex items-center gap-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Opening demo…
          </>
        ) : (
          <>
            View the live demo
            <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transform-none motion-reduce:transition-none" />
          </>
        )}
      </span>
    </Button>
  );
}
