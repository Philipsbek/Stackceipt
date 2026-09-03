import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Wordmark height={47} />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page doesn&apos;t exist, or you don&apos;t have access to it in this organization.
        </p>
      </div>
      <Button asChild><Link href="/">Back to home</Link></Button>
    </div>
  );
}
