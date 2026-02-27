'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
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
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Check your email</h1>
              <p className="text-sm text-muted mb-6">
                If an account exists for <strong className="text-text">{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <p className="text-xs text-muted">
                The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-text mb-1">Forgot your password?</h1>
              <p className="text-sm text-muted mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm text-muted">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent placeholder:text-muted"
                    placeholder="you@company.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 px-4 py-2.5 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          <Link href="/login" className="text-accent hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
