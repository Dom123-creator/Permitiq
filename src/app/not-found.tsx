import Link from 'next/link';

export const metadata = { title: '404 — PermitIQ' };

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-sm">
        <div className="text-8xl font-bold text-border mb-4 select-none">404</div>
        <h1 className="text-xl font-semibold text-text mb-2">Page not found</h1>
        <p className="text-sm text-muted mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
