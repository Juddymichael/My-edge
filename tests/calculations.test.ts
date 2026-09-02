import { describe, it, expect } from 'vitest';
import {
  safeAdd,
  safeSubtract,
  calculateNetPnL,
  calculateRiskPercent,
  calculateRMultiple,
  calculateWinRate,
  calculateProfitFactor,
  calculateExpectancy,
  calculateDrawdown,
  calculateStreaks,
} from '../src/lib/calculations';
import { Trade } from '../src/types/trade';

function createMockTrade(overrides: Partial<Trade>): Trade {
  return {
    id: `t_${Math.random()}`,
    ticket: '1',
    sourceId: 'fp_mock',
    openedAt: '2026-08-01T10:00:00.000Z',
    closedAt: '2026-08-01T11:00:00.000Z',
    timezone: 'UTC',
    symbol: 'EURUSD',
    direction: 'BUY',
    entryPrice: 1.085,
    exitPrice: 1.09,
    stopLoss: 1.08,
    takeProfit: 1.095,
    quantity: 1,
    lotSize: 1,
    contractSize: 100000,
    grossPnL: 500,
    commission: -5,
    swap: 0,
    netPnL: 495,
    initialRiskAmount: 250,
    riskPercent: 2.5,
    rMultiple: 1.98,
    balanceBefore: 10000,
    balanceAfter: 10495,
    session: 'LONDON',
    timeframe: 'M15',
    setup: 'Breakout',
    notes: null,
    emotion: null,
    mistake: null,
    tags: [],
    screenshotBefore: null,
    screenshotAfter: null,
    status: 'CLOSED',
    dataQuality: 'VERIFIED',
    createdAt: '2026-08-01T11:00:00.000Z',
    updatedAt: '2026-08-01T11:00:00.000Z',
    ...overrides,
  };
}

describe('Financial Calculation Engine', () => {
  describe('Floating Point & Precision Safety', () => {
    it('solves 0.1 + 0.2 without binary float artifact', () => {
      expect(safeAdd(0.1, 0.2)).toBe(0.3);
      expect(safeSubtract(0.3, 0.2)).toBe(0.1);
    });
  });

  describe('Net P&L Calculations', () => {
    it('calculates gross + commission + swap', () => {
      const net = calculateNetPnL({
        grossPnL: 100,
        commission: -5,
        swap: -1,
      });
      expect(net).toBe(94);
    });

    it('does not re-apply commission/swap if net is already provided by broker', () => {
      const net = calculateNetPnL({
        grossPnL: 100,
        commission: -5,
        swap: -1,
        netPnLProvided: 94,
        isNetProvided: true,
      });
      expect(net).toBe(94);
    });

    it('handles absence of commission and swap correctly', () => {
      const net = calculateNetPnL({
        grossPnL: 100,
        commission: null,
        swap: null,
      });
      expect(net).toBe(100);
    });

    it('returns null if gross and net are both unknown (never 0)', () => {
      const net = calculateNetPnL({
        grossPnL: null,
        commission: -5,
        swap: null,
      });
      expect(net).toBeNull();
    });
  });

  describe('R Multiple Calculations', () => {
    it('calculates exact R multiples (+2R and -1R)', () => {
      expect(calculateRMultiple(200, 100)).toBe(2);
      expect(calculateRMultiple(-100, 100)).toBe(-1);
      expect(calculateRMultiple(0, 100)).toBe(0);
    });

    it('returns null if initialRiskAmount is unknown or non-positive (NEVER 0)', () => {
      expect(calculateRMultiple(200, null)).toBeNull();
      expect(calculateRMultiple(200, 0)).toBeNull();
      expect(calculateRMultiple(200, -50)).toBeNull();
      expect(calculateRMultiple(null, 100)).toBeNull();
    });
  });

  describe('Risk Percent Calculations', () => {
    it('calculates risk percentage against balance', () => {
      expect(calculateRiskPercent(100, 10000)).toBe(1);
      expect(calculateRiskPercent(250, 10000)).toBe(2.5);
    });

    it('returns null when balance or risk is missing or zero', () => {
      expect(calculateRiskPercent(null, 10000)).toBeNull();
      expect(calculateRiskPercent(100, null)).toBeNull();
      expect(calculateRiskPercent(100, 0)).toBeNull();
    });
  });

  describe('Win Rate & Profit Factor', () => {
    it('excludes open trades from win rate calculation', () => {
      const trades: Trade[] = [
        createMockTrade({ netPnL: 100, status: 'CLOSED' }),
        createMockTrade({ netPnL: -100, status: 'CLOSED' }),
        createMockTrade({ netPnL: 0, status: 'CLOSED' }), // Breakeven
        createMockTrade({ netPnL: null, status: 'OPEN' }),  // Open
      ];

      const res = calculateWinRate(trades);
      expect(res.wins).toBe(1);
      expect(res.losses).toBe(1);
      expect(res.breakeven).toBe(1);
      expect(res.open).toBe(1);
      expect(res.closed).toBe(3);
      // Win rate = 1 / 3 = 33.333%
      expect(res.winRate).toBeCloseTo(33.333, 2);
    });

    it('calculates Profit Factor and handles zero-loss scenario without NaN', () => {
      const trades: Trade[] = [
        createMockTrade({ netPnL: 300, status: 'CLOSED' }),
        createMockTrade({ netPnL: 200, status: 'CLOSED' }),
        createMockTrade({ netPnL: -250, status: 'CLOSED' }),
      ];

      const pfRes = calculateProfitFactor(trades);
      expect(pfRes.grossProfit).toBe(500);
      expect(pfRes.grossLoss).toBe(250);
      expect(pfRes.profitFactor).toBe(2);

      // Zero loss case
      const onlyWins = [createMockTrade({ netPnL: 300, status: 'CLOSED' })];
      const onlyWinsPf = calculateProfitFactor(onlyWins);
      expect(onlyWinsPf.profitFactor).toBe(Infinity);

      // No trades
      const emptyPf = calculateProfitFactor([]);
      expect(emptyPf.profitFactor).toBeNull();
    });
  });

  describe('Expectancy Calculation', () => {
    it('calculates R expectancy and money expectancy', () => {
      const trades: Trade[] = [
        createMockTrade({ netPnL: 200, rMultiple: 2, status: 'CLOSED' }),
        createMockTrade({ netPnL: -100, rMultiple: -1, status: 'CLOSED' }),
      ];

      const exp = calculateExpectancy(trades);
      expect(exp.rExpectancy).toBe(0.5);
      expect(exp.moneyExpectancy).toBe(50);
      expect(exp.validRTradesCount).toBe(2);
    });

    it('returns null for rExpectancy if trades lack R data (never fabricates value)', () => {
      const trades: Trade[] = [
        createMockTrade({ netPnL: 200, rMultiple: null, status: 'CLOSED' }),
      ];

      const exp = calculateExpectancy(trades);
      expect(exp.rExpectancy).toBeNull();
      expect(exp.moneyExpectancy).toBe(200);
    });
  });

  describe('Drawdown Calculation', () => {
    it('computes chronological drawdown from peak equity rather than single worst loss', () => {
      // Starting balance: 10,000
      // Trade 1: +1,000 -> Balance 11,000 (Peak: 11,000, DD: 0)
      // Trade 2: -500   -> Balance 10,500 (Peak: 11,000, DD: 500)
      // Trade 3: -300   -> Balance 10,200 (Peak: 11,000, DD: 800) -> Max DD is 800 (not single -500!)
      // Trade 4: +1,500 -> Balance 11,700 (Peak: 11,700, DD: 0)
      const trades: Trade[] = [
        createMockTrade({ closedAt: '2026-08-01T10:00:00.000Z', netPnL: 1000 }),
        createMockTrade({ closedAt: '2026-08-02T10:00:00.000Z', netPnL: -500 }),
        createMockTrade({ closedAt: '2026-08-03T10:00:00.000Z', netPnL: -300 }),
        createMockTrade({ closedAt: '2026-08-04T10:00:00.000Z', netPnL: 1500 }),
      ];

      const dd = calculateDrawdown(trades, 10000);
      expect(dd.maxDrawdown).toBe(800);
      expect(dd.peakBalance).toBe(11700);
      expect(dd.currentBalance).toBe(11700);
      expect(dd.currentDrawdown).toBe(0);
    });
  });

  describe('Streaks Calculation', () => {
    it('computes consecutive win and loss streaks accurately', () => {
      const trades: Trade[] = [
        createMockTrade({ closedAt: '2026-08-01T10:00:00.000Z', netPnL: 100 }),
        createMockTrade({ closedAt: '2026-08-02T10:00:00.000Z', netPnL: 150 }),
        createMockTrade({ closedAt: '2026-08-03T10:00:00.000Z', netPnL: 200 }), // 3 wins
        createMockTrade({ closedAt: '2026-08-04T10:00:00.000Z', netPnL: -50 }),
        createMockTrade({ closedAt: '2026-08-05T10:00:00.000Z', netPnL: -50 }), // 2 losses
        createMockTrade({ closedAt: '2026-08-06T10:00:00.000Z', netPnL: 100 }), // 1 win (current)
      ];

      const streaks = calculateStreaks(trades);
      expect(streaks.maxConsecutiveWins).toBe(3);
      expect(streaks.maxConsecutiveLosses).toBe(2);
      expect(streaks.currentStreakType).toBe('WIN');
      expect(streaks.currentStreakCount).toBe(1);
    });
  });
});
