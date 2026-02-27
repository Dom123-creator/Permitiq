import { NextRequest, NextResponse } from 'next/server';

// /api/v1/* uses Bearer token auth handled inside route handlers (not cookies)
// /api/settings/branding GET is public (used by login page before auth)
const PUBLIC_PATHS = ['/login', '/invite', '/api/auth', '/api/v1', '/api/settings/branding', '/api/telegram/webhook'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Simple cookie-based auth guard.
 * NextAuth v5 stores the session as a JWT in `authjs.session-token` (dev)
 * or `__Secure-authjs.session-token` (production HTTPS).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Check for NextAuth session cookie (either dev or production name)
  const sessionToken =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token');

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
