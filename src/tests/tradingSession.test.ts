import { describe, expect, it } from 'vitest';
import { getTradeSession } from '../lib/tradingSession';

describe('GMT-5 trading killzones', () => {
  const trade = (openedAt: string, session: 'TOKYO' | 'NO_SESSION' | null = null) => ({ openedAt, session });

  it('converts stored UTC timestamps to London killzone time', () => {
    expect(getTradeSession(trade('2026-08-03T07:00:00.000Z'))).toBe('Killzone London');
    expect(getTradeSession(trade('2026-08-03T10:01:00.000Z'))).toBe('Killzone London');
  });

  it('uses New York killzone before the 10:00 overlap', () => {
    expect(getTradeSession(trade('2026-08-03T12:00:00.000Z'))).toBe('Killzone New York');
    expect(getTradeSession(trade('2026-08-03T14:59:00.000Z'))).toBe('Killzone New York');
  });

  it('gives London Close precedence over the 10:00 overlap', () => {
    expect(getTradeSession(trade('2026-08-03T15:00:00.000Z'))).toBe('Killzone London Close');
    expect(getTradeSession(trade('2026-08-03T17:01:00.000Z'))).toBe('Killzone London Close');
  });

  it('returns Hors Killzone outside the requested windows and replaces NO_SESSION', () => {
    expect(getTradeSession(trade('2026-08-03T18:00:00.000Z'))).toBe('Hors Killzone');
    expect(getTradeSession(trade('2026-08-03T12:00:00.000Z', 'NO_SESSION'))).toBe('Killzone New York');
  });

  it('preserves a real manually entered session', () => {
    expect(getTradeSession(trade('2026-08-03T12:00:00.000Z', 'TOKYO'))).toBe('TOKYO');
  });
});
