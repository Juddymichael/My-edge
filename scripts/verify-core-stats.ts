import { calculatePerformanceStats, getTradeRMultiple } from '../src/calculations/index';
import type { Trade } from '../src/types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const trades: Trade[] = [
  {
    id: 't1', date: '2026-08-01', symbol: 'XAUUSD', side: 'BUY', netPnL: 100,
    outcome: 'Win', entry: 100, stopLoss: 99, lotSize: 1, createdAt: new Date().toISOString(),
  },
  {
    id: 't2', date: '2026-08-02', symbol: 'XAUUSD', side: 'SELL', netPnL: -50,
    outcome: 'Loss', entry: 100, stopLoss: 101, lotSize: 1, createdAt: new Date().toISOString(),
  },
  {
    id: 't3', date: '2026-08-03', symbol: 'XAUUSD', side: 'BUY', netPnL: 0,
    outcome: 'BE', entry: 100, stopLoss: 99, lotSize: 1, createdAt: new Date().toISOString(),
  },
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

// R must be based on explicit risk data. No synthetic $25/$50 fallback is acceptable.
assert(getTradeRMultiple(trades[0]) === 1, 'explicit risk should produce +1R');
assert(getTradeRMultiple(trades[1]) === -0.5, 'explicit risk should produce -0.5R');

console.log('Core statistics checks passed.');
