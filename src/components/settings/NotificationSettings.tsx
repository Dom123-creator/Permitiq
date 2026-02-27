'use client';

import { useState, useEffect } from 'react';

const ALL_EVENTS = [
  { id: 'permit.status', label: 'Permit status changes', desc: 'Any permit moves to a new status' },
  { id: 'permit.approved', label: 'Permit approved', desc: 'When a permit is approved' },
  { id: 'inspection.fail', label: 'Inspection failed', desc: 'When an inspection fails (re-inspection needed)' },
  { id: 'inspection.result', label: 'Inspection results', desc: 'All inspection result updates' },
  { id: 'expiry', label: 'Permit expiry warnings', desc: '30, 14, 7, 3, 1 day warnings before expiry' },
  { id: 'deadline', label: 'Info-request deadlines', desc: 'When a deadline to respond is approaching' },
  { id: 'task.created', label: 'Task alerts', desc: 'Urgent tasks due today or assigned to you' },
  { id: 'daily.digest', label: 'Daily digest', desc: 'Morning summary at 8 AM' },
];

interface NotifPrefs {
  notificationChannel: string;
  notifyEvents: string[];
  telegramChatId: string;
  phoneNumber: string;
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notificationChannel: 'none',
    notifyEvents: ['permit.status', 'inspection.fail', 'expiry', 'daily.digest'],
    telegramChatId: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendTest, setSendTest] = useState(false);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data: NotifPrefs) => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleEvent = (eventId: string) => {
    setPrefs((prev) => ({
      ...prev,
      notifyEvents: prev.notifyEvents.includes(eventId)
        ? prev.notifyEvents.filter((e) => e !== eventId)
        : [...prev.notifyEvents, eventId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prefs, sendTest }),
      });
      setSaved(true);
      setSendTest(false);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--muted)' }}>
        Loading notification preferences…
      </div>
    );
  }

  const needsTelegram =
    prefs.notificationChannel === 'telegram' || prefs.notificationChannel === 'both';
  const needsSMS =
    prefs.notificationChannel === 'sms' || prefs.notificationChannel === 'both';

  return (
    <div style={{ maxWidth: 640, padding: '2rem' }}>
      <h2 style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        Notification Settings
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Get real-time permit alerts on the go — no screen required.
      </p>

      {/* Channel selector */}
      <section style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
          Notification channel
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
          {(['none', 'telegram', 'sms', 'both'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setPrefs((p) => ({ ...p, notificationChannel: ch }))}
              style={{
                padding: '0.625rem',
                borderRadius: 8,
                border: `1px solid ${prefs.notificationChannel === ch ? 'var(--accent)' : 'var(--border)'}`,
                background: prefs.notificationChannel === ch ? 'rgba(0,229,255,0.1)' : 'var(--surface)',
                color: prefs.notificationChannel === ch ? 'var(--accent)' : 'var(--muted)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                fontWeight: prefs.notificationChannel === ch ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {ch === 'none' ? '🔕 Off' : ch === 'telegram' ? '✈️ Telegram' : ch === 'sms' ? '📱 SMS' : '🔀 Both'}
            </button>
          ))}
        </div>
      </section>

      {/* Telegram setup */}
      {needsTelegram && (
        <section style={{
          marginBottom: '2rem',
          padding: '1rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            ✈️ Telegram Setup
          </h3>
          <ol style={{ color: 'var(--muted)', fontSize: '0.8125rem', paddingLeft: '1.25rem', marginBottom: '1rem', lineHeight: 1.7 }}>
            <li>Search <strong style={{ color: 'var(--text)' }}>@PermitIQBot</strong> on Telegram (or your configured bot)</li>
            <li>Send <code style={{ background: 'var(--surface2)', padding: '0 4px', borderRadius: 4 }}>/start</code></li>
            <li>The bot will reply with your Chat ID — paste it below</li>
          </ol>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
            Telegram Chat ID
          </label>
          <input
            type="text"
            value={prefs.telegramChatId}
            onChange={(e) => setPrefs((p) => ({ ...p, telegramChatId: e.target.value }))}
            placeholder="e.g. 123456789"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </section>
      )}

      {/* SMS setup */}
      {needsSMS && (
        <section style={{
          marginBottom: '2rem',
          padding: '1rem',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            📱 SMS Setup
          </h3>
          <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
            Phone number (E.164 format)
          </label>
          <input
            type="tel"
            value={prefs.phoneNumber}
            onChange={(e) => setPrefs((p) => ({ ...p, phoneNumber: e.target.value }))}
            placeholder="+15551234567"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
            Include country code: +1 for US numbers
          </p>
        </section>
      )}

      {/* Event subscriptions */}
      {prefs.notificationChannel !== 'none' && (
        <section style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
            Alert types
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ALL_EVENTS.map((ev) => {
              const checked = prefs.notifyEvents.includes(ev.id);
              return (
                <label
                  key={ev.id}
                  onClick={() => toggleEvent(ev.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    background: checked ? 'rgba(0,229,255,0.06)' : 'var(--surface)',
                    border: `1px solid ${checked ? 'rgba(0,229,255,0.25)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {checked && <span style={{ color: '#000', fontSize: 12, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 500 }}>{ev.label}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{ev.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Test message option */}
      {prefs.notificationChannel !== 'none' && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            marginBottom: '1.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={sendTest}
            onChange={(e) => setSendTest(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
          />
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Send a test message when I save
          </span>
        </label>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.625rem 1.5rem',
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
        {saved && (
          <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
            ✓ Saved
          </span>
        )}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '2rem',
        padding: '0.875rem 1rem',
        background: 'rgba(0,229,255,0.05)',
        border: '1px solid rgba(0,229,255,0.15)',
        borderRadius: 8,
        color: 'var(--muted)',
        fontSize: '0.8125rem',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--accent)' }}>How it works:</strong> The agent scans every 2 hours and sends
        push alerts for overdue permits, expiry warnings, deadline breaches, and urgent tasks.
        You get a daily digest at 8 AM. Inspection reminders fire at 7 PM the evening before.
        System events always go through regardless of event preferences.
      </div>
    </div>
  );
}
