import { describe, it, expect } from 'vitest';
import { TradeSchema } from '../src/lib/validation/tradeSchema';
import { evaluateDataQuality } from '../src/lib/validation/quality';
import { Trade } from '../src/types/trade';

describe('Trade Validation & Data Quality', () => {
  const validTradeBase: Trade = {
    id: 'test-1',
    ticket: '1001',
    sourceId: 'fp_123456',
    openedAt: '2026-08-01T10:00:00.000Z',
    closedAt: '2026-08-01T11:00:00.000Z',
    timezone: 'UTC',
    symbol: 'EURUSD',
    direction: 'BUY',
    entryPrice: 1.085,
    exitPrice: 1.09,
    stopLoss: 1.08,
    takeProfit: 1.095,
    quantity: 1.0,
    lotSize: 1.0,
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
    notes: 'Good execution',
    emotion: 'DISCIPLINED',
    mistake: 'NONE',
    tags: ['Forex'],
    screenshotBefore: null,
    screenshotAfter: null,
    status: 'CLOSED',
    dataQuality: 'VERIFIED',
    createdAt: '2026-08-01T11:00:00.000Z',
    updatedAt: '2026-08-01T11:00:00.000Z',
  };

  it('validates a complete, verified trade schema successfully', () => {
    const result = TradeSchema.safeParse(validTradeBase);
    expect(result.success).toBe(true);
  });

  it('preserves null values for unknown numeric fields without converting to 0', () => {
    const tradeWithNulls = {
      ...validTradeBase,
      commission: null,
      swap: null,
      initialRiskAmount: null,
      rMultiple: null,
    };

    const result = TradeSchema.safeParse(tradeWithNulls);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commission).toBeNull();
      expect(result.data.swap).toBeNull();
      expect(result.data.initialRiskAmount).toBeNull();
      expect(result.data.rMultiple).toBeNull();
    }
  });

  it('fails validation on negative prices or invalid ISO dates', () => {
    const invalidPrice = { ...validTradeBase, entryPrice: -1.05 };
    expect(TradeSchema.safeParse(invalidPrice).success).toBe(false);

    const invalidDate = { ...validTradeBase, openedAt: 'invalid-date-format' };
    expect(TradeSchema.safeParse(invalidDate).success).toBe(false);
  });

  it('evaluates quality as VERIFIED when all data is present and coherent', () => {
    const evaluation = evaluateDataQuality(validTradeBase);
    expect(evaluation.quality).toBe('VERIFIED');
    expect(evaluation.reasons.length).toBe(0);
  });

  it('evaluates quality as PARTIAL when commission or setup is missing', () => {
    const partialTrade: Trade = {
      ...validTradeBase,
      commission: null,
      setup: null,
    };
    const evaluation = evaluateDataQuality(partialTrade);
    expect(evaluation.quality).toBe('PARTIAL');
    expect(evaluation.reasons).toContain('Commission is unknown');
  });

  it('evaluates quality as NEEDS_REVIEW when entryPrice is null or dates are inverted', () => {
    const corruptedTrade: Trade = {
      ...validTradeBase,
      entryPrice: null,
    };
    const evaluation = evaluateDataQuality(corruptedTrade);
    expect(evaluation.quality).toBe('NEEDS_REVIEW');
    expect(evaluation.reasons).toContain('Missing or non-positive entry price');

    const invertedDates: Trade = {
      ...validTradeBase,
      openedAt: '2026-08-05T12:00:00.000Z',
      closedAt: '2026-08-01T12:00:00.000Z',
    };
    const dateEval = evaluateDataQuality(invertedDates);
    expect(dateEval.quality).toBe('NEEDS_REVIEW');
    expect(dateEval.reasons).toContain('Open date is later than close date');
  });
});
