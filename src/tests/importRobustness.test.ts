import { describe, expect, it } from 'vitest';
import { CsvTradeParser } from '../lib/import-pipeline/parsers/csvParser';
import { ExcelTradeParser } from '../lib/import-pipeline/parsers/excelParser';
import { TradeDuplicateDetector } from '../lib/import-pipeline/duplicateDetector';
import { normalizeDate, normalizeNumber } from '../lib/normalization';
import { NewTradeInput } from '../types/trade';
import * as XLSX from 'xlsx';

describe('robust trade imports', () => {
  it('parses broker CSV sections and ignores subtotal rows with empty Symbol', async () => {
    const csv = [
      'Résumé,,,,',
      'Symbole,Sens d’ouverture,Heure de clôture,Lots,Net EUR',
      'EURUSD,Buy,12 May 2026 13:57:37.319,0.01 Lots,5 031.02',
      ',,,,5031.02',
      'Dépôts,,,,1000',
      'GBPUSD,Sell,13 Mai 2026 14:00:01,0.20 Lots,-12.50',
    ].join('\n');
    const result = await new CsvTradeParser().parse(csv, { delimiter: ',' });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].data['lots']).toBe('0.01 Lots');
    expect(result.metadata?.sourceTotalPnl).toBe(5031.02);
  });

  it('accepts French and English dates and number formats', () => {
    expect(normalizeNumber('5 031.02')).toBe(5031.02);
    expect(normalizeNumber('0.01 Lots')).toBe(0.01);
    expect(normalizeNumber('5\u00a0031,02')).toBe(5031.02);
    expect(normalizeDate('12 May 2026 13:57:37.319')).toBe('2026-05-12T13:57:37.319Z');
    expect(normalizeDate('12 Fév 2026 13:57:37.319')).toBe('2026-02-12T13:57:37.319Z');
    expect(normalizeDate('12 Mai 2026 13:57:37.319')).toBe('2026-05-12T13:57:37.319Z');
  });

  it('finds a trade table in an Excel workbook even when it is not the first sheet', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Résumé'], ['Total', '100']]), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Symbole', 'Sens d’ouverture', 'Heure de clôture', 'Lots', 'PnL'],
      ['XAUUSD', 'Sell', '12 Mai 2026 13:57:37.319', '0.01 Lots', '-10.50'],
    ]), 'Trades');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const result = await new ExcelTradeParser().parse(bytes);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].data['symbole']).toBe('XAUUSD');
  });

  it('only treats exact symbol + second + PnL matches as duplicates', () => {
    const makeTrade = (symbol: string, closedAt: string, netPnL: number): NewTradeInput => ({
      ticket: null, brokerSource: 'test', openedAt: closedAt, closedAt, timezone: 'UTC', symbol, direction: 'BUY',
      entryPrice: 1, exitPrice: 2, stopLoss: null, takeProfit: null, quantity: 1, lotSize: 1, contractSize: 100000,
      grossPnL: netPnL, commission: null, swap: null, netPnL, initialRiskAmount: null, balanceBefore: null,
      balanceAfter: null, session: null, timeframe: null, setup: null, notes: null, emotion: null, mistake: null,
      tags: [], screenshotBefore: null, screenshotAfter: null, status: 'CLOSED',
    });
    const existing = makeTrade('EURUSD', '2026-05-12T13:57:37.319Z', 10);
    const candidates = [
      makeTrade('EURUSD', '2026-05-12T13:57:37.900Z', 10),
      makeTrade('EURUSD', '2026-05-12T13:57:38.000Z', 10),
      makeTrade('EURUSD', '2026-05-12T13:57:37.319Z', 11),
    ];
    const result = TradeDuplicateDetector.analyzeBatch(candidates, [existing]);
    expect(result.duplicatesCount).toBe(1);
  });
});
