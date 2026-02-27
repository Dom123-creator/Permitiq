'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Permits', href: '/permits' },
  { name: 'Inspections', href: '/inspections' },
  { name: 'Costs', href: '/costs' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Markets', href: '/markets' },
  { name: 'Emails', href: '/emails' },
  { name: 'Tasks', href: '/tasks' },
  { name: 'Rules', href: '/rules' },
  { name: 'Audit', href: '/audit' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-accent',
  admin: 'text-purple',
  pm: 'text-success',
  superintendent: 'text-warn',
  teammate: 'text-muted',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

type Branding = { companyName: string; primaryColor: string; logoUrl: string | null };

function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>({ companyName: 'PermitIQ', primaryColor: '#00e5ff', logoUrl: null });
  useEffect(() => {
    fetch('/api/settings/branding')
      .then((r) => r.json())
      .then((d) => setBranding(d))
      .catch(() => {});
  }, []);
  return branding;
}

function BrandedLogo({ branding }: { branding: Branding }) {
  if (branding.logoUrl) {
    // For R2 keys, we'd need a presigned URL — show fallback with key name instead
    return (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: branding.primaryColor }}
        >
          <span className="text-bg font-bold text-sm">{branding.companyName.charAt(0).toUpperCase()}</span>
        </div>
        <span className="text-lg md:text-xl font-semibold text-text">{branding.companyName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <span className="text-bg font-bold text-sm">{branding.companyName.charAt(0).toUpperCase()}</span>
      </div>
      <span className="text-lg md:text-xl font-semibold text-text">{branding.companyName}</span>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const branding = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const isOwner = session?.user?.role === 'owner';
  const isAdminOrOwner = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  const allNavItems = [
    ...navItems,
    ...(isAdminOrOwner
      ? [
          { name: 'Team', href: '/team' },
          { name: 'Integrations', href: '/integrations' },
          { name: 'Developer', href: '/developer' },
        ]
      : []),
    ...(isOwner ? [{ name: 'Settings', href: '/settings' }] : []),
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push('/login');
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors"
            onClick={() => setNavOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {navOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <BrandedLogo branding={branding} />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-surface2 text-accent'
                  : 'text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              {item.name}
            </Link>
          ))}
          {isAdminOrOwner && (
            <>
              <Link
                href="/team"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/team' ? 'bg-surface2 text-accent' : 'text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                Team
              </Link>
              <Link
                href="/integrations"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/integrations' ? 'bg-surface2 text-accent' : 'text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                Integrations
              </Link>
              <Link
                href="/developer"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/developer' ? 'bg-surface2 text-accent' : 'text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                Developer
              </Link>
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface2 rounded-full border border-border">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs text-muted">Agent Active</span>
          </div>
          <div className="text-xs text-muted hidden xl:block">
            Next scan: <span className="text-text">Tue 9:00 AM</span>
          </div>

          {/* User menu */}
          {session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent">
                  {getInitials(session.user.name ?? session.user.email ?? 'U')}
                </div>
                <span className="text-sm text-text hidden lg:block">{session.user.name?.split(' ')[0]}</span>
                <svg className="w-3 h-3 text-muted hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-text">{session.user.name}</p>
                    <p className="text-xs text-muted mt-0.5">{session.user.email}</p>
                    <span className={`text-xs font-medium mt-1 inline-block ${ROLE_COLORS[session.user.role] ?? 'text-muted'}`}>
                      {session.user.role}
                    </span>
                  </div>
                  <div className="py-1">
                    {isAdminOrOwner && (
                      <>
                        <Link
                          href="/team"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface2 transition-colors"
                        >
                          Team
                        </Link>
                        <Link
                          href="/integrations"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface2 transition-colors"
                        >
                          Integrations
                        </Link>
                        <Link
                          href="/developer"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface2 transition-colors"
                        >
                          Developer
                        </Link>
                      </>
                    )}
                    {isOwner && (
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface2 transition-colors"
                      >
                        Settings
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-surface2 transition-colors text-left"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="lg:hidden border-t border-border bg-surface shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-surface2 text-accent'
                    : 'text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
