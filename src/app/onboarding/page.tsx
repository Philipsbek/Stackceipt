import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { OnboardingForm } from "./_components/onboarding-form";

export const metadata = { title: "Get started" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center" aria-label="Stackceipt home">
            <Wordmark height={40} />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Stackceipt</h1>
          <p className="text-sm text-muted-foreground">Set up your organization to start tracking software spend. You can invite your team next.</p>
        </div>
        <OnboardingForm />
      </main>
    </div>
  );
}
