"use client";

import { Button } from "@/components/ui/Button";

// Shown when the profile could not be READ. Deliberately not a redirect: bouncing a
// real user to onboarding on a transient failure is how a profile gets overwritten.
export function LoadFailure({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-lg font-semibold text-ink">
        Couldn&apos;t load your account
      </p>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Your data is safe — we just couldn&apos;t reach the server. Check your
        connection and try again.
      </p>
      <div className="mt-8">
        <Button onClick={onRetry ?? (() => window.location.reload())}>
          Try again
        </Button>
      </div>
    </div>
  );
}
