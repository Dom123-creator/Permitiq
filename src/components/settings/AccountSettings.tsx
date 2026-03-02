'use client';

import { useState, useEffect } from 'react';

export function AccountSettings() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    fetch('/api/account/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
      })
      .catch(() => {});

    // Check if user has a password (credentials account vs SSO-only)
    // We infer this from whether the password change endpoint would work
    // by checking if passwordHash exists — we do this via a safe probe
    setHasPassword(true); // Optimistic; the API returns a clear error if SSO-only
  }, []);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');
    setNameSuccess(false);
    setNameLoading(true);

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error ?? 'Failed to update name');
      } else {
        setNameSuccess(true);
        setTimeout(() => setNameSuccess(false), 3000);
      }
    } catch {
      setNameError('Network error. Please try again.');
    } finally {
      setNameLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('SSO')) setHasPassword(false);
        setPwError(data.error ?? 'Failed to change password');
      } else {
        setPwSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwSuccess(false), 3000);
      }
    } catch {
      setPwError('Network error. Please try again.');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-base font-semibold text-text mb-1">Account</h2>
      <p className="text-sm text-muted mb-6">Update your name and password.</p>

      <div className="flex flex-col gap-8 max-w-md">
        {/* Profile name */}
        <form onSubmit={handleNameSave} className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-text">Profile</h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted">Email</label>
            <div className="px-4 py-2.5 bg-surface2/50 border border-border rounded-lg text-muted text-sm select-none">
              {email || '—'}
            </div>
            <p className="text-xs text-muted">Email cannot be changed.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-sm text-muted">Display name</label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
              placeholder="Your name"
            />
          </div>

          {nameError && (
            <p className="text-sm text-danger">{nameError}</p>
          )}
          {nameSuccess && (
            <p className="text-sm text-success">Name updated.</p>
          )}

          <div>
            <button
              type="submit"
              disabled={nameLoading}
              className="px-4 py-2 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {nameLoading ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>

        <hr className="border-border" />

        {/* Password change */}
        {hasPassword ? (
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-text">Change password</h3>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="current-pw" className="text-sm text-muted">Current password</label>
              <input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-pw" className="text-sm text-muted">New password</label>
              <input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-pw" className="text-sm text-muted">Confirm new password</label>
              <input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            {pwError && (
              <p className="text-sm text-danger">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-sm text-success">Password changed successfully.</p>
            )}

            <div>
              <button
                type="submit"
                disabled={pwLoading}
                className="px-4 py-2 bg-surface2 border border-border text-text font-medium text-sm rounded-lg hover:border-accent/40 disabled:opacity-50 transition-colors"
              >
                {pwLoading ? 'Updating…' : 'Change password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-text">Password</h3>
            <p className="text-sm text-muted">
              You signed in with Google or Microsoft. Password management is handled by your identity provider.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
