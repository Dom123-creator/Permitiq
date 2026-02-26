'use client';

import { useState, useEffect, useCallback } from 'react';

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type Webhook = {
  id: string;
  url: string;
  events: string;
  active: boolean;
  failureCount: number;
  lastDeliveryAt: string | null;
  createdAt: string;
};

type Delivery = {
  id: string;
  event: string;
  responseStatus: number | null;
  success: boolean;
  attemptedAt: string;
  payload: string;
  responseBody: string | null;
};

const ALL_EVENTS = [
  'permit.updated',
  'permit.approved',
  'permit.archived',
  'task.created',
  'task.completed',
  'inspection.result',
];

export function DeveloperPortal() {
  const [tab, setTab] = useState<'keys' | 'webhooks'>('keys');

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<'read' | 'read,write'>('read');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyCreating, setKeyCreating] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['permit.updated']);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [webhookCreating, setWebhookCreating] = useState(false);
  const [deliveriesWebhookId, setDeliveriesWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/developer/keys');
      if (res.ok) setKeys(await res.json());
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch('/api/developer/webhooks');
      if (res.ok) setWebhooks(await res.json());
    } finally {
      setWebhooksLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);
  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setKeyCreating(true);
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.key);
        setNewKeyName('');
        await loadKeys();
      }
    } finally {
      setKeyCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await fetch(`/api/developer/keys/${id}`, { method: 'DELETE' });
    await loadKeys();
  }

  async function createWebhook() {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    setWebhookCreating(true);
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newWebhookUrl.trim(), events: newWebhookEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedWebhookSecret(data.secret);
        setNewWebhookUrl('');
        setNewWebhookEvents(['permit.updated']);
        await loadWebhooks();
      }
    } finally {
      setWebhookCreating(false);
    }
  }

  async function toggleWebhook(id: string, active: boolean) {
    await fetch(`/api/developer/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await loadWebhooks();
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/developer/webhooks/${id}`, { method: 'DELETE' });
    await loadWebhooks();
  }

  async function loadDeliveries(webhookId: string) {
    setDeliveriesWebhookId(webhookId);
    setDeliveriesLoading(true);
    try {
      const res = await fetch(`/api/developer/webhooks/${webhookId}/deliveries`);
      if (res.ok) setDeliveries(await res.json());
    } finally {
      setDeliveriesLoading(false);
    }
  }

  function toggleEvent(event: string) {
    setNewWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Developer Portal</h1>
        <p className="text-muted text-sm mt-1">Manage API keys and webhook subscriptions for external integrations.</p>
      </div>

      {/* Base URL card */}
      <div className="bg-surface2 border border-border rounded-xl p-4 mb-6">
        <p className="text-xs text-muted mb-1">Base URL</p>
        <code className="text-accent text-sm font-mono">
          {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/
        </code>
        <p className="text-xs text-muted mt-2">
          Authenticate with: <code className="text-text bg-surface px-1.5 py-0.5 rounded">Authorization: Bearer piq_...</code>
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-surface2 p-1 rounded-lg w-fit">
        {(['keys', 'webhooks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-surface text-accent' : 'text-muted hover:text-text'
            }`}
          >
            {t === 'keys' ? 'API Keys' : 'Webhooks'}
          </button>
        ))}
      </div>

      {/* API KEYS TAB */}
      {tab === 'keys' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">API Keys</h2>
            <button
              onClick={() => { setShowCreateKey(true); setCreatedKey(null); }}
              className="px-3 py-1.5 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
            >
              + Generate Key
            </button>
          </div>

          {/* New key showed once */}
          {createdKey && (
            <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl">
              <p className="text-success text-sm font-semibold mb-2">Copy your API key — it won't be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-text text-sm font-mono bg-surface px-3 py-2 rounded-lg break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdKey)}
                  className="px-3 py-2 bg-surface2 border border-border text-sm text-text rounded-lg hover:border-accent/40 transition-colors flex-shrink-0"
                >
                  Copy
                </button>
              </div>
              <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-muted hover:text-text">
                Dismiss
              </button>
            </div>
          )}

          {/* Create key form */}
          {showCreateKey && !createdKey && (
            <div className="mb-4 p-4 bg-surface2 border border-border rounded-xl">
              <h3 className="text-sm font-semibold text-text mb-3">New API Key</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Key name (e.g. Procore Integration)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  {(['read', 'read,write'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewKeyScopes(s)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        newKeyScopes === s
                          ? 'bg-accent/10 border-accent/50 text-accent'
                          : 'bg-surface border-border text-muted hover:text-text'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createKey}
                    disabled={keyCreating || !newKeyName.trim()}
                    className="px-3 py-1.5 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    {keyCreating ? 'Creating…' : 'Create Key'}
                  </button>
                  <button
                    onClick={() => setShowCreateKey(false)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Keys table */}
          {keysLoading ? (
            <div className="text-muted text-sm py-8 text-center">Loading…</div>
          ) : keys.length === 0 ? (
            <div className="text-muted text-sm py-8 text-center">No API keys yet. Generate one to get started.</div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Key</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Scope</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Last Used</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text font-medium">{k.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-muted font-mono">{k.keyPrefix}{'*'.repeat(26)}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          k.scopes === 'read,write' ? 'bg-warn/10 text-warn' : 'bg-accent/10 text-accent'
                        }`}>
                          {k.scopes}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-muted">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {k.revokedAt ? (
                          <span className="text-xs text-danger">Revoked</span>
                        ) : (
                          <button
                            onClick={() => revokeKey(k.id)}
                            className="text-xs text-danger hover:text-danger/70 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {tab === 'webhooks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Webhooks</h2>
            <button
              onClick={() => { setShowCreateWebhook(true); setCreatedWebhookSecret(null); }}
              className="px-3 py-1.5 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
            >
              + Register Webhook
            </button>
          </div>

          {/* Secret shown once */}
          {createdWebhookSecret && (
            <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl">
              <p className="text-success text-sm font-semibold mb-2">Webhook registered — copy your signing secret</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-text text-sm font-mono bg-surface px-3 py-2 rounded-lg break-all">
                  {createdWebhookSecret}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdWebhookSecret)}
                  className="px-3 py-2 bg-surface2 border border-border text-sm text-text rounded-lg hover:border-accent/40 transition-colors flex-shrink-0"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-muted mt-2">
                Use this secret to verify <code className="text-text">x-permitiq-signature</code> on incoming events.
              </p>
              <button onClick={() => setCreatedWebhookSecret(null)} className="mt-2 text-xs text-muted hover:text-text">
                Dismiss
              </button>
            </div>
          )}

          {/* Create webhook form */}
          {showCreateWebhook && !createdWebhookSecret && (
            <div className="mb-4 p-4 bg-surface2 border border-border rounded-xl">
              <h3 className="text-sm font-semibold text-text mb-3">Register Webhook</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                />
                <div>
                  <p className="text-xs text-muted mb-2">Events to subscribe:</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_EVENTS.map((ev) => (
                      <button
                        key={ev}
                        onClick={() => toggleEvent(ev)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          newWebhookEvents.includes(ev)
                            ? 'bg-accent/10 border-accent/50 text-accent'
                            : 'bg-surface border-border text-muted hover:text-text'
                        }`}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createWebhook}
                    disabled={webhookCreating || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
                    className="px-3 py-1.5 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    {webhookCreating ? 'Registering…' : 'Register'}
                  </button>
                  <button
                    onClick={() => setShowCreateWebhook(false)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks list */}
          {webhooksLoading ? (
            <div className="text-muted text-sm py-8 text-center">Loading…</div>
          ) : webhooks.length === 0 ? (
            <div className="text-muted text-sm py-8 text-center">No webhooks yet. Register one to receive events.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {webhooks.map((wh) => {
                const events: string[] = (() => { try { return JSON.parse(wh.events); } catch { return []; } })();
                const isExpanded = deliveriesWebhookId === wh.id;
                return (
                  <div key={wh.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.active ? 'bg-success' : 'bg-danger'}`} />
                            <code className="text-text text-sm font-mono truncate">{wh.url}</code>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {events.map((ev) => (
                              <span key={ev} className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">
                                {ev}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                            <span>{wh.failureCount} failures</span>
                            {wh.lastDeliveryAt && (
                              <span>Last delivery: {new Date(wh.lastDeliveryAt).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleWebhook(wh.id, !wh.active)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              wh.active
                                ? 'bg-success/10 border-success/30 text-success'
                                : 'bg-surface2 border-border text-muted'
                            }`}
                          >
                            {wh.active ? 'Active' : 'Paused'}
                          </button>
                          <button
                            onClick={() => isExpanded ? setDeliveriesWebhookId(null) : loadDeliveries(wh.id)}
                            className="px-2.5 py-1 text-xs bg-surface2 border border-border rounded-lg text-muted hover:text-text transition-colors"
                          >
                            {isExpanded ? 'Hide Log' : 'View Log'}
                          </button>
                          <button
                            onClick={() => deleteWebhook(wh.id)}
                            className="px-2.5 py-1 text-xs text-danger hover:text-danger/70 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delivery log */}
                    {isExpanded && (
                      <div className="border-t border-border bg-surface2">
                        {deliveriesLoading ? (
                          <div className="px-4 py-4 text-muted text-sm">Loading…</div>
                        ) : deliveries.length === 0 ? (
                          <div className="px-4 py-4 text-muted text-sm">No deliveries yet.</div>
                        ) : (
                          <div className="divide-y divide-border">
                            {deliveries.map((d) => (
                              <div key={d.id} className="px-4 py-3 flex items-center gap-4">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.success ? 'bg-success' : 'bg-danger'}`} />
                                <span className="text-xs text-muted w-20 flex-shrink-0">
                                  {d.responseStatus ?? '–'}
                                </span>
                                <span className="text-xs text-accent font-mono flex-shrink-0">{d.event}</span>
                                <span className="text-xs text-muted flex-1 truncate">
                                  {new Date(d.attemptedAt).toLocaleString()}
                                </span>
                                {d.responseBody && (
                                  <span className="text-xs text-muted truncate max-w-xs">{d.responseBody}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
