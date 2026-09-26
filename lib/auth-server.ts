import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase-server";

/**
 * Server-side data access layer for identity.
 *
 * Why this exists: `api/` is deliberately excluded from the proxy matcher, so
 * proxy.ts does NOT authenticate API routes. Every route handler must
 * authenticate itself, and this is the one place that knows how.
 *
 * Wrapped in React `cache()` so a single render pass makes a single auth call
 * no matter how many components ask.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // A failed auth *check* is not the same as "signed out". Callers must be able
  // to tell them apart — treating an outage as a sign-out is how users get
  // bounced into onboarding and have their data overwritten.
  return { supabase, user: user ?? null, error: error ?? null };
});

/** For Server Components. Redirects to /login when there is no session. */
export async function requireUser() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");
  return { supabase, uid: user.id, user };
}

export type ApiAuth =
  | { ok: true; supabase: SupabaseClient; uid: string; email?: string }
  | { ok: false; response: NextResponse };

/** For route handlers. Returns a 401 response instead of redirecting. */
export async function requireApiUser(): Promise<ApiAuth> {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, supabase, uid: user.id, email: user.email };
}
