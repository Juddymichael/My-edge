import { Trade } from '../../types/trade';
import { ComprehensivePerformanceMetrics } from '../../types/calculations';
import { safeAdd, safeDivide } from './precision';
import { calculateWinRate, calculateProfitFactor, calculateExpectancy } from './statistics';
import { calculateDrawdown } from './drawdown';
import { calculateStreaks } from './streaks';

export * from './precision';
export * from './pnl';
export * from './risk';
export * from './rMultiple';
export * from './statistics';
export * from './drawdown';
export * from './streaks';
export * from './edge';

/**
 * Computes the full suite of institutional performance metrics.
 * Separated cleanly from UI components.
 */
export function calculateComprehensiveMetrics(
  trades: Trade[],
  initialBalance = 10000
): ComprehensivePerformanceMetrics {
  const winRate = calculateWinRate(trades);
  const profitFactor = calculateProfitFactor(trades);
  const expectancy = calculateExpectancy(trades);
  const drawdown = calculateDrawdown(trades, initialBalance);
  const streaks = calculateStreaks(trades);

  let netPnLSum = 0;
  let grossPnLSum = 0;
  let commissionsSum = 0;
  let swapsSum = 0;

  let totalWinPnL = 0;
  let winCount = 0;
  let totalLossPnL = 0;
  let lossCount = 0;

  for (const t of trades) {
    if (t.status === 'OPEN') continue;

    if (t.netPnL !== null && t.netPnL !== undefined) {
      netPnLSum = safeAdd(netPnLSum, t.netPnL);

      if (t.netPnL > 0) {
        totalWinPnL = safeAdd(totalWinPnL, t.netPnL);
        winCount++;
      } else if (t.netPnL < 0) {
        totalLossPnL = safeAdd(totalLossPnL, Math.abs(t.netPnL));
        lossCount++;
      }
    }

    if (t.grossPnL !== null && t.grossPnL !== undefined) {
      grossPnLSum = safeAdd(grossPnLSum, t.grossPnL);
    }
    if (t.commission !== null && t.commission !== undefined) {
      commissionsSum = safeAdd(commissionsSum, t.commission);
    }
    if (t.swap !== null && t.swap !== undefined) {
      swapsSum = safeAdd(swapsSum, t.swap);
    }
  }

  const avgWin = winCount > 0 ? safeDivide(totalWinPnL, winCount) : null;
  const avgLoss = lossCount > 0 ? safeDivide(totalLossPnL, lossCount) : null;
  const winLossRatio = avgWin !== null && avgLoss !== null && avgLoss > 0 ? safeDivide(avgWin, avgLoss) : null;

  return {
    totalTrades: trades.length,
    openTrades: winRate.open,
    closedTrades: winRate.closed,
    winRate,
    profitFactor,
    expectancy,
    drawdown,
    streaks,
    netPnLSum,
    grossPnLSum,
    commissionsSum,
    swapsSum,
    avgWin,
    avgLoss,
    winLossRatio,
  };
}
