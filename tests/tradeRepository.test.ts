import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/database/db';
import { TradeRepository } from '../src/lib/database/repositories/tradeRepository';
import { DuplicateTradeError, InvalidTradeError } from '../src/types/errors';
import { NewTradeInput } from '../src/types/trade';

describe('TradeRepository & IndexedDB Persistence Audit', () => {
  beforeEach(async () => {
    await db.trades.clear();
  });

  afterEach(async () => {
    await db.trades.clear();
  });

  const baseTradeInput: NewTradeInput = {
    ticket: '1001',
    symbol: 'EURUSD',
    direction: 'BUY',
    status: 'CLOSED',
    openedAt: '2026-08-01T10:00:00.000Z',
    closedAt: '2026-08-01T11:00:00.000Z',
    timezone: 'UTC',
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
    initialRiskAmount: 250,
    balanceBefore: 10000,
    session: 'LONDON',
    timeframe: 'M15',
    setup: 'Order Block',
    notes: 'Clean execution',
    emotion: 'DISCIPLINED',
    mistake: 'NONE',
    tags: ['A+ Setup'],
    screenshotBefore: null,
    screenshotAfter: null,
  };

  it('1. Inserts a new trade, auto-calculates Net P&L and R-Multiple, and persists to IndexedDB', async () => {
    const created = await TradeRepository.create(baseTradeInput);

    expect(created.id).toBeDefined();
    expect(created.netPnL).toBe(495); // 500 - 5
    expect(created.rMultiple).toBe(1.98); // 495 / 250
    expect(created.dataQuality).toBe('VERIFIED');

    // Retrieve from DB
    const retrieved = await TradeRepository.getById(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.symbol).toBe('EURUSD');
    expect(retrieved?.netPnL).toBe(495);
  });

  it('2. Preserves unknown fields as NULL in IndexedDB without coercing to 0', async () => {
    const partialInput: NewTradeInput = {
      ticket: '1002',
      symbol: 'GBPUSD',
      direction: 'SELL',
      status: 'CLOSED',
      openedAt: '2026-08-02T10:00:00.000Z',
      closedAt: '2026-08-02T11:00:00.000Z',
      timezone: 'UTC',
      entryPrice: 1.25,
      exitPrice: 1.245,
      stopLoss: null,
      takeProfit: null,
      quantity: 1.0,
      lotSize: 1.0,
      contractSize: 100000,
      grossPnL: 200,
      commission: null, // Unknown
      swap: null,       // Unknown
      initialRiskAmount: null, // Unknown
      balanceBefore: null,     // Unknown
      session: null,
      timeframe: null,
      setup: null,
      notes: null,
      emotion: null,
      mistake: null,
      tags: [],
      screenshotBefore: null,
      screenshotAfter: null,
    };

    const created = await TradeRepository.create(partialInput);
    const retrieved = await TradeRepository.getById(created.id);

    expect(retrieved?.commission).toBeNull();
    expect(retrieved?.swap).toBeNull();
    expect(retrieved?.initialRiskAmount).toBeNull();
    expect(retrieved?.rMultiple).toBeNull();
    expect(retrieved?.balanceBefore).toBeNull();
    expect(retrieved?.dataQuality).toBe('PARTIAL');
  });

  it('3. Throws DuplicateTradeError on identical duplicate trade insertion', async () => {
    await TradeRepository.create(baseTradeInput);

    // Attempt to create the exact duplicate
    await expect(TradeRepository.create(baseTradeInput)).rejects.toThrow(DuplicateTradeError);
  });

  it('4. Bulk inserts trades and detects duplicates gracefully with skipDuplicates: true', async () => {
    const trade1 = { ...baseTradeInput, ticket: '2001' };
    const trade2 = { ...baseTradeInput, ticket: '2002' };
    const duplicateOf1 = { ...baseTradeInput, ticket: '2001' };

    const res = await TradeRepository.bulkInsert([trade1, trade2, duplicateOf1], true);

    expect(res.inserted).toBe(2);
    expect(res.duplicates).toBe(1);
    expect(res.errors.length).toBe(0);

    const totalCount = await TradeRepository.count();
    expect(totalCount).toBe(2);
  });

  it('5. Deletes a trade by ID correctly from IndexedDB', async () => {
    const created = await TradeRepository.create(baseTradeInput);
    expect(await TradeRepository.count()).toBe(1);

    const deleted = await TradeRepository.delete(created.id);
    expect(deleted).toBe(true);
    expect(await TradeRepository.count()).toBe(0);

    const retrievedAfter = await TradeRepository.getById(created.id);
    expect(retrievedAfter).toBeNull();
  });

  it('6. Clears all trades completely with clearAll()', async () => {
    await TradeRepository.create({ ...baseTradeInput, ticket: '3001' });
    await TradeRepository.create({ ...baseTradeInput, ticket: '3002' });
    expect(await TradeRepository.count()).toBe(2);

    await TradeRepository.clearAll();
    expect(await TradeRepository.count()).toBe(0);
  });

  it('7. Rejects invalid trades failing Zod validation (e.g. negative entryPrice)', async () => {
    const invalidTrade: NewTradeInput = {
      ...baseTradeInput,
      entryPrice: -1.05,
    };

    await expect(TradeRepository.create(invalidTrade)).rejects.toThrow(InvalidTradeError);
  });
});
