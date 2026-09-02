import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../lib/database/db';
import { executeCoachTool } from '../lib/coachTools';

const trade = (id: string, symbol: string, pnl: number, openedAt: string) => ({
  id, ticket: id, sourceId: id, symbol, direction: 'BUY' as const, openedAt, closedAt: openedAt,
  timezone: 'UTC', entryPrice: 1, exitPrice: 1, stopLoss: null, takeProfit: null, quantity: 1, lotSize: 0.01,
  contractSize: null, grossPnL: pnl, commission: 0, swap: 0, netPnL: pnl, initialRiskAmount: null, riskPercent: null,
  rMultiple: null, balanceBefore: null, balanceAfter: null, session: 'LONDON' as const, timeframe: 'M15', setup: 'FVG',
  notes: null, emotion: null, mistake: null, tags: [], screenshotBefore: null, screenshotAfter: null, status: 'CLOSED' as const,
  dataQuality: 'VERIFIED' as const, createdAt: openedAt, updatedAt: openedAt,
});

describe('Trading Coach tools', () => {
  beforeEach(async () => { await db.open(); await db.trades.clear(); });

  it('returns exact trades for a date range', async () => {
    await db.trades.bulkPut([trade('1', 'GBPUSD', 50, '2026-09-01T10:00:00.000Z'), trade('2', 'EURUSD', -20, '2026-09-03T10:00:00.000Z')]);
    const result = await executeCoachTool('getTradesByPeriod', { dateDebut: '2026-09-02', dateFin: '2026-09-03' }) as Array<{ id: string }>;
    expect(result.map(item => item.id)).toEqual(['2']);
  });

  it('calculates filtered winrate, pnl, expectancy and profit factor', async () => {
    await db.trades.bulkPut([trade('1', 'GBPUSD', 100, '2026-09-01T10:00:00.000Z'), trade('2', 'GBPUSD', -40, '2026-09-02T10:00:00.000Z'), trade('3', 'EURUSD', 500, '2026-09-03T10:00:00.000Z')]);
    const result = await executeCoachTool('getStatsForFilter', { filtres: { paire: 'GBPUSD' } }) as { stats: { tradeCount: number; winrate: number; pnl: number; expectancy: number; profitFactor: number } };
    expect(result.stats).toMatchObject({ tradeCount: 2, winrate: 50, pnl: 60, expectancy: 30, profitFactor: 2.5 });
  });

  it('returns best and worst trades by net PnL', async () => {
    await db.trades.bulkPut([trade('1', 'GBPUSD', 100, '2026-09-01T10:00:00.000Z'), trade('2', 'EURUSD', -80, '2026-09-02T10:00:00.000Z'), trade('3', 'XAUUSD', 20, '2026-09-03T10:00:00.000Z')]);
    const best = await executeCoachTool('getBestTrades', { nombre: 1 }) as Array<{ id: string }>;
    const worst = await executeCoachTool('getWorstTrades', { nombre: 1 }) as Array<{ id: string }>;
    expect(best[0].id).toBe('1');
    expect(worst[0].id).toBe('2');
  });
});
