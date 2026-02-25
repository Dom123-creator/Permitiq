'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  email: string;
  role: string;
}

export function AcceptInviteForm({ token, email, role }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    const res = await fetch('/api/team/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to accept invite.');
      setLoading(false);
      return;
    }

    // Sign in automatically
    await signIn('credentials', { email: data.email, password, redirect: false });
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">Email</label>
        <div className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-muted text-sm">
          {email}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">Role</label>
        <div className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-muted text-sm capitalize">
          {role}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm text-muted">Your Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent placeholder:text-muted"
          placeholder="Jane Smith"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-muted">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
          placeholder="Min 8 characters"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm text-muted">Confirm Password</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
          placeholder="Repeat password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-4 py-2.5 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Setting up account…' : 'Accept Invite & Sign In'}
      </button>
    </form>
  );
}
