import { Trade } from '../../types/trade';
import { StreakResult } from '../../types/calculations';

const EPSILON = 0.00001;

/**
 * Calculates win/loss streaks chronologically.
 */
export function calculateStreaks(trades: Trade[]): StreakResult {
  const closedTrades = trades
    .filter((t) => t.status !== 'OPEN' && t.netPnL !== null && t.netPnL !== undefined)
    .sort((a, b) => {
      const timeA = new Date(a.closedAt || a.openedAt).getTime();
      const timeB = new Date(b.closedAt || b.openedAt).getTime();
      return timeA - timeB;
    });

  if (closedTrades.length === 0) {
    return {
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreakType: 'NONE',
      currentStreakCount: 0,
    };
  }

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;

  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const trade of closedTrades) {
    const pnl = trade.netPnL ?? 0;

    if (pnl > EPSILON) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxConsecutiveWins) {
        maxConsecutiveWins = currentWinStreak;
      }
    } else if (pnl < -EPSILON) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentLossStreak;
      }
    } else {
      // Breakeven resets directional streaks
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  // Determine latest current streak
  let currentStreakType: StreakResult['currentStreakType'] = 'NONE';
  let currentStreakCount = 0;

  if (closedTrades.length > 0) {
    const lastTrade = closedTrades[closedTrades.length - 1];
    const lastPnl = lastTrade.netPnL ?? 0;

    if (lastPnl > EPSILON) {
      currentStreakType = 'WIN';
      currentStreakCount = currentWinStreak;
    } else if (lastPnl < -EPSILON) {
      currentStreakType = 'LOSS';
      currentStreakCount = currentLossStreak;
    } else {
      currentStreakType = 'BREAKEVEN';
      currentStreakCount = 1;
    }
  }

  return {
    maxConsecutiveWins,
    maxConsecutiveLosses,
    currentStreakType,
    currentStreakCount,
  };
}
