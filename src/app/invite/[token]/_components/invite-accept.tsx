"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteAccept() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 600));
        setLoading(false);
        toast.success("Invitation accepted (demo)");
        router.push("/app/northwind");
      }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Accept invitation
    </Button>
  );
}
