import { Trade, PerformanceStats } from '../types';
import { calculatePerformanceStats as baseCalculatePerformanceStats } from './index';

/**
 * Production-grade statistics layer.
 *
 * - Win/Loss rate is a hit rate over decisive trades only (BE excluded).
 * - Expectancy uses probabilities over ALL trades, so BE remains a zero-outcome.
 * - R is never estimated from an arbitrary dollar risk assumption.
 */
export function getReliableRMultiple(t: Trade): number | null {
  if (t.rMultiple !== undefined && t.rMultiple !== null && Number.isFinite(t.rMultiple)) {
    return Number(t.rMultiple);
  }

  if (
    t.entry !== undefined && t.stopLoss !== undefined && t.exit !== undefined &&
    Number.isFinite(t.entry) && Number.isFinite(t.stopLoss) && Number.isFinite(t.exit)
  ) {
    const risk = Math.abs(t.entry - t.stopLoss);
    if (risk <= 0) return null;
    const reward = t.side === 'SELL' ? t.entry - t.exit : t.exit - t.entry;
    return Number((reward / risk).toFixed(4));
  }

  return null;
}

export function calculateReliableExpectancy(
  winningTrades: number,
  losingTrades: number,
  avgWin: number | null,
  avgLoss: number | null,
  totalTrades: number
): number | null {
  if (totalTrades <= 0 || avgWin === null || avgLoss === null) return null;

  // BE probability is implicitly included because win/loss probabilities are
  // measured against ALL trades; BE contributes 0 to expected value.
  const winProbability = winningTrades / totalTrades;
  const lossProbability = losingTrades / totalTrades;
  return Number((winProbability * avgWin - lossProbability * avgLoss).toFixed(2));
}

export function calculateReliablePerformanceStats(
  trades: Trade[],
  startingBalance: number = 10000
): PerformanceStats {
  const base = baseCalculatePerformanceStats(trades, startingBalance);
  if (!trades || trades.length === 0) return base;

  const wins = trades.filter((t) => Number(t.netPnL) > 0.0001).length;
  const losses = trades.filter((t) => Number(t.netPnL) < -0.0001).length;
  const decisive = wins + losses;

  // Hit rate: BE trades do not count as wins or losses.
  const winrate = decisive > 0 ? Number(((wins / decisive) * 100).toFixed(2)) : null;
  const lossRate = decisive > 0 ? Number(((losses / decisive) * 100).toFixed(2)) : null;
  const expectancy = calculateReliableExpectancy(wins, losses, base.avgWin, base.avgLoss, trades.length);

  const rValues = trades.map(getReliableRMultiple).filter((r): r is number => r !== null && Number.isFinite(r));
  const avgR = rValues.length > 0 ? Number((rValues.reduce((sum, r) => sum + r, 0) / rValues.length).toFixed(2)) : null;

  return {
    ...base,
    winrate,
    lossRate,
    expectancy,
    // This is the mean observed R among trades with a reliable R value.
    expectancyR: avgR,
    avgR,
    bestR: rValues.length > 0 ? Math.max(...rValues) : null,
    worstR: rValues.length > 0 ? Math.min(...rValues) : null,
  };
}

export function getExpectancyConfidence(totalTrades: number): {
  label: string;
  level: 'low' | 'indicative' | 'moderate' | 'high';
} {
  if (totalTrades >= 30) return { label: 'Échantillon solide', level: 'high' };
  if (totalTrades >= 20) return { label: 'Confiance modérée', level: 'moderate' };
  if (totalTrades >= 10) return { label: 'Tendance indicative', level: 'indicative' };
  return { label: 'Échantillon insuffisant', level: 'low' };
}
