"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; message?: string };

function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/onboarding";
  return next;
}

export async function signInAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  redirect(next === "/onboarding" ? "/app" : next);
}

export async function signUpAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // If email confirmation is disabled, a session exists immediately.
  if (data.session) redirect(next);
  return { message: "Check your email to confirm your account, then log in." };
}

export async function startDemoAction(): Promise<void> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (email && password) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) redirect("/app");
  }
  // Demo not configured or sign-in failed — fall back to sign-up.
  redirect("/auth/sign-up");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function requestPasswordResetAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl}/auth/reset-password` });
  // Do not reveal whether the email exists.
  return { message: "If that email exists, a reset link is on its way." };
}

export async function updatePasswordAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/app");
}
