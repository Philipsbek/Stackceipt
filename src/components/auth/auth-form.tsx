"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthResult,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "sign-up" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; cta: string; sub: string }> = {
  login: { title: "Log in to Stackceipt", cta: "Log in", sub: "Welcome back." },
  "sign-up": { title: "Create your account", cta: "Create account", sub: "Start tracking your software stack." },
  forgot: { title: "Reset your password", cta: "Send reset link", sub: "We'll email you a link to reset it." },
  reset: { title: "Choose a new password", cta: "Update password", sub: "Enter a new password for your account." },
};

const ACTIONS: Record<Mode, (prev: AuthResult, fd: FormData) => Promise<AuthResult>> = {
  login: signInAction,
  "sign-up": signUpAction,
  forgot: requestPasswordResetAction,
  reset: updatePasswordAction,
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const [state, formAction] = React.useActionState(ACTIONS[mode], {});
  const copy = COPY[mode];
  const next = params.get("next") ?? "";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{copy.sub}</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          {mode === "sign-up" ? (
            <div>
              <Label className="mb-1.5">Full name</Label>
              <Input name="fullName" autoComplete="name" placeholder="Alex Rivera" required />
            </div>
          ) : null}

          {mode !== "reset" ? (
            <div>
              <Label className="mb-1.5">Email</Label>
              <Input name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </div>
          ) : null}

          {mode !== "forgot" ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label>{mode === "reset" ? "New password" : "Password"}</Label>
                {mode === "login" ? (
                  <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Forgot?</Link>
                ) : null}
              </div>
              <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
            </div>
          ) : null}

          {state.error ? (
            <p className="rounded-md bg-[color:var(--danger-bg)] px-3 py-2 text-sm text-destructive">{state.error}</p>
          ) : null}
          {state.message ? (
            <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">{state.message}</p>
          ) : null}

          <SubmitButton label={copy.cta} />
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>No account? <Link href={`/auth/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground hover:underline">Sign up</Link></>
          ) : mode === "sign-up" ? (
            <>Already have an account? <Link href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground hover:underline">Log in</Link></>
          ) : (
            <Link href="/auth/login" className="font-medium text-foreground hover:underline">Back to login</Link>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
