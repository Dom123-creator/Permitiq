import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DrizzleAdapter } = require('@auth/drizzle-adapter');
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  // Lazily get the adapter — only called at runtime, not at module load
  // The adapter handles OAuth account linking (Google/Microsoft → users table)
  get adapter() {
    return DrizzleAdapter(getDb());
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            // tenantId can be configured via AZURE_AD_TENANT_ID env var
            // Default issuer is the 'common' endpoint for multi-tenant
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID ?? 'common'}/v2.0`,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const db = getDb();
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          if (!user || !user.isActive || !user.passwordHash) return null;

          const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
          if (!valid) return null;

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure the user row has required defaults
      if (
        (account?.provider === 'google' || account?.provider === 'microsoft-entra-id') &&
        user?.id
      ) {
        try {
          const db = getDb();
          await db
            .update(users)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        } catch {
          // Non-blocking
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'teammate';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
