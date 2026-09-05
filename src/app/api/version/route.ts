import { NextResponse } from "next/server";

// Always evaluated at request time so it reflects the running deployment.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Returns an identifier for the currently deployed build. The client compares it
 * against the version it loaded with to detect when a newer deployment is live.
 * On Vercel this changes with every deploy; locally it's a stable "dev".
 */
export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    "dev";
  return NextResponse.json({ version }, { headers: { "cache-control": "no-store" } });
}
