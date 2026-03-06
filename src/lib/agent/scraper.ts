/**
 * Permit Portal Scraper
 *
 * Scrapes municipal permit portal websites to detect status changes.
 * Each jurisdiction has a scraper config defining selectors and URL patterns.
 *
 * Uses Playwright for browser automation when portals lack APIs.
 * Falls back gracefully when Playwright is unavailable (CI/dev environments).
 *
 * Usage:
 *   const changes = await scrapePermitStatus(permit);
 *   if (changes) { updatePermitInDb(permit.id, changes); }
 */

export interface PermitScrapeInput {
  id: string;
  permitNumber: string | null;
  jurisdiction: string;
  portalUrl: string | null;
  currentStatus: string;
}

export interface PermitScrapeResult {
  permitId: string;
  newStatus: string | null;
  statusText: string | null;
  lastUpdated: string | null;
  inspectionNotes: string | null;
  error: string | null;
}

export interface JurisdictionConfig {
  name: string;
  portalUrl: string;
  searchUrl: (permitNumber: string) => string;
  selectors: {
    statusField: string;
    lastUpdated?: string;
    inspectionNotes?: string;
  };
  statusMap: Record<string, string>;
}

// ── Jurisdiction Configs ─────────────────────────────────────────────────────

const JURISDICTION_CONFIGS: Record<string, JurisdictionConfig> = {
  Houston: {
    name: 'City of Houston',
    portalUrl: 'https://houston.permitium.com',
    searchUrl: (num) => `https://houston.permitium.com/permits/search?q=${encodeURIComponent(num)}`,
    selectors: {
      statusField: '[data-field="status"], .permit-status, .status-value',
      lastUpdated: '[data-field="last-updated"], .last-update-date',
      inspectionNotes: '.inspection-comments, .review-comments',
    },
    statusMap: {
      'In Review': 'under-review',
      'Under Review': 'under-review',
      'Approved': 'approved',
      'Issued': 'approved',
      'Corrections Required': 'info-requested',
      'Additional Info Required': 'info-requested',
      'Denied': 'rejected',
      'Expired': 'rejected',
      'Submitted': 'pending',
      'Received': 'pending',
    },
  },
  'Harris County': {
    name: 'Harris County',
    portalUrl: 'https://permits.harriscountytx.gov',
    searchUrl: (num) => `https://permits.harriscountytx.gov/search?permit=${encodeURIComponent(num)}`,
    selectors: {
      statusField: '.permit-status, .status-badge',
      lastUpdated: '.status-date',
    },
    statusMap: {
      'Active': 'under-review',
      'Approved': 'approved',
      'Hold': 'info-requested',
      'Rejected': 'rejected',
      'Pending': 'pending',
    },
  },
  Austin: {
    name: 'City of Austin',
    portalUrl: 'https://abc.austintexas.gov',
    searchUrl: (num) => `https://abc.austintexas.gov/web/permit/public-search-other?t_detail=1&t_permit_num=${encodeURIComponent(num)}`,
    selectors: {
      statusField: '#TextBox_StatusCurrent, .permit-status',
      lastUpdated: '#TextBox_DateStatusCurrent',
    },
    statusMap: {
      'In Review': 'under-review',
      'Approved': 'approved',
      'Active': 'approved',
      'Expired': 'rejected',
      'Resubmittal Required': 'info-requested',
      'Pending': 'pending',
    },
  },
};

// ── Scraper Implementation ───────────────────────────────────────────────────

let playwrightAvailable: boolean | null = null;

async function checkPlaywright(): Promise<boolean> {
  if (playwrightAvailable !== null) return playwrightAvailable;
  try {
    await import('playwright');
    playwrightAvailable = true;
  } catch {
    playwrightAvailable = false;
  }
  return playwrightAvailable;
}

/**
 * Scrape a single permit's status from its jurisdiction portal.
 * Returns null fields if scraping fails or Playwright unavailable.
 */
export async function scrapePermitStatus(permit: PermitScrapeInput): Promise<PermitScrapeResult> {
  const result: PermitScrapeResult = {
    permitId: permit.id,
    newStatus: null,
    statusText: null,
    lastUpdated: null,
    inspectionNotes: null,
    error: null,
  };

  if (!permit.permitNumber) {
    result.error = 'No permit number — cannot search portal';
    return result;
  }

  const config = JURISDICTION_CONFIGS[permit.jurisdiction];
  if (!config) {
    result.error = `No scraper config for jurisdiction: ${permit.jurisdiction}`;
    return result;
  }

  const available = await checkPlaywright();
  if (!available) {
    result.error = 'Playwright not installed — install with: npx playwright install chromium';
    return result;
  }

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set a reasonable timeout
    page.setDefaultTimeout(15000);

    const searchUrl = config.searchUrl(permit.permitNumber);
    await page.goto(searchUrl, { waitUntil: 'networkidle' });

    // Try to extract status
    const statusEl = await page.$(config.selectors.statusField);
    if (statusEl) {
      const rawStatus = (await statusEl.textContent())?.trim() ?? '';
      result.statusText = rawStatus;
      result.newStatus = config.statusMap[rawStatus] ?? null;
    }

    // Try to extract last updated date
    if (config.selectors.lastUpdated) {
      const dateEl = await page.$(config.selectors.lastUpdated);
      if (dateEl) {
        result.lastUpdated = (await dateEl.textContent())?.trim() ?? null;
      }
    }

    // Try to extract inspection notes
    if (config.selectors.inspectionNotes) {
      const notesEl = await page.$(config.selectors.inspectionNotes);
      if (notesEl) {
        result.inspectionNotes = (await notesEl.textContent())?.trim() ?? null;
      }
    }

    await browser.close();
  } catch (err) {
    result.error = `Scrape failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  return result;
}

/**
 * Scrape multiple permits in parallel (limited concurrency).
 */
export async function scrapePermitBatch(
  permits: PermitScrapeInput[],
  concurrency = 3
): Promise<PermitScrapeResult[]> {
  const results: PermitScrapeResult[] = [];
  const queue = [...permits];

  const worker = async () => {
    while (queue.length > 0) {
      const permit = queue.shift();
      if (!permit) break;
      const result = await scrapePermitStatus(permit);
      results.push(result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, permits.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Get the scraper configuration for a jurisdiction.
 * Returns null if no config exists.
 */
export function getJurisdictionConfig(jurisdiction: string): JurisdictionConfig | null {
  return JURISDICTION_CONFIGS[jurisdiction] ?? null;
}

/**
 * Get all configured jurisdictions.
 */
export function getConfiguredJurisdictions(): string[] {
  return Object.keys(JURISDICTION_CONFIGS);
}
