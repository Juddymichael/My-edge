import { calculatePerformanceStats, getTradeRMultiple } from '../src/calculations/index';
import { processRawObjectsArray, parseNumericPnL, normalizeHeader } from '../src/importers/documentParser';
import type { Trade } from '../src/types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const source = 'Sample Dataset' as const;
const createdAt = new Date().toISOString();
const trades: Trade[] = [
  { id: 't1', date: '2026-08-01', symbol: 'XAUUSD', side: 'BUY', netPnL: 100, outcome: 'Win', entry: 100, stopLoss: 99, lotSize: 1, source, createdAt },
  { id: 't2', date: '2026-08-02', symbol: 'XAUUSD', side: 'SELL', netPnL: -50, outcome: 'Loss', entry: 100, stopLoss: 101, lotSize: 1, source, createdAt },
  { id: 't3', date: '2026-08-03', symbol: 'XAUUSD', side: 'BUY', netPnL: 0, outcome: 'BE', entry: 100, stopLoss: 99, lotSize: 1, source, createdAt },
];

const stats = calculatePerformanceStats(trades, 10000);
assert(stats.totalTrades === 3, 'total trades should be 3');
assert(stats.winningTrades === 1, 'winning trades should be 1');
assert(stats.losingTrades === 1, 'losing trades should be 1');
assert(stats.beTrades === 1, 'break-even trades should be 1');
assert(stats.totalPnL === 50, 'total PnL should be +50');
assert(stats.grossProfit === 100, 'gross profit should be 100');
assert(stats.grossLoss === 50, 'gross loss should be 50');
assert(stats.profitFactor === 2, 'profit factor should be 2');
assert(stats.expectancy === 16.67, 'currency expectancy should be 16.67');

assert(getTradeRMultiple(trades[0]) === 1, 'explicit risk should produce +1R');
assert(getTradeRMultiple(trades[1]) === -0.5, 'explicit risk should produce -0.5R');
assert(getTradeRMultiple({ ...trades[0], stopLoss: undefined, lotSize: undefined }) === null, 'missing risk data must not create synthetic R');

assert(normalizeHeader('Résultat $') === 'resultat', 'French accented PnL headers must normalize correctly');
assert(parseNumericPnL('$1,250.50') === 1250.5, 'US currency format must parse');
assert(parseNumericPnL('-1 250,50 €') === -1250.5, 'European currency format must parse');
assert(parseNumericPnL('(125.50)') === -125.5, 'accounting negative format must parse');

const imported = processRawObjectsArray([
  { Date: '2026-08-01', Paire: 'XAUUSD', Direction: 'BUY', 'Résultat $': '$31.89' },
  { Date: '2026-08-02', Paire: 'XAUUSD', Direction: 'SELL', 'Résultat $': '-$18.40' },
], 'Imported CSV');
assert(imported.trades.length === 2, 'two valid trades should import');
assert(imported.trades[0].netPnL === 31.89, 'positive Notion PnL should be preserved');
assert(imported.trades[1].netPnL === -18.4, 'negative Notion PnL should be preserved');
assert(imported.trades.every(t => t.netPnL !== 0), 'imported non-zero PnL must never silently become zero');

console.log('Core statistics and import regression checks passed.');
