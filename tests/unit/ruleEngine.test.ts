/**
 * Unit tests for rule engine evaluation logic.
 *
 * Tests the pure decision functions extracted from /api/rules/run.
 * No database required — uses mock permit/rule data.
 */

// ── Extracted pure functions from the rule engine ────────────────────────────

const JURISDICTION_AVG: Record<string, number> = {
  Houston: 15,
  'Harris County': 20,
  Austin: 18,
  Dallas: 16,
  'San Antonio': 14,
};

function avgDays(jurisdiction: string, type: string): number {
  const base = JURISDICTION_AVG[jurisdiction] ?? 15;
  return type === 'Fire' ? base + 5 : base;
}

function daysInQueue(submittedAt: Date | null): number {
  if (!submittedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
}

function daysUntilDate(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

interface MockPermit {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  status: string;
  submittedAt: Date | null;
  expiryDate: Date | null;
  hearingDate: Date | null;
  archived: boolean;
  projectId: string;
}

interface RuleResult {
  shouldFire: boolean;
  taskTitle: string;
  priority: string;
}

function evaluateOverdueEscalation(permit: MockPermit): RuleResult {
  const days = daysInQueue(permit.submittedAt);
  const avg = avgDays(permit.jurisdiction, permit.type);
  if (days > avg + 20 && !['approved', 'rejected'].includes(permit.status)) {
    return {
      shouldFire: true,
      taskTitle: `Escalate: ${permit.name} — ${days}d in queue (avg ${avg}d)`,
      priority: 'urgent',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

function evaluateSlowReview(permit: MockPermit): RuleResult {
  const days = daysInQueue(permit.submittedAt);
  const avg = avgDays(permit.jurisdiction, permit.type);
  if (days > avg && !['approved', 'rejected'].includes(permit.status)) {
    return {
      shouldFire: true,
      taskTitle: `Follow up: ${permit.name} — ${days}d exceeds ${permit.jurisdiction} avg (${avg}d)`,
      priority: 'high',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

function evaluateInfoRequest(permit: MockPermit): RuleResult {
  if (permit.status === 'info-requested') {
    return {
      shouldFire: true,
      taskTitle: `Respond to info request: ${permit.name} — ${permit.jurisdiction}`,
      priority: 'urgent',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

function evaluateHearingPrep(permit: MockPermit): RuleResult {
  const hearing = daysUntilDate(permit.hearingDate);
  if (hearing !== null && hearing <= 14 && hearing >= 0) {
    return {
      shouldFire: true,
      taskTitle: `Hearing prep: ${permit.name} — hearing in ${hearing} days`,
      priority: 'high',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

function evaluateApprovalArchive(permit: MockPermit): RuleResult {
  if (permit.status === 'approved') {
    return {
      shouldFire: true,
      taskTitle: `Archive approved permit: ${permit.name}`,
      priority: 'medium',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

function evaluateExpiryWarning(permit: MockPermit): RuleResult {
  const expiry = daysUntilDate(permit.expiryDate);
  if (expiry !== null && expiry <= 30 && expiry >= 0) {
    return {
      shouldFire: true,
      taskTitle: `Permit expiring in ${expiry} days: ${permit.name}`,
      priority: expiry <= 7 ? 'urgent' : 'high',
    };
  }
  return { shouldFire: false, taskTitle: '', priority: '' };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function makePermit(overrides: Partial<MockPermit> = {}): MockPermit {
  return {
    id: 'test-1',
    name: 'Building Permit - Foundation',
    type: 'Building',
    jurisdiction: 'Houston',
    status: 'under-review',
    submittedAt: daysAgo(10),
    expiryDate: null,
    hearingDate: null,
    archived: false,
    projectId: 'proj-1',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('avgDays', () => {
  it('returns jurisdiction-specific average', () => {
    expect(avgDays('Houston', 'Building')).toBe(15);
    expect(avgDays('Harris County', 'Electrical')).toBe(20);
    expect(avgDays('Austin', 'Plumbing')).toBe(18);
  });

  it('adds 5 days for Fire permits', () => {
    expect(avgDays('Houston', 'Fire')).toBe(20);
    expect(avgDays('Austin', 'Fire')).toBe(23);
  });

  it('returns default 15 for unknown jurisdiction', () => {
    expect(avgDays('Unknown City', 'Building')).toBe(15);
  });
});

describe('daysInQueue', () => {
  it('returns 0 for null submittedAt', () => {
    expect(daysInQueue(null)).toBe(0);
  });

  it('computes days from submitted date', () => {
    const result = daysInQueue(daysAgo(10));
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(11);
  });

  it('returns 0 for future submitted date', () => {
    expect(daysInQueue(daysFromNow(5))).toBe(0);
  });
});

describe('daysUntilDate', () => {
  it('returns null for null date', () => {
    expect(daysUntilDate(null)).toBeNull();
  });

  it('returns positive for future date', () => {
    const result = daysUntilDate(daysFromNow(10));
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(11);
  });

  it('returns negative for past date', () => {
    const result = daysUntilDate(daysAgo(5));
    expect(result).toBeLessThan(0);
  });
});

describe('Rule 1: Overdue Escalation', () => {
  it('fires when days exceeds avg + 20', () => {
    const permit = makePermit({ submittedAt: daysAgo(40) }); // 40 > 15 + 20 = 35
    const result = evaluateOverdueEscalation(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('urgent');
  });

  it('does not fire when within threshold', () => {
    const permit = makePermit({ submittedAt: daysAgo(30) }); // 30 < 35
    const result = evaluateOverdueEscalation(permit);
    expect(result.shouldFire).toBe(false);
  });

  it('does not fire for approved permits', () => {
    const permit = makePermit({ submittedAt: daysAgo(40), status: 'approved' });
    expect(evaluateOverdueEscalation(permit).shouldFire).toBe(false);
  });

  it('does not fire for rejected permits', () => {
    const permit = makePermit({ submittedAt: daysAgo(40), status: 'rejected' });
    expect(evaluateOverdueEscalation(permit).shouldFire).toBe(false);
  });
});

describe('Rule 2: Slow Review Alert', () => {
  it('fires when days exceeds jurisdiction avg', () => {
    const permit = makePermit({ submittedAt: daysAgo(20) }); // 20 > 15
    const result = evaluateSlowReview(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('high');
  });

  it('does not fire when within avg', () => {
    const permit = makePermit({ submittedAt: daysAgo(10) }); // 10 < 15
    expect(evaluateSlowReview(permit).shouldFire).toBe(false);
  });

  it('respects jurisdiction-specific avg', () => {
    // Harris County avg is 20
    const permit = makePermit({ jurisdiction: 'Harris County', submittedAt: daysAgo(18) });
    expect(evaluateSlowReview(permit).shouldFire).toBe(false);

    const permit2 = makePermit({ jurisdiction: 'Harris County', submittedAt: daysAgo(22) });
    expect(evaluateSlowReview(permit2).shouldFire).toBe(true);
  });
});

describe('Rule 3: Info Request Response', () => {
  it('fires when status is info-requested', () => {
    const permit = makePermit({ status: 'info-requested' });
    const result = evaluateInfoRequest(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('urgent');
  });

  it('does not fire for other statuses', () => {
    expect(evaluateInfoRequest(makePermit({ status: 'under-review' })).shouldFire).toBe(false);
    expect(evaluateInfoRequest(makePermit({ status: 'pending' })).shouldFire).toBe(false);
    expect(evaluateInfoRequest(makePermit({ status: 'approved' })).shouldFire).toBe(false);
  });
});

describe('Rule 4: Hearing Prep Reminder', () => {
  it('fires when hearing is within 14 days', () => {
    const permit = makePermit({ hearingDate: daysFromNow(10) });
    const result = evaluateHearingPrep(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('high');
  });

  it('does not fire when hearing is >14 days', () => {
    const permit = makePermit({ hearingDate: daysFromNow(20) });
    expect(evaluateHearingPrep(permit).shouldFire).toBe(false);
  });

  it('does not fire when hearing is past', () => {
    const permit = makePermit({ hearingDate: daysAgo(5) });
    expect(evaluateHearingPrep(permit).shouldFire).toBe(false);
  });

  it('does not fire when no hearing date', () => {
    const permit = makePermit({ hearingDate: null });
    expect(evaluateHearingPrep(permit).shouldFire).toBe(false);
  });
});

describe('Rule 5: Approval Archive', () => {
  it('fires when status is approved', () => {
    const permit = makePermit({ status: 'approved' });
    const result = evaluateApprovalArchive(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('medium');
  });

  it('does not fire for non-approved', () => {
    expect(evaluateApprovalArchive(makePermit({ status: 'pending' })).shouldFire).toBe(false);
    expect(evaluateApprovalArchive(makePermit({ status: 'under-review' })).shouldFire).toBe(false);
  });
});

describe('Rule 6: Expiry Warning', () => {
  it('fires when permit expires within 30 days', () => {
    const permit = makePermit({ expiryDate: daysFromNow(15) });
    const result = evaluateExpiryWarning(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('high');
  });

  it('sets urgent priority when expiring within 7 days', () => {
    const permit = makePermit({ expiryDate: daysFromNow(5) });
    const result = evaluateExpiryWarning(permit);
    expect(result.shouldFire).toBe(true);
    expect(result.priority).toBe('urgent');
  });

  it('does not fire when expiry is >30 days', () => {
    const permit = makePermit({ expiryDate: daysFromNow(60) });
    expect(evaluateExpiryWarning(permit).shouldFire).toBe(false);
  });

  it('does not fire when already expired', () => {
    const permit = makePermit({ expiryDate: daysAgo(5) });
    expect(evaluateExpiryWarning(permit).shouldFire).toBe(false);
  });

  it('does not fire when no expiry date', () => {
    const permit = makePermit({ expiryDate: null });
    expect(evaluateExpiryWarning(permit).shouldFire).toBe(false);
  });
});

describe('Rule interaction — multi-rule evaluation', () => {
  it('overdue permit triggers both escalation and slow review', () => {
    const permit = makePermit({ submittedAt: daysAgo(40) });
    expect(evaluateOverdueEscalation(permit).shouldFire).toBe(true);
    expect(evaluateSlowReview(permit).shouldFire).toBe(true);
  });

  it('approved permit triggers archive but not escalation', () => {
    const permit = makePermit({ status: 'approved', submittedAt: daysAgo(40) });
    expect(evaluateApprovalArchive(permit).shouldFire).toBe(true);
    expect(evaluateOverdueEscalation(permit).shouldFire).toBe(false);
    expect(evaluateSlowReview(permit).shouldFire).toBe(false);
  });

  it('info-requested permit triggers info rule regardless of days', () => {
    const permit = makePermit({ status: 'info-requested', submittedAt: daysAgo(5) });
    expect(evaluateInfoRequest(permit).shouldFire).toBe(true);
  });
});
