import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteAccept } from "./_components/invite-accept";

export const metadata = { title: "Accept invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // DEMO: any well-formed token resolves to a sample invite. With Supabase we look up
  // the invitation by token HASH, verify it's unexpired and unused, and require the
  // authenticated user's email to match the invited email before binding membership.
  const valid = token.length >= 24;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Stackceipt home">
            <Wordmark height={40} />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {valid ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">You&apos;re invited to Northwind Labs</CardTitle>
                <p className="text-sm text-muted-foreground">You&apos;ve been invited to join as a <span className="font-medium text-foreground">Member</span>.</p>
              </CardHeader>
              <CardContent>
                <InviteAccept />
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  This link only works for the invited email address and can be used once.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Invite not valid</CardTitle>
                <p className="text-sm text-muted-foreground">This invitation link is invalid or has expired. Ask an admin for a new one.</p>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full"><Link href="/auth/login">Go to login</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
