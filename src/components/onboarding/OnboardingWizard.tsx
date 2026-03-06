'use client';

import { useState } from 'react';

type Step = 'welcome' | 'project' | 'permit' | 'notifications' | 'complete';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const PERMIT_TYPES = ['Building', 'Electrical', 'Plumbing', 'Mechanical', 'Fire'];
const JURISDICTIONS = ['Houston', 'Harris County', 'Austin', 'Dallas', 'San Antonio'];

const NOTIFICATION_CHANNELS = [
  { value: 'none', label: 'Off', icon: '🔕' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'both', label: 'Both', icon: '🔀' },
] as const;

const DEFAULT_EVENTS = [
  { id: 'permit.status', label: 'Permit status changes' },
  { id: 'inspection.fail', label: 'Inspection failures' },
  { id: 'expiry', label: 'Permit expiry warnings' },
  { id: 'daily.digest', label: 'Daily digest (8 AM)' },
];

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current
              ? 'bg-accent flex-1'
              : i === current
              ? 'bg-accent/50 flex-1'
              : 'bg-border flex-1'
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data created during wizard
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [permitName, setPermitName] = useState<string | null>(null);

  // Forms
  const [projectForm, setProjectForm] = useState({ name: '', client: '' });
  const [permitForm, setPermitForm] = useState({
    name: '',
    type: 'Building',
    jurisdiction: 'Houston',
    expiryDate: '',
  });
  const [notifForm, setNotifForm] = useState({
    channel: 'none' as string,
    telegramChatId: '',
    phoneNumber: '',
    events: ['permit.status', 'inspection.fail', 'expiry', 'daily.digest'],
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const markOnboarded = () => localStorage.setItem('permitiq_onboarded', 'true');

  const handleSkip = () => {
    markOnboarded();
    onComplete();
  };

  const handleCreateProject = async () => {
    if (!projectForm.name.trim()) {
      setError('Project name is required.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name.trim(),
          client: projectForm.client.trim() || null,
        }),
      });
      if (res.ok) {
        const project = await res.json();
        setProjectId(project.id);
        setProjectName(project.name);
        setStep('permit');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create project.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePermit = async () => {
    if (!permitForm.name.trim()) {
      setError('Permit name is required.');
      return;
    }
    // Can't create a permit without a project — skip straight to notifications
    if (!projectId) {
      setStep('notifications');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: permitForm.name.trim(),
          type: permitForm.type,
          jurisdiction: permitForm.jurisdiction,
          expiryDate: permitForm.expiryDate || null,
        }),
      });
      if (res.ok) {
        setPermitName(permitForm.name.trim());
        setStep('notifications');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to add permit.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (notifForm.channel === 'none') {
      setStep('complete');
      return;
    }

    const needsTelegram = notifForm.channel === 'telegram' || notifForm.channel === 'both';
    const needsSMS = notifForm.channel === 'sms' || notifForm.channel === 'both';

    if (needsTelegram && !notifForm.telegramChatId.trim()) {
      setError('Enter your Telegram Chat ID to enable Telegram notifications.');
      return;
    }
    if (needsSMS && !notifForm.phoneNumber.trim()) {
      setError('Enter your phone number to enable SMS notifications.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationChannel: notifForm.channel,
          notifyEvents: notifForm.events,
          telegramChatId: notifForm.telegramChatId.trim() || null,
          phoneNumber: notifForm.phoneNumber.trim() || null,
          sendTest: true,
        }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setStep('complete');
      } else {
        // Non-critical — proceed anyway
        setStep('complete');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setNotifForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const handleComplete = () => {
    markOnboarded();
    window.dispatchEvent(new CustomEvent('permitiq:refresh'));
    onComplete();
  };

  const needsTelegram = notifForm.channel === 'telegram' || notifForm.channel === 'both';
  const needsSMS = notifForm.channel === 'sms' || notifForm.channel === 'both';

  return (
    <>
      {/* Backdrop — clicking it skips setup */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'welcome' && (
            <div className="p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-text mb-2">Welcome to PermitIQ</h1>
              <p className="text-sm text-muted mb-1">
                Track every permit across all your projects — automatically.
              </p>
              <p className="text-sm text-muted mb-8">
                Let's get your first project set up. It only takes 2 minutes.
              </p>

              <button onClick={() => setStep('project')} className="btn btn-primary w-full mb-3 text-base py-2.5">
                Get Started →
              </button>
              <button onClick={handleSkip} className="text-xs text-muted hover:text-text transition-colors">
                Skip — I'll set up later
              </button>
            </div>
          )}

          {step === 'project' && (
            <div className="p-7">
              <StepBar current={0} total={3} />
              <p className="text-xs text-muted uppercase tracking-wide mb-1 font-medium">Step 1 of 3</p>
              <h2 className="text-xl font-semibold text-text mb-1">Add your first project</h2>
              <p className="text-sm text-muted mb-6">Projects group your permits and tasks together.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Project name *</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => { setProjectForm({ ...projectForm, name: e.target.value }); setError(''); }}
                    placeholder="e.g. Downtown Office Tower"
                    className="input w-full"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Client (optional)</label>
                  <input
                    type="text"
                    value={projectForm.client}
                    onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                    placeholder="e.g. Maxx Builders"
                    className="input w-full"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-danger mt-3">{error}</p>}

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleCreateProject}
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project →'}
                </button>
                <button
                  onClick={() => setStep('notifications')}
                  className="btn btn-ghost text-muted"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'permit' && (
            <div className="p-7">
              <StepBar current={1} total={3} />
              <p className="text-xs text-muted uppercase tracking-wide mb-1 font-medium">Step 2 of 3</p>
              <h2 className="text-xl font-semibold text-text mb-1">Track your first permit</h2>
              {projectName ? (
                <p className="text-sm text-muted mb-6">
                  For project <span className="text-accent font-medium">{projectName}</span>.
                </p>
              ) : (
                <p className="text-sm text-muted mb-6">Add a permit to start tracking.</p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Permit name *</label>
                  <input
                    type="text"
                    value={permitForm.name}
                    onChange={(e) => { setPermitForm({ ...permitForm, name: e.target.value }); setError(''); }}
                    placeholder="e.g. Building Permit — Foundation"
                    className="input w-full"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">Type</label>
                    <select
                      value={permitForm.type}
                      onChange={(e) => setPermitForm({ ...permitForm, type: e.target.value })}
                      className="select w-full"
                    >
                      {PERMIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Jurisdiction</label>
                    <input
                      type="text"
                      list="onboarding-jurisdictions"
                      value={permitForm.jurisdiction}
                      onChange={(e) => setPermitForm({ ...permitForm, jurisdiction: e.target.value })}
                      className="input w-full"
                    />
                    <datalist id="onboarding-jurisdictions">
                      {JURISDICTIONS.map((j) => <option key={j} value={j} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Expiry date (optional)</label>
                  <input
                    type="date"
                    value={permitForm.expiryDate}
                    onChange={(e) => setPermitForm({ ...permitForm, expiryDate: e.target.value })}
                    className="input w-full"
                  />
                  <p className="text-xs text-muted mt-1">
                    PermitIQ will alert you at 30, 14, 7, 3, and 1 day before expiry.
                  </p>
                </div>
              </div>

              {error && <p className="text-sm text-danger mt-3">{error}</p>}

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleCreatePermit}
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting ? 'Adding...' : 'Add Permit →'}
                </button>
                <button
                  onClick={() => setStep('notifications')}
                  className="btn btn-ghost text-muted"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'notifications' && (
            <div className="p-7">
              <StepBar current={2} total={3} />
              <p className="text-xs text-muted uppercase tracking-wide mb-1 font-medium">Step 3 of 3</p>
              <h2 className="text-xl font-semibold text-text mb-1">Set up notifications</h2>
              <p className="text-sm text-muted mb-6">
                Get real-time alerts for overdue permits, expiry warnings, and inspection results.
              </p>

              {/* Channel selector */}
              <div className="mb-5">
                <label className="block text-xs text-muted mb-2 font-medium">Notification channel</label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTIFICATION_CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => { setNotifForm((prev) => ({ ...prev, channel: ch.value })); setError(''); }}
                      className={`py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${
                        notifForm.channel === ch.value
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'bg-surface2 border-border text-muted hover:text-text'
                      }`}
                    >
                      {ch.icon} {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Telegram Chat ID */}
              {needsTelegram && (
                <div className="mb-4 p-3 bg-surface2 border border-border rounded-lg">
                  <div className="text-xs text-muted mb-2">
                    Search <span className="text-text font-medium">@PermitIQBot</span> on Telegram, send <code className="px-1 py-0.5 bg-surface rounded text-accent text-xs">/start</code>, then paste your Chat ID below.
                  </div>
                  <input
                    type="text"
                    value={notifForm.telegramChatId}
                    onChange={(e) => { setNotifForm({ ...notifForm, telegramChatId: e.target.value }); setError(''); }}
                    placeholder="e.g. 123456789"
                    className="input w-full"
                  />
                </div>
              )}

              {/* Phone number */}
              {needsSMS && (
                <div className="mb-4 p-3 bg-surface2 border border-border rounded-lg">
                  <label className="block text-xs text-muted mb-1">Phone number (E.164)</label>
                  <input
                    type="tel"
                    value={notifForm.phoneNumber}
                    onChange={(e) => { setNotifForm({ ...notifForm, phoneNumber: e.target.value }); setError(''); }}
                    placeholder="+15551234567"
                    className="input w-full"
                  />
                </div>
              )}

              {/* Event toggles */}
              {notifForm.channel !== 'none' && (
                <div className="mb-5">
                  <label className="block text-xs text-muted mb-2 font-medium">Alert types</label>
                  <div className="space-y-2">
                    {DEFAULT_EVENTS.map((ev) => {
                      const checked = notifForm.events.includes(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => toggleEvent(ev.id)}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                            checked
                              ? 'bg-accent/5 border-accent/20 text-text'
                              : 'bg-surface border-border text-muted'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            checked ? 'border-accent bg-accent' : 'border-border'
                          }`}>
                            {checked && <span className="text-black text-xs leading-none">✓</span>}
                          </div>
                          {ev.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-danger mt-3">{error}</p>}

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleSaveNotifications}
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting ? 'Saving...' : notifForm.channel === 'none' ? 'Continue →' : 'Save & Continue →'}
                </button>
                <button
                  onClick={() => setStep('complete')}
                  className="btn btn-ghost text-muted"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="p-8 text-center">
              {/* Success icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-text mb-2">
                {(projectName || permitName) ? "You're all set!" : 'Setup skipped'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {(projectName || permitName)
                  ? "Here's what we created:"
                  : 'You can add projects and permits anytime from the dashboard.'}
              </p>

              {(projectName || permitName || notifSaved) && (
                <div className="text-left bg-surface2 rounded-xl border border-border p-4 mb-6 space-y-2.5">
                  {projectName && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted">Project: </span>
                        <span className="text-text font-medium">{projectName}</span>
                      </div>
                    </div>
                  )}
                  {permitName && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted">Permit: </span>
                        <span className="text-text font-medium">{permitName}</span>
                      </div>
                    </div>
                  )}
                  {notifSaved && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted">Notifications: </span>
                        <span className="text-text font-medium">
                          {notifForm.channel === 'telegram' ? 'Telegram' :
                           notifForm.channel === 'sms' ? 'SMS' :
                           notifForm.channel === 'both' ? 'Telegram + SMS' : 'Off'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleComplete} className="btn btn-primary w-full text-base py-2.5">
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
