import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — no Node.js native modules.
 * Used by middleware.ts. Full auth (with DB/bcrypt) lives in src/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login', error: '/login' },
  providers: [], // populated in auth.ts (Credentials needs Node.js)
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const pathname = nextUrl.pathname;

      // Always allow public paths
      if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/invite') ||
        pathname.startsWith('/api/auth')
      ) {
        return true;
      }

      // Redirect unauthenticated users to /login
      if (!isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
};
