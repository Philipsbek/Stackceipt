"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDemoEmail } from "@/lib/data/access";

/**
 * Update the current user's own display name. Writes to profiles.full_name
 * (guarded by the profiles_update_self RLS policy) and mirrors it into the auth
 * user metadata so the two stay in sync.
 */
export async function updateDisplayNameAction(fullName: string): Promise<{ ok?: true; error?: string }> {
  const trimmed = fullName.trim();
  if (trimmed.length < 1) return { error: "Please enter a name." };
  if (trimmed.length > 120) return { error: "That name is too long." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not authorized." };
  if (isDemoEmail(userData.user.email)) return { error: "Editing the profile isn't available in the read-only demo." };

  const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", userData.user.id);
  if (error) return { error: "Could not save your name. Please try again." };

  // Keep auth metadata consistent (best-effort; not the source of truth).
  await supabase.auth.updateUser({ data: { full_name: trimmed } });

  revalidatePath("/app", "layout");
  return { ok: true };
}
