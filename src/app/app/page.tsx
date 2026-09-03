import { redirect } from "next/navigation";
import { getMyOrganizations, getSession } from "@/lib/data/access";

// Auth-dependent redirect — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

/** Entry point after login: send the user to their first org, or onboarding. */
export default async function AppIndexPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const orgs = await getMyOrganizations();
  if (orgs.length === 0) redirect("/onboarding");
  redirect(`/app/${orgs[0]!.slug}`);
}
