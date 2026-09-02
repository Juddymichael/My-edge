import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  normalizeDirection,
  normalizeNumber,
  normalizeDate,
  normalizeCurrency,
} from '../src/lib/normalization';

describe('Normalization Engine', () => {
  describe('Symbol Normalization', () => {
    it('normalizes standard forex tickers with separators', () => {
      expect(normalizeSymbol('EUR/USD')).toBe('EURUSD');
      expect(normalizeSymbol('eur.usd')).toBe('EURUSD');
      expect(normalizeSymbol('gbp_usd')).toBe('GBPUSD');
    });

    it('normalizes commodity and index aliases', () => {
      expect(normalizeSymbol('GOLD')).toBe('XAUUSD');
      expect(normalizeSymbol('XAU/USD')).toBe('XAUUSD');
      expect(normalizeSymbol('XAUUSD')).toBe('XAUUSD');
      expect(normalizeSymbol('SILVER')).toBe('XAGUSD');
      expect(normalizeSymbol('SP500')).toBe('SPX500');
      expect(normalizeSymbol('US500.cash')).toBe('SPX500');
      expect(normalizeSymbol('GER30')).toBe('GER40');
      expect(normalizeSymbol('DAX')).toBe('GER40');
      expect(normalizeSymbol('US30')).toBe('US30');
      expect(normalizeSymbol('DOW')).toBe('US30');
      expect(normalizeSymbol('NDX')).toBe('NAS100');
    });

    it('strips broker suffix artifacts', () => {
      expect(normalizeSymbol('EURUSD.raw')).toBe('EURUSD');
      expect(normalizeSymbol('GBPUSDecn')).toBe('GBPUSD');
      expect(normalizeSymbol('AUDUSD.pro')).toBe('AUDUSD');
    });
  });

  describe('Direction Normalization', () => {
    it('normalizes buy aliases to BUY', () => {
      expect(normalizeDirection('BUY')).toBe('BUY');
      expect(normalizeDirection('LONG')).toBe('BUY');
      expect(normalizeDirection('buy')).toBe('BUY');
      expect(normalizeDirection('long')).toBe('BUY');
      expect(normalizeDirection('b')).toBe('BUY');
      expect(normalizeDirection(1)).toBe('BUY');
    });

    it('normalizes sell aliases to SELL', () => {
      expect(normalizeDirection('SELL')).toBe('SELL');
      expect(normalizeDirection('SHORT')).toBe('SELL');
      expect(normalizeDirection('sell')).toBe('SELL');
      expect(normalizeDirection('short')).toBe('SELL');
      expect(normalizeDirection('s')).toBe('SELL');
      expect(normalizeDirection(-1)).toBe('SELL');
    });

    it('throws InvalidTradeError for unsupported directions', () => {
      expect(() => normalizeDirection('HOLD')).toThrow();
      expect(() => normalizeDirection('')).toThrow();
    });
  });

  describe('Number Normalization', () => {
    it('handles standard dot-decimal numbers and comma-formatted thousands', () => {
      expect(normalizeNumber('1234.56')).toBe(1234.56);
      expect(normalizeNumber('1,234.56')).toBe(1234.56);
      expect(normalizeNumber('100000')).toBe(100000);
    });

    it('handles European comma decimals (1.234,56 and 1234,56)', () => {
      expect(normalizeNumber('1.234,56')).toBe(1234.56);
      expect(normalizeNumber('1234,56')).toBe(1234.56);
      expect(normalizeNumber('-500,75')).toBe(-500.75);
    });

    it('handles accounting parentheses for negative values', () => {
      expect(normalizeNumber('(150.25)')).toBe(-150.25);
      expect(normalizeNumber('(1.000,50)')).toBe(-1000.5);
    });

    it('preserves null for unknown, empty, or placeholder strings (NEVER 0)', () => {
      expect(normalizeNumber(null)).toBeNull();
      expect(normalizeNumber(undefined)).toBeNull();
      expect(normalizeNumber('')).toBeNull();
      expect(normalizeNumber('-')).toBeNull();
      expect(normalizeNumber('N/A')).toBeNull();
      expect(normalizeNumber('null')).toBeNull();
    });
  });

  describe('Date Normalization', () => {
    it('normalizes standard ISO date strings', () => {
      const iso = '2026-08-15T14:30:00.000Z';
      expect(normalizeDate(iso)).toBe(iso);
    });

    it('normalizes broker formats YYYY.MM.DD HH:mm:ss', () => {
      const brokerDate = '2026.08.15 14:30:00';
      const result = normalizeDate(brokerDate);
      expect(result).toBe('2026-08-15T14:30:00.000Z');
    });

    it('normalizes timestamps (seconds and milliseconds)', () => {
      const millis = 1755268200000;
      expect(new Date(normalizeDate(millis)).getTime()).toBe(millis);
    });
  });

  describe('Currency Normalization', () => {
    it('normalizes currency symbols and codes', () => {
      expect(normalizeCurrency('$')).toBe('USD');
      expect(normalizeCurrency('US$')).toBe('USD');
      expect(normalizeCurrency('€')).toBe('EUR');
      expect(normalizeCurrency('£')).toBe('GBP');
      expect(normalizeCurrency('usd')).toBe('USD');
    });
  });
});
