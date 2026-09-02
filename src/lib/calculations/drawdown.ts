import { Trade } from '../../types/trade';
import { DrawdownResult, DrawdownPoint } from '../../types/calculations';
import { safeAdd } from './precision';

/**
 * Calculates Drawdown from the chronological equity curve.
 * Peak = maximum historical equity.
 * Drawdown = Peak - currentEquity.
 * Max Drawdown = max(Drawdown).
 * NEVER simply uses the single largest loss.
 */
export function calculateDrawdown(
  trades: Trade[],
  initialBalance = 10000
): DrawdownResult {
  // Filter closed trades with valid netPnL
  const closedTrades = trades
    .filter((t) => t.status !== 'OPEN' && t.netPnL !== null && t.netPnL !== undefined)
    .sort((a, b) => {
      const timeA = new Date(a.closedAt || a.openedAt).getTime();
      const timeB = new Date(b.closedAt || b.openedAt).getTime();
      return timeA - timeB;
    });

  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const equityCurve: DrawdownPoint[] = [
    {
      tradeId: 'initial',
      date: closedTrades[0]?.openedAt || new Date().toISOString(),
      balance: initialBalance,
      peak: initialBalance,
      drawdown: 0,
      drawdownPercent: 0,
    },
  ];

  // Track drawdown episodes to calculate recovery duration for max drawdown
  interface DdEpisode {
    peakIndex: number;
    peakDate: string;
    peakBalance: number;
    troughIndex: number;
    troughDate: string;
    maxDdMoney: number;
    maxDdPct: number;
    recoveryIndex: number | null;
    recoveryDate: string | null;
  }

  let currentEpisode: DdEpisode | null = null;
  const allEpisodes: DdEpisode[] = [];
  let currentPeakIndex = 0;
  let currentPeakDate = closedTrades[0]?.openedAt || new Date().toISOString();

  for (let i = 0; i < closedTrades.length; i++) {
    const trade = closedTrades[i];
    const pnl = trade.netPnL ?? 0;
    const tradeDate = trade.closedAt || trade.openedAt;
    currentBalance = safeAdd(currentBalance, pnl);

    if (currentBalance >= peakBalance) {
      // New peak reached: if we were in a drawdown episode, close it with recovery info
      if (currentEpisode) {
        currentEpisode.recoveryIndex = i + 1;
        currentEpisode.recoveryDate = tradeDate;
        allEpisodes.push(currentEpisode);
        currentEpisode = null;
      }
      peakBalance = currentBalance;
      currentPeakIndex = i + 1;
      currentPeakDate = tradeDate;
    } else {
      // Currently below peak (in drawdown)
      const currentDd = Math.max(0, peakBalance - currentBalance);
      const currentDdPercent = peakBalance > 0 ? (currentDd / peakBalance) * 100 : 0;

      if (!currentEpisode) {
        currentEpisode = {
          peakIndex: currentPeakIndex,
          peakDate: currentPeakDate,
          peakBalance,
          troughIndex: i + 1,
          troughDate: tradeDate,
          maxDdMoney: currentDd,
          maxDdPct: currentDdPercent,
          recoveryIndex: null,
          recoveryDate: null,
        };
      } else {
        if (currentDd > currentEpisode.maxDdMoney) {
          currentEpisode.maxDdMoney = currentDd;
          currentEpisode.maxDdPct = currentDdPercent;
          currentEpisode.troughIndex = i + 1;
          currentEpisode.troughDate = tradeDate;
        }
      }

      if (currentDd > maxDrawdown) {
        maxDrawdown = currentDd;
      }
      if (currentDdPercent > maxDrawdownPercent) {
        maxDrawdownPercent = currentDdPercent;
      }
    }

    const currentDd = Math.max(0, peakBalance - currentBalance);
    const currentDdPercent = peakBalance > 0 ? (currentDd / peakBalance) * 100 : 0;

    equityCurve.push({
      tradeId: trade.id,
      date: tradeDate,
      balance: currentBalance,
      peak: peakBalance,
      drawdown: currentDd,
      drawdownPercent: currentDdPercent,
    });
  }

  // If still in unrecovered drawdown episode
  if (currentEpisode) {
    allEpisodes.push(currentEpisode);
  }

  // Find episode with max drawdown money
  let worstEpisode: DdEpisode | null = null;
  for (const ep of allEpisodes) {
    if (!worstEpisode || ep.maxDdMoney > worstEpisode.maxDdMoney) {
      worstEpisode = ep;
    }
  }

  let recoveryTrades: number | null = null;
  let recoveryDays: number | null = null;
  let isMaxDrawdownRecovered = false;
  let maxDrawdownPeakDate: string | null = null;
  let maxDrawdownTroughDate: string | null = null;
  let maxDrawdownRecoveryDate: string | null = null;

  if (worstEpisode && worstEpisode.maxDdMoney > 0) {
    maxDrawdownPeakDate = worstEpisode.peakDate;
    maxDrawdownTroughDate = worstEpisode.troughDate;

    if (worstEpisode.recoveryIndex !== null && worstEpisode.recoveryDate) {
      isMaxDrawdownRecovered = true;
      maxDrawdownRecoveryDate = worstEpisode.recoveryDate;
      recoveryTrades = worstEpisode.recoveryIndex - worstEpisode.peakIndex;
      const peakTime = new Date(worstEpisode.peakDate).getTime();
      const recTime = new Date(worstEpisode.recoveryDate).getTime();
      recoveryDays = Math.max(1, Math.round((recTime - peakTime) / (1000 * 60 * 60 * 24)));
    } else {
      isMaxDrawdownRecovered = false;
      // Ongoing drawdown duration
      recoveryTrades = closedTrades.length - worstEpisode.peakIndex;
      const peakTime = new Date(worstEpisode.peakDate).getTime();
      const nowTime = new Date().getTime();
      recoveryDays = Math.max(1, Math.round((nowTime - peakTime) / (1000 * 60 * 60 * 24)));
    }
  }

  const latestDd = Math.max(0, peakBalance - currentBalance);
  const latestDdPercent = peakBalance > 0 ? (latestDd / peakBalance) * 100 : 0;

  return {
    maxDrawdown,
    maxDrawdownPercent,
    currentDrawdown: latestDd,
    currentDrawdownPercent: latestDdPercent,
    peakBalance,
    currentBalance,
    equityCurve,
    recoveryTrades,
    recoveryDays,
    isMaxDrawdownRecovered,
    maxDrawdownPeakDate,
    maxDrawdownTroughDate,
    maxDrawdownRecoveryDate,
  };
}
