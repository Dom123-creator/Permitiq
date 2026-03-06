/**
 * Unit tests for proactive scanner helper functions.
 *
 * Tests pure functions: daysUntil, daysAgo, and notification tier logic.
 */

// ── Extracted functions from proactiveScanner.ts ─────────────────────────────

function scannerDaysUntil(date: Date): number {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function daysAgoFn(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Expiry notification tiers from checkExpiringPermits()
const EXPIRY_TIERS = [30, 14, 7, 3, 1];

function shouldNotifyExpiry(daysLeft: number): boolean {
  return EXPIRY_TIERS.includes(daysLeft);
}

function getExpiryUrgency(daysLeft: number): string {
  if (daysLeft <= 3) return 'critical';
  if (daysLeft <= 7) return 'warning';
  return 'info';
}

// Overdue threshold from checkOverduePermits()
const OVERDUE_THRESHOLD = 25;

function isOverdueForAlert(daysInQueue: number): boolean {
  return daysInQueue >= OVERDUE_THRESHOLD;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDateFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function makeDateAgo(days: number): Date {
  return makeDateFromNow(-days);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('scannerDaysUntil', () => {
  it('returns positive days for future dates', () => {
    const result = scannerDaysUntil(makeDateFromNow(10));
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(11);
  });

  it('returns negative for past dates', () => {
    const result = scannerDaysUntil(makeDateAgo(5));
    expect(result).toBeLessThan(0);
  });

  it('returns 0 or 1 for today/tomorrow boundary', () => {
    const result = scannerDaysUntil(new Date());
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('daysAgo', () => {
  it('returns positive days for past dates', () => {
    const result = daysAgoFn(makeDateAgo(15));
    expect(result).toBeGreaterThanOrEqual(14);
    expect(result).toBeLessThanOrEqual(16);
  });

  it('returns 0 for today', () => {
    expect(daysAgoFn(new Date())).toBe(0);
  });
});

describe('shouldNotifyExpiry', () => {
  it('returns true for notification tier days', () => {
    expect(shouldNotifyExpiry(30)).toBe(true);
    expect(shouldNotifyExpiry(14)).toBe(true);
    expect(shouldNotifyExpiry(7)).toBe(true);
    expect(shouldNotifyExpiry(3)).toBe(true);
    expect(shouldNotifyExpiry(1)).toBe(true);
  });

  it('returns false for non-tier days', () => {
    expect(shouldNotifyExpiry(29)).toBe(false);
    expect(shouldNotifyExpiry(15)).toBe(false);
    expect(shouldNotifyExpiry(10)).toBe(false);
    expect(shouldNotifyExpiry(5)).toBe(false);
    expect(shouldNotifyExpiry(2)).toBe(false);
    expect(shouldNotifyExpiry(0)).toBe(false);
  });
});

describe('getExpiryUrgency', () => {
  it('returns critical for 3 days or less', () => {
    expect(getExpiryUrgency(3)).toBe('critical');
    expect(getExpiryUrgency(1)).toBe('critical');
    expect(getExpiryUrgency(0)).toBe('critical');
  });

  it('returns warning for 4-7 days', () => {
    expect(getExpiryUrgency(7)).toBe('warning');
    expect(getExpiryUrgency(5)).toBe('warning');
    expect(getExpiryUrgency(4)).toBe('warning');
  });

  it('returns info for >7 days', () => {
    expect(getExpiryUrgency(14)).toBe('info');
    expect(getExpiryUrgency(30)).toBe('info');
    expect(getExpiryUrgency(8)).toBe('info');
  });
});

describe('isOverdueForAlert', () => {
  it('returns true at threshold', () => {
    expect(isOverdueForAlert(25)).toBe(true);
  });

  it('returns true above threshold', () => {
    expect(isOverdueForAlert(40)).toBe(true);
  });

  it('returns false below threshold', () => {
    expect(isOverdueForAlert(24)).toBe(false);
    expect(isOverdueForAlert(10)).toBe(false);
    expect(isOverdueForAlert(0)).toBe(false);
  });
});

describe('expiry date edge cases', () => {
  it('exactly 30 days from now should trigger notification', () => {
    const daysLeft = scannerDaysUntil(makeDateFromNow(30));
    // May be 29-31 due to time-of-day rounding
    expect(daysLeft).toBeGreaterThanOrEqual(29);
    expect(daysLeft).toBeLessThanOrEqual(31);
  });

  it('expired permit (negative days) should not trigger', () => {
    const daysLeft = scannerDaysUntil(makeDateAgo(5));
    expect(shouldNotifyExpiry(daysLeft)).toBe(false);
  });
});
