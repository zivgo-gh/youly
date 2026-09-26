import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** For Server Components, Server Actions, and route handlers. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(URL(), KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — ignored. proxy.ts is what
          // actually refreshes the session cookie.
        }
      },
    },
  });
}

/**
 * For proxy.ts only.
 *
 * Proxy can't use `cookies()` from next/headers: that can only READ, and a
 * session refresh has to WRITE Set-Cookie onto the outgoing response. Hence the
 * response re-creation below — it is not incidental, it is the mechanism.
 */
export function createSupabaseProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(URL(), KEY(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, getResponse: () => response };
}
