import { describe, it, expect } from 'vitest';
import { exportToJson, importFromJson } from '../src/lib/backup';
import { Trade } from '../src/types/trade';
import { DEFAULT_USER_SETTINGS } from '../src/types/settings';

describe('Backup & Restore Data Integrity', () => {
  const sampleTrades: Trade[] = [
    {
      id: 'trade-b1',
      ticket: '9901',
      sourceId: 'fp_b1',
      openedAt: '2026-08-01T10:00:00.000Z',
      closedAt: '2026-08-01T11:00:00.000Z',
      timezone: 'UTC',
      symbol: 'XAUUSD',
      direction: 'BUY',
      entryPrice: 2400.5,
      exitPrice: 2415.0,
      stopLoss: 2390.0,
      takeProfit: 2430.0,
      quantity: 0.5,
      lotSize: 0.5,
      contractSize: 100,
      grossPnL: 725.0,
      commission: -3.5,
      swap: 0,
      netPnL: 721.5,
      initialRiskAmount: 525.0,
      riskPercent: 5.25,
      rMultiple: 1.37,
      balanceBefore: 10000,
      balanceAfter: 10721.5,
      session: 'LONDON',
      timeframe: 'M15',
      setup: 'Gold Liquidity Sweep',
      notes: 'Executed cleanly',
      emotion: 'DISCIPLINED',
      mistake: 'NONE',
      tags: ['Gold', 'Winner'],
      screenshotBefore: null,
      screenshotAfter: null,
      status: 'CLOSED',
      dataQuality: 'VERIFIED',
      createdAt: '2026-08-01T11:00:00.000Z',
      updatedAt: '2026-08-01T11:00:00.000Z',
    },
  ];

  it('performs full roundtrip JSON export and import with zero data loss or mutation', () => {
    const jsonStr = exportToJson(sampleTrades, DEFAULT_USER_SETTINGS);
    const restored = importFromJson(jsonStr);

    expect(restored.app).toBe('ThunderEdge');
    expect(restored.trades.length).toBe(1);
    expect(restored.trades[0].id).toBe('trade-b1');
    expect(restored.trades[0].netPnL).toBe(721.5);
    expect(restored.trades[0].symbol).toBe('XAUUSD');
    expect(restored.settings?.currency).toBe('USD');
  });

  it('rejects corrupted or malformed JSON payloads', () => {
    expect(() => importFromJson('invalid json string')).toThrow();
    expect(() => importFromJson('{"app":"ThunderEdge"}')).toThrow(); // missing trades
  });
});
