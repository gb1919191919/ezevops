import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * SECURITY: Server-side authentication middleware.
 * This runs BEFORE any page or API route is rendered, ensuring:
 * 1. Unauthenticated users cannot access protected pages (even with JS disabled)
 * 2. Session cookies are refreshed on every request
 * 3. JWT is validated server-side via getUser() (not just read from cookies)
 *
 * Fixes CRIT-01: Previously there was no middleware, and all auth was client-side only.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase env vars are not configured, allow request to pass through
  // (the app will show errors from the client-side Supabase initialization)
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Set cookie on both the request (for downstream server code) and the response
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // SECURITY: Use getUser() to validate the JWT with the Supabase Auth server.
  // Do NOT use getSession() here — it only reads from cookies without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow unauthenticated access to login page, API callback routes, and static assets
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/');

  if (!user && !isPublicPath) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to visit login, redirect to home
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

/**
 * Matcher: Apply middleware to all routes except static assets and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png, apple-icon.png (browser icons)
     * - site.webmanifest (PWA manifest)
     * - public assets (images, fonts)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|apple-touch-icon\\.png|site\\.webmanifest|favicon-.*\\.png$).*)',
  ],
};
