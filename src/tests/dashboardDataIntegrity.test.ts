import { describe, expect, it } from 'vitest';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { Trade } from '../types/trade';

function makeTrade(index: number): Trade {
  const pnl = index % 2 === 0 ? 25 : -10;
  return {
    id: `dashboard-test-${index}`,
    ticket: String(index),
    sourceId: `dashboard-test-${index}`,
    openedAt: `2026-08-01T08:${String(index % 60).padStart(2, '0')}:00.000Z`,
    closedAt: `2026-08-01T09:${String(index % 60).padStart(2, '0')}:00.000Z`,
    timezone: 'UTC',
    symbol: index % 2 === 0 ? 'EURUSD' : 'XAUUSD',
    direction: index % 2 === 0 ? 'BUY' : 'SELL',
    entryPrice: 1,
    exitPrice: 1,
    stopLoss: null,
    takeProfit: null,
    quantity: 1,
    lotSize: 1,
    contractSize: 1,
    grossPnL: pnl,
    commission: 0,
    swap: 0,
    netPnL: pnl,
    initialRiskAmount: 10,
    riskPercent: 0.1,
    rMultiple: pnl / 10,
    balanceBefore: 10000,
    balanceAfter: 10000 + pnl,
    session: null,
    timeframe: 'M5',
    setup: null,
    setupId: null,
    notes: null,
    emotion: null,
    mistake: null,
    tags: [],
    screenshotBefore: null,
    screenshotAfter: null,
    status: 'CLOSED',
    dataQuality: 'VERIFIED',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  };
}

describe('dashboard data integrity', () => {
  it('calculates key metrics from all 412 trades without a month filter', () => {
    const trades = Array.from({ length: 412 }, (_, index) => makeTrade(index));
    const metrics = calculateComprehensiveMetrics(trades, 10000);

    expect(metrics.totalTrades).toBe(412);
    expect(metrics.closedTrades).toBe(412);
    expect(metrics.netPnLSum).toBe(3090);
    expect(metrics.winRate.winRate).toBeCloseTo((206 / 412) * 100, 10);
  });
});
