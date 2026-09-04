import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  message = "Loading Stackceipt…",
  contained = false,
}: {
  message?: string;
  contained?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        "flex items-center justify-center bg-background px-6",
        contained ? "min-h-[60vh]" : "min-h-dvh",
      )}
    >
      <div className="flex flex-col items-center text-center">
        <Wordmark height={40} />
        <div className="relative mt-8 size-10" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-border" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground motion-reduce:animate-none" />
          <div className="absolute inset-[13px] animate-pulse rounded-full bg-foreground motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">Preparing your workspace</p>
      </div>
    </div>
  );
}
