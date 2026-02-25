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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
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
