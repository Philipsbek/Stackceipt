"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/data/access";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "Invalid slug"),
  baseCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(1),
  renewalWindowDays: z.number().int().min(1).max(365),
});

export type CreateOrgResult = { error?: string };

export async function createOrganizationAction(input: {
  name: string;
  slug: string;
  baseCurrency: string;
  timezone: string;
  renewalWindowDays: number;
}): Promise<CreateOrgResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "You must be logged in." };
  if (isDemoEmail(userData.user.email)) {
    return { error: "The demo account can't create organizations. Sign up for your own." };
  }

  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_base_currency: parsed.data.baseCurrency,
    p_timezone: parsed.data.timezone,
    p_renewal_window_days: parsed.data.renewalWindowDays,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "That slug is already taken." };
    }
    return { error: error.message };
  }

  redirect(`/app/${parsed.data.slug}`);
}
