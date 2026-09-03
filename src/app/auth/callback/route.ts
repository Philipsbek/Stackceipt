import { NextResponse } from "next/server";

/**
 * OAuth / email confirmation callback.
 *
 * With Supabase this exchanges the `code` for a session via the SSR client, then
 * redirects to a validated local `next` path. In demo mode there is no session to
 * exchange, so we simply redirect somewhere safe.
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/app/northwind";
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, url.origin));
}
