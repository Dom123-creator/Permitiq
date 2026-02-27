'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

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
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Password updated</h1>
              <p className="text-sm text-muted">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-text mb-1">Set a new password</h1>
              <p className="text-sm text-muted mb-6">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm text-muted">New password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                    className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm" className="text-sm text-muted">Confirm password</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 px-4 py-2.5 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving…' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-muted mt-6">
            <Link href="/login" className="text-accent hover:underline">
              ← Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
