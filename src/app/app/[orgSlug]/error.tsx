"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/stackceipt/states";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this would go to server-side logging, not the console, and never
    // expose internals to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="py-10">
      <ErrorState
        title="This view failed to load"
        description="Something went wrong rendering this page. You can try again."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
