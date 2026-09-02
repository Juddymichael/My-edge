import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '../types/settings';
import { detectRiskPatterns } from '../lib/riskPatterns';
import { Trade } from '../types/trade';

const makeTrade = (id: string, openedAt: string, netPnL: number, lotSize = 1): Trade => ({
  id, ticket: id, sourceId: id, openedAt, closedAt: openedAt, timezone: 'UTC', symbol: 'EURUSD', direction: 'BUY',
  entryPrice: 1, exitPrice: 1, stopLoss: null, takeProfit: null, quantity: null, lotSize, contractSize: null,
  grossPnL: netPnL, commission: 0, swap: 0, netPnL, initialRiskAmount: null, riskPercent: null, rMultiple: null,
  balanceBefore: null, balanceAfter: null, session: null, timeframe: 'M15', setup: null, setupId: null,
  notes: null, emotion: null, mistake: null, tags: [], screenshotBefore: null, screenshotAfter: null,
  status: 'CLOSED', dataQuality: 'VERIFIED', createdAt: openedAt, updatedAt: openedAt,
});

describe('proactive risk patterns', () => {
  it('detects a trade opened shortly after a loss', () => {
    const trades = [
      makeTrade('loss', '2026-09-01T10:00:00.000Z', -100),
      makeTrade('next', '2026-09-01T10:10:00.000Z', 20),
    ];
    const alerts = detectRiskPatterns(trades, DEFAULT_USER_SETTINGS);
    expect(alerts.some(a => a.type === 'REVENGE_TRADING' && a.relatedTradeIds.join(',') === 'loss,next')).toBe(true);
  });

  it('detects four consecutive losses', () => {
    const trades = [1, 2, 3, 4].map((n, i) => makeTrade(`loss-${n}`, `2026-09-0${i + 1}T10:00:00.000Z`, -10));
    const alerts = detectRiskPatterns(trades, DEFAULT_USER_SETTINGS);
    const streak = alerts.find(a => a.type === 'LOSS_STREAK');
    expect(streak?.relatedTradeIds).toHaveLength(4);
  });

  it('respects configurable thresholds', () => {
    const settings = { ...DEFAULT_USER_SETTINGS, riskPatternSettings: { revengeWindowMinutes: 5, revengeMinLotMultiplier: 2, lossStreakThreshold: 5 } };
    const trades = [makeTrade('loss', '2026-09-01T10:00:00.000Z', -100), makeTrade('next', '2026-09-01T10:10:00.000Z', 20)];
    expect(detectRiskPatterns(trades, settings).some(a => a.type === 'REVENGE_TRADING')).toBe(false);
  });
});
