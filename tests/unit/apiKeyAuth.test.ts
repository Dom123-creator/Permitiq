/**
 * Unit tests for API key authentication utilities.
 */

import { hasScope, type ApiKeySession } from '@/lib/auth/apiKeyAuth';

function makeSession(scopes: string[]): ApiKeySession {
  return { userId: 'user-1', scopes, keyId: 'key-1' };
}

describe('hasScope', () => {
  it('returns true when exact scope is present', () => {
    expect(hasScope(makeSession(['read']), 'read')).toBe(true);
  });

  it('returns false when scope is missing', () => {
    expect(hasScope(makeSession(['read']), 'write')).toBe(false);
  });

  it('read,write scope grants any single scope', () => {
    const session = makeSession(['read,write']);
    expect(hasScope(session, 'read')).toBe(true);
    expect(hasScope(session, 'write')).toBe(true);
    expect(hasScope(session, 'admin')).toBe(true);
  });

  it('handles empty scopes array', () => {
    expect(hasScope(makeSession([]), 'read')).toBe(false);
  });

  it('handles multiple discrete scopes', () => {
    const session = makeSession(['read', 'write']);
    expect(hasScope(session, 'read')).toBe(true);
    expect(hasScope(session, 'write')).toBe(true);
    expect(hasScope(session, 'admin')).toBe(false);
  });
});
