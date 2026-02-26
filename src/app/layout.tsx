import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PermitIQ - AI-Powered Permit Tracking',
  description: 'Construction permit tracking and management SaaS with AI-powered automation',
};

function sanitizeHex(color: string | null | undefined): string {
  if (!color) return '#00e5ff';
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00e5ff';
}

async function getBranding(): Promise<{ companyName: string; primaryColor: string; logoUrl: string | null }> {
  try {
    const { getDb, workspaceSettings } = await import('@/lib/db');
    const db = getDb();
    const rows = await db.select().from(workspaceSettings).limit(1);
    if (rows.length > 0) {
      return {
        companyName: rows[0].companyName,
        primaryColor: sanitizeHex(rows[0].primaryColor),
        logoUrl: rows[0].logoUrl ?? null,
      };
    }
  } catch {
    // DB not ready yet — use defaults
  }
  return { companyName: 'PermitIQ', primaryColor: '#00e5ff', logoUrl: null };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, branding] = await Promise.all([auth(), getBranding()]);

  const accentColor = sanitizeHex(branding.primaryColor);

  return (
    <html lang="en">
      <head>
        <title>{branding.companyName} — AI-Powered Permit Tracking</title>
        {/* Inject brand accent color as CSS variable override */}
        <style>{`:root { --accent: ${accentColor}; }`}</style>
      </head>
      <body className={inter.className}>
        <SessionProvider session={session}>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
