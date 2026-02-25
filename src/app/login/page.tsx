import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
            <span className="text-bg font-bold text-lg">P</span>
          </div>
          <span className="text-2xl font-semibold text-text">PermitIQ</span>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-8">
          <h1 className="text-lg font-semibold text-text mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-6">Use your invite credentials to access your team.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Access is invite-only. Contact your team admin.
        </p>
      </div>
    </div>
  );
}
