import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessModule, homeFor, isValidRole, type Role } from "@/lib/roles";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, skip the auth refresh and pass through.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  try {
    let response = supabaseResponse;
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const path = request.nextUrl.pathname;

    // PWA assets must be reachable without a session — browsers fetch the
    // manifest and service worker script without auth cookies.
    if (
      path === "/sw.js" ||
      path === "/manifest.webmanifest" ||
      path.startsWith("/icons/")
    ) {
      return supabaseResponse;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = path === "/login" || path.startsWith("/auth");

    // Carry refreshed session cookies onto any redirect we issue
    const redirectTo = (target: string) => {
      const redirect = NextResponse.redirect(new URL(target, request.url));
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    };

    if (!user) {
      return isLoginPage ? response : redirectTo("/login");
    }

    // profiles is the source of truth for role and activation, so Director
    // changes take effect on the user's next request — no re-login needed.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.active === false) {
      await supabase.auth.signOut();
      return redirectTo("/login?deactivated=1");
    }

    const role: Role = isValidRole(profile?.role) ? profile.role : "site_supervisor";

    if (isLoginPage) return redirectTo(homeFor(role));

    const segment = path.split("/")[1] ?? "";
    if (!canAccessModule(role, segment)) return redirectTo(homeFor(role));

    return response;
  } catch {
    // Never let an auth hiccup crash the entire edge middleware
    return supabaseResponse;
  }
}
