import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Request access" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  // Invited users (arriving from an /invite/<token> link) may still create an
  // account. Everyone else sees the invite-only notice.
  const invited = next.startsWith("/invite/");

  if (invited) {
    return (
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Lock className="size-5" />
        </div>
        <CardTitle className="text-xl">Access is invite-only</CardTitle>
        <p className="text-sm text-muted-foreground">Stackceipt isn&apos;t open for self-service sign-up.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          To get a workspace, please request access from the developer. Once your account has been
          created, you can log in here.
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/login">Log in</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="font-medium text-foreground hover:underline">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
