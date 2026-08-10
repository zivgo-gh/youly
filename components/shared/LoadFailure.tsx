"use client";

// Shown when the profile could not be READ. Deliberately not a redirect: bouncing a
// real user to /onboarding on a transient failure is how a profile gets overwritten.
export function LoadFailure({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-8 text-center">
      <p className="text-gray-800 text-lg font-semibold mb-2">Couldn&apos;t load your account</p>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        Your data is safe — we just couldn&apos;t reach the server. Check your connection and try again.
      </p>
      <button
        onClick={onRetry ?? (() => window.location.reload())}
        className="px-8 py-3 rounded-2xl bg-emerald-500 text-white font-bold active:scale-95 transition-transform"
      >
        Try again
      </button>
    </div>
  );
}
