/**
 * Which build is this?
 *
 * Populated from `env` in next.config.ts, which inlines Vercel's build-time
 * variables into the client bundle. Surfaced in Account -> About so that "is the
 * browser even running the build I just pushed?" is answerable at a glance
 * instead of being guessed at.
 */
const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";

export const BUILD = {
  sha,
  shortSha: sha ? sha.slice(0, 7) : "local",
  env: process.env.NEXT_PUBLIC_BUILD_ENV ?? "development",
  time: process.env.NEXT_PUBLIC_BUILD_TIME ?? "",
};

/** e.g. "27 Sep 2026, 09:14" — local time, so it's comparable to a deploy log. */
export function formatBuildTime(iso: string): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
