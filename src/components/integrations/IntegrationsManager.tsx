'use client';

import { useState, useEffect, useRef } from 'react';

interface IntegrationStatus {
  procore: {
    connected: boolean;
    connectedAt: string | null;
    lastSync: string | null;
    companyId: number | null;
  };
  buildertrend: {
    lastImport: string | null;
  };
  zapier: {
    active: boolean;
    webhookUrl: string;
  };
}

interface Company {
  id: number;
  name: string;
}

interface SyncResult {
  projectsCreated: number;
  projectsUpdated: number;
  permitsCreated: number;
  permitsUpdated: number;
  errors: string[];
}

interface ImportResult {
  projectsCreated: number;
  permitsCreated: number;
  skipped: number;
  errors: string[];
}

export function IntegrationsManager() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    const res = await fetch('/api/integrations/status');
    if (res.ok) {
      const data = await res.json();
      setStatus(data);
    }
  }

  async function loadCompanies() {
    const res = await fetch('/api/integrations/procore/companies');
    if (res.ok) {
      const data = await res.json();
      setCompanies(data);
    }
  }

  async function handleSync() {
    if (!selectedCompany) return;
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch('/api/integrations/procore/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selectedCompany }),
    });
    const data = await res.json();
    setSyncing(false);
    if (res.ok) {
      setSyncResult(data);
      fetchStatus();
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Procore? Synced data will remain.')) return;
    await fetch('/api/integrations/procore/disconnect', { method: 'DELETE' });
    setCompanies([]);
    setSelectedCompany(null);
    setSyncResult(null);
    fetchStatus();
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    setImportError('');

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/integrations/buildertrend/import', {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    setImporting(false);

    if (res.ok) {
      setImportResult(data);
    } else {
      setImportError(data.error ?? 'Import failed');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImport(file);
  }

  function copyWebhookUrl() {
    if (status?.zapier.webhookUrl) {
      navigator.clipboard.writeText(status.zapier.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function downloadTemplate() {
    const csv = [
      'Project Name,Project Status,Permit Name,Permit Type,Jurisdiction,Permit Number,Status,Submitted Date,Expiry Date,Budget,Notes',
      'Downtown Office Tower,active,Building Permit - Foundation,Building,Houston,BP-2024-001234,under-review,2024-01-15,2025-01-15,3200,Foundation review',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildertrend-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Procore Card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-orange-400">PC</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Procore</h2>
              <p className="text-xs text-muted mt-0.5">Sync projects and submittals from your Procore account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.procore.connected ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/30 rounded-full text-xs text-success font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface2 border border-border rounded-full text-xs text-muted font-medium">
                Not connected
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          {!status?.procore.connected ? (
            <a
              href="/api/integrations/procore/connect"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
            >
              Connect Procore
            </a>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted mb-1">Connected</p>
                  <p className="text-text">{status.procore.connectedAt ? new Date(status.procore.connectedAt).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Last Sync</p>
                  <p className="text-text">{status.procore.lastSync ? new Date(status.procore.lastSync).toLocaleString() : 'Never'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Company ID</p>
                  <p className="text-text">{status.procore.companyId ?? '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {companies.length === 0 ? (
                  <button
                    onClick={loadCompanies}
                    className="px-3 py-1.5 bg-surface2 border border-border text-sm text-text rounded-lg hover:border-accent/50 transition-colors"
                  >
                    Load Companies
                  </button>
                ) : (
                  <>
                    <select
                      value={selectedCompany ?? ''}
                      onChange={(e) => setSelectedCompany(Number(e.target.value))}
                      className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Select company…</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSync}
                      disabled={syncing || !selectedCompany}
                      className="px-3 py-1.5 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {syncing ? 'Syncing…' : 'Sync Now'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-sm text-danger hover:text-danger/80 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {syncResult && (
                <div className={`p-4 rounded-lg border text-sm ${syncResult.errors.length > 0 ? 'bg-warn/5 border-warn/20' : 'bg-success/5 border-success/20'}`}>
                  <p className="font-medium text-text mb-2">Sync Complete</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                    <span>Projects created: <strong className="text-text">{syncResult.projectsCreated}</strong></span>
                    <span>Projects updated: <strong className="text-text">{syncResult.projectsUpdated}</strong></span>
                    <span>Permits created: <strong className="text-text">{syncResult.permitsCreated}</strong></span>
                    <span>Permits updated: <strong className="text-text">{syncResult.permitsUpdated}</strong></span>
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-warn mb-1">{syncResult.errors.length} error(s):</p>
                      <ul className="text-xs text-muted list-disc list-inside">
                        {syncResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Buildertrend Card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">BT</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Buildertrend</h2>
              <p className="text-xs text-muted mt-0.5">Import projects and permits from a Buildertrend CSV export</p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Download template
          </button>
        </div>

        <div className="px-6 py-5">
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface2/50'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {importing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted">Importing…</p>
              </div>
            ) : (
              <>
                <p className="text-text text-sm font-medium">Drop CSV here or click to browse</p>
                <p className="text-xs text-muted mt-1">Max 5MB · CSV format only</p>
              </>
            )}
          </div>

          {importError && (
            <div className="mt-4 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              {importError}
            </div>
          )}

          {importResult && (
            <div className={`mt-4 p-4 rounded-lg border text-sm ${importResult.errors.length > 0 ? 'bg-warn/5 border-warn/20' : 'bg-success/5 border-success/20'}`}>
              <p className="font-medium text-text mb-2">Import Complete</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                <span>Projects created: <strong className="text-text">{importResult.projectsCreated}</strong></span>
                <span>Permits created: <strong className="text-text">{importResult.permitsCreated}</strong></span>
                <span>Skipped: <strong className="text-text">{importResult.skipped}</strong></span>
                <span>Errors: <strong className="text-text">{importResult.errors.length}</strong></span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-warn mb-1">Errors:</p>
                  <ul className="text-xs text-muted list-disc list-inside">
                    {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zapier Card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff4a00]/10 border border-[#ff4a00]/20 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: '#ff6b35' }}>ZP</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Zapier</h2>
              <p className="text-xs text-muted mt-0.5">Receive permit status updates via webhook from any Zapier automation</p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            status?.zapier.active
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-surface2 border-border text-muted'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status?.zapier.active ? 'bg-success' : 'bg-muted'}`} />
            {status?.zapier.active ? 'Active' : 'Not configured'}
          </span>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {!status?.zapier.active ? (
            <p className="text-sm text-muted">Set <code className="text-accent">ZAPIER_WEBHOOK_SECRET</code> in your environment to enable the webhook endpoint.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text font-mono break-all">
                    {status.zapier.webhookUrl}
                  </code>
                  <button
                    onClick={copyWebhookUrl}
                    className={`px-3 py-2 text-xs rounded-lg border transition-colors whitespace-nowrap ${
                      copied ? 'bg-success/10 border-success/30 text-success' : 'bg-surface2 border-border text-text hover:border-accent/50'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted">Webhook Secret</label>
                  <button
                    onClick={() => setSecretVisible((v) => !v)}
                    className="text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    {secretVisible ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <div className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs font-mono text-muted">
                  {secretVisible ? (process.env.NEXT_PUBLIC_ZAPIER_SECRET ?? '(set in .env.local)') : '••••••••••••••••••••••••••••••••'}
                </div>
                <p className="text-xs text-muted">Sign requests with <code className="text-accent">x-zapier-signature: sha256=HMAC(secret, body)</code></p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">Example payload</label>
                <pre className="px-4 py-3 bg-surface2 border border-border rounded-lg text-xs text-text font-mono overflow-x-auto">
{`{
  "permitId": "uuid-of-permit",
  "status": "approved",
  "notes": "Permit approved by AHJ"
}`}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
