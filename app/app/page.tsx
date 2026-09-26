import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";
import { getConsent } from "@/lib/consent";

/**
 * The authenticated entry point. Renders no UI — it only decides where you go.
 *
 * This router is allowed to make ONLY positive, safe decisions. Everything
 * ambiguous or failed falls through to /app/start, which runs the legacy
 * migration first and then uses lib/resolve-profile.
 *
 * Why that matters: lib/migrate.ts can recover a missing `profiles` row from the
 * local cache or the legacy profile_backups table. If this page treated "no
 * profiles row" as "new user" and sent them to onboarding, it would resurrect the
 * bug fixed in acca50c and overwrite a real user's data. So "no row" is NOT a
 * decision this page is permitted to make.
 */
export default async function AppEntryPage() {
  const { supabase, user } = await getSessionUser();

  // proxy.ts already gates /app/*, so this is a second line of defence.
  if (!user) redirect("/login?next=/app");

  const consent = await getConsent(supabase, user.id);

  // An unreadable consent row is not an absent one — never re-gate on an outage.
  if (consent.status === "error") redirect("/app/start");
  if (consent.status === "missing" || consent.status === "stale") {
    redirect("/app/consent");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .maybeSingle();

  // The single fast path: a positively confirmed, completed profile.
  if (!error && data?.onboarding_complete === true) redirect("/app/chat");

  return redirect("/app/start");
}
