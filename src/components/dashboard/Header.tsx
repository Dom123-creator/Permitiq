'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Permits', href: '/permits' },
  { name: 'Inspections', href: '/inspections' },
  { name: 'Costs', href: '/costs' },
  { name: 'Emails', href: '/emails' },
  { name: 'Tasks', href: '/tasks' },
  { name: 'Rules', href: '/rules' },
  { name: 'Audit', href: '/audit' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-bg font-bold text-sm">P</span>
          </div>
          <span className="text-xl font-semibold text-text">PermitIQ</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-surface2 text-accent'
                  : 'text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Agent Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface2 rounded-full border border-border">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs text-muted">Agent Active</span>
          </div>
          <div className="text-xs text-muted">
            Next scan: <span className="text-text">Tue 9:00 AM</span>
          </div>
        </div>
      </div>
    </header>
  );
}
