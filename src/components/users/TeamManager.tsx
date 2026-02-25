'use client';

import { useState, useEffect } from 'react';

const ROLES = ['owner', 'admin', 'pm', 'superintendent', 'teammate'] as const;
type Role = (typeof ROLES)[number];

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  projects: Array<{ projectId: string; projectName: string }>;
}

interface Project {
  id: string;
  name: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-accent border-accent/30 bg-accent/10',
  admin: 'text-purple border-purple/30 bg-purple/10',
  pm: 'text-success border-success/30 bg-success/10',
  superintendent: 'text-warn border-warn/30 bg-warn/10',
  teammate: 'text-muted border-border bg-surface2',
};

export function TeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('pm');
  const [inviteProjects, setInviteProjects] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/team/members').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([m, p]) => {
      setMembers(m);
      setProjects(p);
      setLoading(false);
    });
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, projectIds: inviteProjects }),
    });
    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setInviteResult({ error: data.error });
    } else {
      setInviteResult({ url: data.inviteUrl });
      setInviteEmail('');
      setInviteProjects([]);
      // Re-fetch members
      fetch('/api/team/members').then((r) => r.json()).then(setMembers);
    }
  }

  async function updateMember(id: string, patch: { role?: string; isActive?: boolean }) {
    const res = await fetch(`/api/team/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      fetch('/api/team/members').then((r) => r.json()).then(setMembers);
    }
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/team/members/${id}`, { method: 'DELETE' });
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function resendInvite(id: string) {
    const res = await fetch('/api/team/invite/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    });
    const data = await res.json();
    if (data.inviteUrl) {
      alert(`New invite URL (dev):\n${data.inviteUrl}`);
    }
  }

  const activeMembers = members.filter((m) => m.isActive);
  const pendingInvites = members.filter((m) => !m.isActive);

  if (loading) {
    return <div className="text-muted text-sm p-8">Loading team…</div>;
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Invite Form */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-text mb-4">Invite Team Member</h2>
        <form onSubmit={sendInvite} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="user@company.com"
                className="px-3 py-2 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent placeholder:text-muted"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="px-3 py-2 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Project assignment (for non-admin roles) */}
          {inviteRole !== 'owner' && inviteRole !== 'admin' && projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Assign to projects (optional)</label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface2 border border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={inviteProjects.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInviteProjects((prev) => [...prev, p.id]);
                        } else {
                          setInviteProjects((prev) => prev.filter((id) => id !== p.id));
                        }
                      }}
                      className="accent-accent"
                    />
                    <span className="text-xs text-text">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {inviteResult && (
            <div className={`px-4 py-3 rounded-lg text-sm border ${inviteResult.error ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-success/10 border-success/30 text-success'}`}>
              {inviteResult.error ? inviteResult.error : (
                <>
                  Invite sent!{' '}
                  <span className="text-xs text-muted ml-1">(Dev) URL: </span>
                  <span className="text-xs break-all text-text">{inviteResult.url}</span>
                </>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Members */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">Team Members ({activeMembers.length})</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-6 py-3 text-left font-medium">Name</th>
              <th className="px-6 py-3 text-left font-medium">Email</th>
              <th className="px-6 py-3 text-left font-medium">Role</th>
              <th className="px-6 py-3 text-left font-medium">Projects</th>
              <th className="px-6 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member) => (
              <tr key={member.id} className="border-b border-border/50 hover:bg-surface2/50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent">
                      {member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-sm text-text">{member.name}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-muted">{member.email}</td>
                <td className="px-6 py-3">
                  <select
                    value={member.role}
                    onChange={(e) => updateMember(member.id, { role: e.target.value })}
                    className={`px-2 py-1 text-xs rounded border bg-transparent font-medium cursor-pointer focus:outline-none ${ROLE_COLORS[member.role] ?? 'text-muted border-border'}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-surface text-text">{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-3">
                  {member.projects.length > 0 ? (
                    <span className="text-xs text-muted">{member.projects.map((p) => p.projectName).join(', ')}</span>
                  ) : (
                    <span className="text-xs text-muted italic">All projects</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => updateMember(member.id, { isActive: false })}
                    className="text-xs text-danger hover:text-danger/80 transition-colors"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {activeMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">No active team members yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text">Pending Invites ({pendingInvites.length})</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Role</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((invite) => (
                <tr key={invite.id} className="border-b border-border/50">
                  <td className="px-6 py-3 text-sm text-muted">{invite.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded border font-medium ${ROLE_COLORS[invite.role] ?? ''}`}>
                      {invite.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 flex items-center gap-4">
                    <button
                      onClick={() => resendInvite(invite.id)}
                      className="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      className="text-xs text-danger hover:text-danger/80 transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
