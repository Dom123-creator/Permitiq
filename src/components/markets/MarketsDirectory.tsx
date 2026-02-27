'use client';

import { useState, useEffect, useMemo } from 'react';

type Jurisdiction = {
  id: string;
  metro: string;
  city: string;
  county: string | null;
  state: string;
  ahjName: string;
  portalUrl: string | null;
  feeScheduleUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  avgReviewDaysBuilding: number | null;
  avgReviewDaysElectrical: number | null;
  avgReviewDaysPlumbing: number | null;
  avgReviewDaysMechanical: number | null;
  avgReviewDaysFire: number | null;
  marketTier: number;
  constructionActivity: string | null;
  primarySectors: string[];
  permitVolume: string | null;
  yoyGrowthPct: string | null;
  notes: string | null;
};

const PERMIT_TYPES: { key: keyof Jurisdiction; label: string; short: string }[] = [
  { key: 'avgReviewDaysBuilding', label: 'Building', short: 'BLD' },
  { key: 'avgReviewDaysElectrical', label: 'Electrical', short: 'ELEC' },
  { key: 'avgReviewDaysPlumbing', label: 'Plumbing', short: 'PLMB' },
  { key: 'avgReviewDaysMechanical', label: 'Mechanical', short: 'MECH' },
  { key: 'avgReviewDaysFire', label: 'Fire', short: 'FIRE' },
];

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  'very-high': { label: 'Very High', color: 'text-success', dot: 'bg-success' },
  high: { label: 'High', color: 'text-accent', dot: 'bg-accent' },
  moderate: { label: 'Moderate', color: 'text-warn', dot: 'bg-warn' },
};

const SECTOR_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  multifamily: 'Multifamily',
  healthcare: 'Healthcare',
  industrial: 'Industrial',
  logistics: 'Logistics',
  office: 'Office',
  retail: 'Retail',
  hospitality: 'Hospitality',
  'tech-campus': 'Tech Campus',
  'life-sciences': 'Life Sciences',
  semiconductor: 'Semiconductor',
  aerospace: 'Aerospace',
  'film-studio': 'Film/Studio',
  'mixed-use': 'Mixed-Use',
  'military-support': 'Military',
  'sports-entertainment': 'Sports/Ent.',
  'financial-services': 'Finance',
  'arts': 'Arts District',
  'marine-commercial': 'Marine',
  aviation: 'Aviation',
  'luxury-multifamily': 'Luxury Res.',
  'medical': 'Medical',
  'cannabis-retail': 'Cannabis',
  'auto-adjacent': 'Auto/Mfg',
  'education': 'Education',
};

function reviewDayColor(days: number | null): string {
  if (days === null) return 'text-muted';
  if (days <= 7) return 'text-success';
  if (days <= 14) return 'text-accent';
  if (days <= 21) return 'text-warn';
  return 'text-danger';
}

function reviewDayBg(days: number | null): string {
  if (days === null) return 'bg-surface2 text-muted';
  if (days <= 7) return 'bg-success/10 text-success border border-success/20';
  if (days <= 14) return 'bg-accent/10 text-accent border border-accent/20';
  if (days <= 21) return 'bg-warn/10 text-warn border border-warn/20';
  return 'bg-danger/10 text-danger border border-danger/20';
}

function TierBadge({ tier }: { tier: number }) {
  if (tier === 1) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-accent/15 text-accent border border-accent/30">
      ★ Tier 1
    </span>
  );
  if (tier === 2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple/15 text-purple border border-purple/30">
      Tier 2
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-surface2 text-muted border border-border">
      Tier 3
    </span>
  );
}

function ReviewTimeGrid({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  return (
    <div className="grid grid-cols-5 gap-1 mt-3">
      {PERMIT_TYPES.map(({ key, short }) => {
        const days = jurisdiction[key] as number | null;
        return (
          <div key={key} className={`rounded px-1.5 py-1.5 text-center ${reviewDayBg(days)}`}>
            <div className="text-xs font-medium opacity-70 mb-0.5">{short}</div>
            <div className="text-sm font-bold leading-none">
              {days !== null ? `${days}d` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JurisdictionCard({
  jurisdiction,
  expanded,
  onToggle,
}: {
  jurisdiction: Jurisdiction;
  expanded: boolean;
  onToggle: () => void;
}) {
  const activity = jurisdiction.constructionActivity
    ? ACTIVITY_CONFIG[jurisdiction.constructionActivity]
    : null;

  const growth = jurisdiction.yoyGrowthPct ? parseFloat(jurisdiction.yoyGrowthPct) : null;

  return (
    <div
      className={`rounded-lg border transition-all ${
        expanded ? 'border-accent/40 bg-surface' : 'border-border bg-card hover:border-accent/20'
      }`}
    >
      {/* Card header — always visible */}
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text">{jurisdiction.city}</span>
            {jurisdiction.county && (
              <span className="text-xs text-muted">· {jurisdiction.county}</span>
            )}
            <TierBadge tier={jurisdiction.marketTier} />
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">{jurisdiction.ahjName}</div>

          {/* Quick stats row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {activity && (
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${activity.dot}`} />
                <span className={`text-xs ${activity.color}`}>{activity.label} Activity</span>
              </div>
            )}
            {growth !== null && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-success">↑{growth.toFixed(1)}% YoY</span>
              </div>
            )}
            {jurisdiction.permitVolume && (
              <span className="text-xs text-muted">{jurisdiction.permitVolume}</span>
            )}
          </div>
        </div>

        {/* Review time summary — fastest type */}
        <div className="flex-shrink-0 text-right">
          {jurisdiction.avgReviewDaysBuilding !== null && (
            <div className={`text-lg font-bold ${reviewDayColor(jurisdiction.avgReviewDaysBuilding)}`}>
              {jurisdiction.avgReviewDaysBuilding}d
            </div>
          )}
          <div className="text-xs text-muted">bldg avg</div>
          <div className="mt-1 text-muted text-xs">{expanded ? '▲' : '▼'}</div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          {/* Review time grid */}
          <div className="mb-3">
            <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Avg Review Days by Type</div>
            <ReviewTimeGrid jurisdiction={jurisdiction} />
            <div className="flex gap-4 mt-2 text-xs text-muted">
              <span className="text-success">■ ≤7d fast</span>
              <span className="text-accent">■ ≤14d normal</span>
              <span className="text-warn">■ ≤21d slow</span>
              <span className="text-danger">■ 21d+ long</span>
            </div>
          </div>

          {/* Sectors */}
          {jurisdiction.primarySectors.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Primary Sectors</div>
              <div className="flex flex-wrap gap-1">
                {jurisdiction.primarySectors.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-surface2 text-text border border-border">
                    {SECTOR_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact + Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {jurisdiction.portalUrl && (
              <a
                href={jurisdiction.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-colors"
              >
                <span>🔗</span>
                <span className="font-medium">Permit Portal</span>
              </a>
            )}
            {jurisdiction.feeScheduleUrl && (
              <a
                href={jurisdiction.feeScheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded bg-surface2 border border-border text-text text-xs hover:border-accent/30 transition-colors"
              >
                <span>💰</span>
                <span className="font-medium">Fee Schedule</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted mb-3">
            {jurisdiction.phone && (
              <div className="flex items-center gap-1.5">
                <span>📞</span> <span>{jurisdiction.phone}</span>
              </div>
            )}
            {jurisdiction.email && (
              <div className="flex items-center gap-1.5">
                <span>✉️</span> <span>{jurisdiction.email}</span>
              </div>
            )}
            {jurisdiction.address && (
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <span>📍</span> <span>{jurisdiction.address}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {jurisdiction.notes && (
            <div className="rounded bg-surface2 border border-border p-3">
              <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">AHJ Notes</div>
              <p className="text-xs text-text leading-relaxed">{jurisdiction.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ALL_METROS = [
  'Houston Metro',
  'Austin Metro',
  'Miami Metro',
  'Nashville Metro',
  'Dallas–Fort Worth Metro',
  'Charlotte Metro',
  'Phoenix Metro',
  'Denver Metro',
  'Atlanta Metro',
  'Raleigh–Durham Metro',
  'San Antonio Metro',
  'Tampa–St. Petersburg Metro',
];

export function MarketsDirectory() {
  const [data, setData] = useState<{ jurisdictions: Jurisdiction[]; byMetro: Record<string, Jurisdiction[]> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetro, setSelectedMetro] = useState<string>('All Markets');
  const [searchQ, setSearchQ] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/markets')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load market data'); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.jurisdictions;
    if (selectedMetro !== 'All Markets') list = list.filter((j) => j.metro === selectedMetro);
    if (tierFilter) list = list.filter((j) => j.marketTier === tierFilter);
    if (activityFilter) list = list.filter((j) => j.constructionActivity === activityFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (j) =>
          j.city.toLowerCase().includes(q) ||
          j.metro.toLowerCase().includes(q) ||
          j.ahjName.toLowerCase().includes(q) ||
          j.state.toLowerCase().includes(q) ||
          (j.county ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, selectedMetro, tierFilter, activityFilter, searchQ]);

  // Metro options from data, sorted by tier then name
  const metroOptions = useMemo(() => {
    if (!data) return ALL_METROS;
    return Array.from(new Set(data.jurisdictions.map((j) => j.metro))).sort();
  }, [data]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(filtered.map((j) => j.id)));
  const collapseAll = () => setExpandedIds(new Set());

  // Stats
  const stats = useMemo(() => {
    if (!data) return null;
    const list = data.jurisdictions;
    const tier1 = list.filter((j) => j.marketTier === 1).length;
    const veryHigh = list.filter((j) => j.constructionActivity === 'very-high').length;
    const avgBuild = Math.round(
      list.filter((j) => j.avgReviewDaysBuilding !== null)
        .reduce((s, j) => s + (j.avgReviewDaysBuilding ?? 0), 0) /
        list.filter((j) => j.avgReviewDaysBuilding !== null).length
    );
    return { total: list.length, metros: metroOptions.length, tier1, veryHigh, avgBuild };
  }, [data, metroOptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted text-sm">Loading market database…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-danger text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Markets Tracked', value: stats.metros, color: 'border-t-accent' },
            { label: 'AHJs in Database', value: stats.total, color: 'border-t-purple' },
            { label: 'Tier 1 Markets', value: stats.tier1, color: 'border-t-success' },
            { label: 'Very-High Activity', value: stats.veryHigh, color: 'border-t-warn' },
            { label: 'Avg Building Review', value: `${stats.avgBuild}d`, color: 'border-t-accent2' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-lg bg-card border border-border border-t-2 ${color} p-3`}>
              <div className="text-xl font-bold text-text">{value}</div>
              <div className="text-xs text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg bg-surface border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search city, metro, AHJ name…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="flex-1 bg-surface2 border border-border rounded px-3 py-2 text-sm text-text placeholder-muted focus:outline-none focus:border-accent/50"
          />
          {/* Tier filter */}
          <select
            value={tierFilter ?? ''}
            onChange={(e) => setTierFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="bg-surface2 border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
          >
            <option value="">All Tiers</option>
            <option value="1">★ Tier 1 — Most Active</option>
            <option value="2">Tier 2 — High Activity</option>
            <option value="3">Tier 3 — Active</option>
          </select>
          {/* Activity filter */}
          <select
            value={activityFilter ?? ''}
            onChange={(e) => setActivityFilter(e.target.value || null)}
            className="bg-surface2 border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
          >
            <option value="">All Activity Levels</option>
            <option value="very-high">Very High Activity</option>
            <option value="high">High Activity</option>
            <option value="moderate">Moderate Activity</option>
          </select>
        </div>

        {/* Metro pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {['All Markets', ...metroOptions].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetro(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedMetro === m
                  ? 'bg-accent text-bg'
                  : 'bg-surface2 text-muted border border-border hover:border-accent/30 hover:text-text'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          <span className="text-text font-semibold">{filtered.length}</span> jurisdiction{filtered.length !== 1 ? 's' : ''} found
          {selectedMetro !== 'All Markets' && (
            <span className="ml-1">in <span className="text-accent">{selectedMetro}</span></span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-muted hover:text-text px-2 py-1 rounded hover:bg-surface2 transition-colors">
            Expand All
          </button>
          <button onClick={collapseAll} className="text-xs text-muted hover:text-text px-2 py-1 rounded hover:bg-surface2 transition-colors">
            Collapse All
          </button>
        </div>
      </div>

      {/* AHJ cards — grouped by metro when "All Markets" */}
      {selectedMetro === 'All Markets' && !searchQ && !tierFilter && !activityFilter ? (
        // Grouped view
        <div className="space-y-8">
          {metroOptions.map((metro) => {
            const metroJurs = filtered.filter((j) => j.metro === metro);
            if (metroJurs.length === 0) return null;
            return (
              <div key={metro}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-base font-semibold text-text">{metro}</h2>
                  <div className="flex items-center gap-1.5">
                    <TierBadge tier={metroJurs[0].marketTier} />
                    {metroJurs[0].constructionActivity && ACTIVITY_CONFIG[metroJurs[0].constructionActivity] && (
                      <span className={`text-xs ${ACTIVITY_CONFIG[metroJurs[0].constructionActivity].color}`}>
                        · {ACTIVITY_CONFIG[metroJurs[0].constructionActivity].label} Activity
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted">{metroJurs.length} AHJ{metroJurs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {metroJurs.map((j) => (
                    <JurisdictionCard
                      key={j.id}
                      jurisdiction={j}
                      expanded={expandedIds.has(j.id)}
                      onToggle={() => toggleExpand(j.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list view (search / filter active)
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">No jurisdictions match your filters.</div>
          ) : (
            filtered.map((j) => (
              <JurisdictionCard
                key={j.id}
                jurisdiction={j}
                expanded={expandedIds.has(j.id)}
                onToggle={() => toggleExpand(j.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
