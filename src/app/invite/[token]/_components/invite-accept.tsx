"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/lib/actions/invitations";

export function InviteAccept({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button
        className="w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          const result = await acceptInvitationAction(token);
          if (result?.error) {
            setError(result.error);
            setLoading(false);
          }
        }}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Accept invitation
      </Button>
    </div>
  );
}
