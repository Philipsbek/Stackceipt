import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder shown while a detail page (subscription, request, member,
 * offboarding case) loads, so clicking an item to view it gives instant
 * feedback that the details are on the way.
 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Skeleton className="mb-3 h-7 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="mt-3 h-6 w-24 rounded-full" />
      </div>

      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </div>
  );
}
