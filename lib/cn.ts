/**
 * Minimal class joiner. Deliberately not clsx/cva — this project's node_modules
 * can't be added to offline, and a 6-line function covers every use here.
 * Falsy values are dropped so `cn("a", cond && "b")` reads naturally.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
