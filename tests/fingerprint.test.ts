import { describe, it, expect } from 'vitest';
import { generateTradeFingerprint } from '../src/lib/fingerprint/tradeFingerprint';

describe('Trade Fingerprint & Deduplication Engine', () => {
  it('generates identical fingerprint for the same ticketed trade', () => {
    const fp1 = generateTradeFingerprint({
      brokerSource: 'ICMarkets',
      ticket: '987654',
      symbol: 'EURUSD',
      openedAt: '2026-08-01T10:00:00.000Z',
      closedAt: '2026-08-01T11:00:00.000Z',
      direction: 'BUY',
    });

    const fp2 = generateTradeFingerprint({
      brokerSource: 'ICMarkets',
      ticket: '987654',
      symbol: 'EURUSD',
      openedAt: '2026-08-01T10:00:00.000Z',
      closedAt: '2026-08-01T11:00:00.000Z',
      direction: 'BUY',
    });

    expect(fp1).toBe(fp2);
  });

  it('generates different fingerprints for distinct tickets', () => {
    const fp1 = generateTradeFingerprint({
      ticket: '1001',
      symbol: 'EURUSD',
      openedAt: '2026-08-01T10:00:00.000Z',
      direction: 'BUY',
    });

    const fp2 = generateTradeFingerprint({
      ticket: '1002',
      symbol: 'EURUSD',
      openedAt: '2026-08-01T10:00:00.000Z',
      direction: 'BUY',
    });

    expect(fp1).not.toBe(fp2);
  });

  it('handles ticketless imports deterministically using price, date, and size', () => {
    const fp1 = generateTradeFingerprint({
      ticket: null,
      symbol: 'XAUUSD',
      openedAt: '2026-08-02T13:30:00.000Z',
      closedAt: '2026-08-02T14:15:00.000Z',
      direction: 'SELL',
      entryPrice: 2420.5,
      quantity: 1.0,
    });

    const fp2 = generateTradeFingerprint({
      ticket: null,
      symbol: 'XAUUSD',
      openedAt: '2026-08-02T13:30:00.000Z',
      closedAt: '2026-08-02T14:15:00.000Z',
      direction: 'SELL',
      entryPrice: 2420.5,
      quantity: 1.0,
    });

    expect(fp1).toBe(fp2);
  });
});
