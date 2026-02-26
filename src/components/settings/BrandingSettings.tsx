'use client';

import { useState, useEffect, useRef } from 'react';

type Branding = {
  companyName: string;
  primaryColor: string;
  logoUrl: string | null;
};

const PRESET_COLORS = [
  { label: 'Cyan', value: '#00e5ff' },
  { label: 'Purple', value: '#a78bfa' },
  { label: 'Orange', value: '#ff6b35' },
  { label: 'Green', value: '#00c896' },
  { label: 'Red', value: '#ff3d5a' },
];

function hexToSafeCSS(hex: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#00e5ff';
}

export function BrandingSettings() {
  const [branding, setBranding] = useState<Branding>({ companyName: 'PermitIQ', primaryColor: '#00e5ff', logoUrl: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings/branding')
      .then((r) => r.json())
      .then((data) => {
        setBranding(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: branding.companyName,
          primaryColor: branding.primaryColor,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to save');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await fetch('/api/settings/branding/logo', { method: 'POST', body: form });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to upload logo');
      } else {
        const d = await res.json();
        setBranding((prev) => ({ ...prev, logoUrl: d.logoUrl }));
      }
    } finally {
      setLogoUploading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-muted text-sm">Loading branding settings…</div>;
  }

  const previewColor = hexToSafeCSS(branding.primaryColor);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text mb-2">Branding</h1>
      <p className="text-muted text-sm mb-8">Customize how PermitIQ appears across your organization.</p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* Company Name */}
        <div>
          <label className="text-sm font-medium text-text block mb-2">Company Name</label>
          <input
            type="text"
            value={branding.companyName}
            onChange={(e) => setBranding((prev) => ({ ...prev, companyName: e.target.value }))}
            maxLength={100}
            className="w-full px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:outline-none focus:border-accent"
            placeholder="Your Company Name"
          />
          <p className="text-xs text-muted mt-1">Appears in the header, browser tab, and email notifications.</p>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="text-sm font-medium text-text block mb-2">Logo</label>
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleLogoUpload(file);
            }}
          >
            {logoUploading ? (
              <p className="text-muted text-sm">Uploading…</p>
            ) : branding.logoUrl ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-success text-sm">Logo uploaded</span>
                <span className="text-xs text-muted">{branding.logoUrl.split('/').pop()}</span>
                <span className="text-xs text-muted">Click to replace</span>
              </div>
            ) : (
              <div>
                <p className="text-muted text-sm">Drop your logo here or click to browse</p>
                <p className="text-xs text-muted mt-1">PNG, JPEG, SVG, or WebP — max 2MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="text-sm font-medium text-text block mb-3">Primary Accent Color</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((p) => (
              <button
                key={p.value}
                onClick={() => setBranding((prev) => ({ ...prev, primaryColor: p.value }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  branding.primaryColor === p.value
                    ? 'border-accent/60 bg-surface'
                    : 'border-border bg-surface2 hover:border-border/60'
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.value }} />
                <span className="text-text">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-border bg-surface2 cursor-pointer"
            />
            <input
              type="text"
              value={branding.primaryColor}
              onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
              maxLength={7}
              className="w-32 px-3 py-2 bg-surface2 border border-border rounded-lg text-text text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="#00e5ff"
            />
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="text-sm font-medium text-text block mb-2">Preview</label>
          <div className="bg-surface border rounded-xl overflow-hidden" style={{ borderColor: '#1e2a3d' }}>
            {/* Mini header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b" style={{ borderColor: '#1e2a3d' }}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-bg font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: previewColor }}
              >
                {branding.companyName.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-text">{branding.companyName || 'Your Company'}</span>
              <div className="ml-auto flex gap-2">
                {['Dashboard', 'Permits', 'Tasks'].map((n) => (
                  <span key={n} className="px-2 py-1 text-xs text-muted rounded">
                    {n}
                  </span>
                ))}
              </div>
            </div>
            {/* Mini content */}
            <div className="p-4 flex gap-3">
              {['Active', 'Pending', 'Approved'].map((label, i) => (
                <div key={label} className="flex-1 bg-surface2 rounded-lg p-3 border" style={{ borderColor: '#1e2a3d', borderTopColor: i === 0 ? previewColor : '#1e2a3d', borderTopWidth: i === 0 ? 2 : 1 }}>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-lg font-bold" style={{ color: i === 0 ? previewColor : '#e8edf5' }}>{12 - i * 3}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-accent text-bg font-semibold text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: previewColor }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span className="text-success text-sm">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
