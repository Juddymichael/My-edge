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
      'Dépôt,,,,10000',
    ].join('\n');
    const result = await new CsvTradeParser().parse(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.sourceTotalPnl).toBe(5031.02);
  });

  it('normalizes dates and numbers from broker exports', () => {
    expect(normalizeDate('12 May 2026 13:57:37.319')).toBeTruthy();
    expect(normalizeNumber('5 031.02')).toBe(5031.02);
  });

  it('parses one Excel trade row without creating summary rows', async () => {
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
      id: `${symbol}-${closedAt}-${netPnL}`,
      ticket: null, brokerSource: 'test', openedAt: closedAt, closedAt, timezone: 'UTC', symbol, direction: 'BUY',
      entryPrice: 1, exitPrice: 2, stopLoss: null, takeProfit: null, quantity: 1, lotSize: 1, contractSize: 100000,
      grossPnL: netPnL, commission: null, swap: null, netPnL, initialRiskAmount: null, balanceBefore: null,
      balanceAfter: null, session: null, timeframe: null, setup: null, setupId: null, notes: null, emotion: null, mistake: null,
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
