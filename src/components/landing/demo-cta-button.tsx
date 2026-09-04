"use client";

import { Loader2 } from "lucide-react";
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
      className="group relative min-w-[13.5rem] bg-background px-7 transition-[color,background-color,border-color,box-shadow] duration-300 ease-out hover:border-white hover:bg-white hover:text-foreground hover:shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_0_22px_rgba(255,255,255,0.95),0_0_48px_rgba(255,255,255,0.65),0_8px_24px_rgba(10,10,10,0.1)] active:shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_16px_rgba(255,255,255,0.75)] motion-reduce:transition-none"
    >
      <span className="relative z-10 flex items-center gap-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Opening demo…
          </>
        ) : (
          "View the live demo"
        )}
      </span>
    </Button>
  );
}
