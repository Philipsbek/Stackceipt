import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type OrganizationRole } from "@/lib/domain/enums";
import { Wordmark } from "@/components/brand/wordmark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteAccept } from "./_components/invite-accept";

export const metadata = { title: "Accept invite" };
export const dynamic = "force-dynamic";

type Preview = { organization_name: string; invited_email: string; invited_role: OrganizationRole; expires_at: string | null };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data: previewRows }, { data: userData }] = await Promise.all([
    supabase.rpc("get_invitation_preview", { p_raw_token: token }),
    supabase.auth.getUser(),
  ]);
  const invite = ((previewRows ?? []) as Preview[])[0] ?? null;
  const next = `/invite/${token}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border"><div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6"><Link href="/" aria-label="Stackceipt home"><Wordmark height={40} /></Link></div></header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {invite ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">You&apos;re invited to {invite.organization_name}</CardTitle>
                <p className="text-sm text-muted-foreground">Join as a <span className="font-medium text-foreground">{ROLE_LABELS[invite.invited_role]}</span> using {invite.invited_email}.</p>
              </CardHeader>
              <CardContent>
                {userData.user ? <InviteAccept token={token} /> : (
                  <div className="space-y-2">
                    <Button asChild className="w-full"><Link href={`/auth/login?next=${encodeURIComponent(next)}`}>Log in to accept</Link></Button>
                    <Button asChild variant="outline" className="w-full"><Link href={`/auth/sign-up?next=${encodeURIComponent(next)}`}>Create account</Link></Button>
                  </div>
                )}
                <p className="mt-4 text-center text-xs text-muted-foreground">This link expires after 7 days and can only be used once.</p>
              </CardContent>
            </Card>
          ) : (
            <Card><CardHeader className="text-center"><CardTitle className="text-xl">Invite not valid</CardTitle><p className="text-sm text-muted-foreground">This invitation is invalid, expired, or already used. Ask an admin for a new link.</p></CardHeader><CardContent><Button asChild className="w-full"><Link href="/auth/login">Go to login</Link></Button></CardContent></Card>
          )}
        </div>
      </main>
    </div>
  );
}
