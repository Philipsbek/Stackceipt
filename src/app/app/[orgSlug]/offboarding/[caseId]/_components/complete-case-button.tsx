"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { completeCaseAction } from "@/lib/actions/offboarding";
import { Button } from "@/components/ui/button";

export function CompleteCaseButton({ orgSlug, caseId, allDone }: { orgSlug: string; caseId: string; allDone: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function complete() {
    setBusy(true);
    const result = await completeCaseAction(orgSlug, caseId);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Offboarding completed");
    router.refresh();
  }

  return (
    <Button disabled={!allDone || busy} variant={allDone ? "default" : "outline"} onClick={complete}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {allDone ? "Complete offboarding" : "Complete all tasks first"}
    </Button>
  );
}
