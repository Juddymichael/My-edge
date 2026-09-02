import { describe, expect, it } from 'vitest';
import { Trade } from '../types/trade';
import { analyzeCluster } from '../lib/calculations/edge';

const trade = (overrides: Partial<Trade>): Trade => ({
  id: crypto.randomUUID(), ticket: null, sourceId: crypto.randomUUID(), openedAt: '2026-08-01T10:00:00.000Z', closedAt: '2026-08-01T10:10:00.000Z', timezone: 'UTC',
  symbol: 'EURUSD', direction: 'BUY', entryPrice: 1.1, exitPrice: 1.101, stopLoss: 1.099, takeProfit: 1.102, quantity: 1, lotSize: 1, contractSize: 100000,
  grossPnL: 100, commission: 0, swap: 0, netPnL: 100, initialRiskAmount: 50, riskPercent: 0.5, rMultiple: 2, balanceBefore: 10000, balanceAfter: 10100,
  session: 'NEW_YORK', timeframe: 'M5', setup: 'OB (IRL)', setupId: null, notes: null, emotion: 'NEUTRAL', mistake: 'NONE', tags: [],
  screenshotBefore: 'data:image/png;base64,before', screenshotAfter: 'data:image/png;base64,after', status: 'CLOSED', dataQuality: 'VERIFIED', createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-01T10:10:00.000Z', ...overrides,
});

describe('My Edge Analyzer feature data', () => {
  it('keeps only real screenshots for a setup and naturally excludes missing captures', () => {
    const trades = [
      trade({ id: 'win', netPnL: 150, screenshotBefore: 'before-win', screenshotAfter: 'after-win' }),
      trade({ id: 'loss', netPnL: -80, screenshotBefore: null, screenshotAfter: 'after-loss' }),
      trade({ id: 'none', netPnL: 20, screenshotBefore: null, screenshotAfter: null }),
    ];
    const galleryItems = trades
      .filter((t) => (t.setup?.trim() || t.setupId || 'Non défini') === 'OB (IRL)')
      .flatMap((t) => [
        ...(t.screenshotBefore ? [{ tradeId: t.id, screenshot: t.screenshotBefore }] : []),
        ...(t.screenshotAfter ? [{ tradeId: t.id, screenshot: t.screenshotAfter }] : []),
      ])
      .sort((a, b) => (trades.find((t) => t.id === b.tradeId)?.netPnL ?? 0) - (trades.find((t) => t.id === a.tradeId)?.netPnL ?? 0));
    expect(galleryItems).toHaveLength(3);
    expect(galleryItems.map((item) => item.tradeId)).toEqual(['win', 'win', 'loss']);
    expect(galleryItems.some((item) => item.tradeId === 'none')).toBe(false);
  });

  it('computes comparison metrics independently from real setup clusters', () => {
    const setupA = [
      trade({ id: 'a1', setup: 'OB (IRL)', netPnL: 100, rMultiple: 2 }),
      trade({ id: 'a2', setup: 'OB (IRL)', netPnL: -80, rMultiple: -0.8 }),
      trade({ id: 'a3', setup: 'OB (IRL)', netPnL: 80, rMultiple: 1.6 }),
    ];
    const setupB = [
      trade({ id: 'b1', setup: 'FVG', netPnL: 120, rMultiple: 2.4 }),
      trade({ id: 'b2', setup: 'FVG', netPnL: 100, rMultiple: 2 }),
      trade({ id: 'b3', setup: 'FVG', netPnL: -100, rMultiple: -2 }),
    ];
    const statsA = analyzeCluster(setupA, 'OB (IRL)', 'OB (IRL)', 'Setup');
    const statsB = analyzeCluster(setupB, 'FVG', 'FVG', 'Setup');
    expect(statsA.sampleSize).toBe(3);
    expect(statsB.sampleSize).toBe(3);
    expect(statsA.winRate).toBeGreaterThan(statsB.winRate);
    expect(statsB.monetaryExpectancy).toBeGreaterThan(statsA.monetaryExpectancy);
  });
});
