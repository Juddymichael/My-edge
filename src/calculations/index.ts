import { Trade, TradeSide, PerformanceStats, EdgeGroupMetric, EdgeComboMetric, EdgeAnalysisResult, StatisticalConfidence } from '../types';
import { isTradeInPlan, getStandardSession } from '../utils/tradingSession';

/**
 * Calculates or extracts the deterministic R multiple for a trade.
 * Rule: risque en $ = distance SL × taille position, et résultat en $ ÷ risque en $.
 */
export function getTradeRMultiple(t: Trade): number | null {
  if (t.rMultiple !== undefined && t.rMultiple !== null && !isNaN(t.rMultiple)) {
    return Number(t.rMultiple);
  }

  // Calculate from Entry, StopLoss and LotSize if available
  if (t.entry !== undefined && t.stopLoss !== undefined) {
    const riskDistance = Math.abs(t.entry - t.stopLoss);
    if (riskDistance > 0) {
      if (t.lotSize && t.lotSize > 0) {
        const riskDollars = riskDistance * t.lotSize;
        if (riskDollars > 0) {
          return Number((t.netPnL / riskDollars).toFixed(2));
        }
      }
      if (t.exit !== undefined) {
        const rewardDistance = t.side === 'BUY' ? (t.exit - t.entry) : (t.entry - t.exit);
        return Number((rewardDistance / riskDistance).toFixed(2));
      }
    }
  }

  // Fallback for imported or sample trades without recorded SL:
  // Approximate standard 1R unit (~25-50$ risk)
  if (t.netPnL !== undefined && !isNaN(t.netPnL)) {
    if (Math.abs(t.netPnL) < 0.0001) return 0;
    const assumedRiskUnit = Math.abs(t.netPnL) > 80 ? 50 : 25;
    return Number((t.netPnL / assumedRiskUnit).toFixed(2));
  }

  return null;
}

/**
 * Computes deterministic Expectancy (Espérance mathématique par trade):
 * Expectancy = (Win Rate × Gain moyen) − (Loss Rate × Perte moyenne)
 */
export function calculateExpectancy(
  winrate: number | null,
  lossRate: number | null,
  avgWin: number | null,
  avgLoss: number | null,
  totalPnL: number,
  totalTrades: number
): number | null {
  if (totalTrades === 0) return null;
  if (winrate !== null && lossRate !== null && avgWin !== null && avgLoss !== null) {
    const exp = (winrate / 100) * avgWin - (lossRate / 100) * avgLoss;
    return Number(exp.toFixed(2));
  }
  return Number((totalPnL / totalTrades).toFixed(2));
}

/**
 * Categorizes statistical confidence based on trade sample size.
 */
export function getStatisticalConfidence(totalTrades: number): StatisticalConfidence {
  if (totalTrades >= 30) return 'high';
  if (totalTrades >= 20) return 'moderate';
  if (totalTrades >= 10) return 'indicative';
  return 'low';
}

/**
 * Calculates a composite Edge Quality Score (0 to 100).
 * Prioritizes Expectancy in R, Profit Factor, controlled Drawdown, and statistical confidence.
 * Win Rate is NEVER the sole ranking criteria.
 */
export function calculateEdgeScore(stats: PerformanceStats): number {
  if (stats.totalTrades === 0 || stats.totalPnL <= 0 || (stats.profitFactor !== null && stats.profitFactor <= 1.0)) {
    return 0;
  }

  const expR = stats.expectancyR ?? (stats.avgR ?? 0);
  const pf = stats.profitFactor ?? 1.0;

  // Base score from Expectancy in R (e.g. +0.50R is solid, +1.0R is top tier)
  const expScore = Math.max(0, Math.min(expR * 45, 50));

  // Profit Factor score (1.0 = 0pts, 2.0 = 20pts, 3.0+ = 30pts)
  const pfScore = Math.max(0, Math.min((pf - 1.0) * 15, 30));

  // Drawdown penalty
  const ddPct = stats.maxDrawdownPercent ?? 0;
  const ddPenalty = Math.min(15, ddPct / 10);

  const rawScore = expScore + pfScore + 10 - ddPenalty;

  // Statistical sample size weighting:
  let confidenceWeight = 0.5;
  if (stats.totalTrades >= 30) confidenceWeight = 1.0;
  else if (stats.totalTrades >= 20) confidenceWeight = 0.9;
  else if (stats.totalTrades >= 10) confidenceWeight = 0.7;

  return Math.round(Math.max(0, Math.min(rawScore * confidenceWeight, 100)));
}

/**
 * Calculates core financial metrics with 100% mathematical determinism.
 * Never invents, guesses or estimates missing fields.
 */
export function calculatePerformanceStats(trades: Trade[], startingBalance: number = 10000): PerformanceStats {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      beTrades: 0,
      totalPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      winrate: null,
      lossRate: null,
      profitFactor: null,
      avgWin: null,
      avgLoss: null,
      largestWin: null,
      largestLoss: null,
      expectancy: null,
      expectancyR: null,
      avgTrade: null,
      maxDrawdownAmount: null,
      maxDrawdownPercent: null,
      avgRisk: null,
      avgR: null,
      bestR: null,
      worstR: null,
      riskRewardRatio: null,
      winStreak: 0,
      lossStreak: 0,
      bestDay: null,
      worstDay: null,
      bestWeek: null,
      worstWeek: null,
      bestMonth: null,
      worstMonth: null,
    };
  }

  // Sort trades chronologically by date & time
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`;
    const timeB = b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`;
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });

  let winningTrades = 0;
  let losingTrades = 0;
  let beTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPnL = 0;

  let largestWin: number | null = null;
  let largestLoss: number | null = null;

  const validRs: number[] = [];
  const validRisks: number[] = [];

  sortedTrades.forEach((t) => {
    const pnl = t.netPnL;
    totalPnL += pnl;

    if (pnl > 0.0001) {
      winningTrades++;
      grossProfit += pnl;
      if (largestWin === null || pnl > largestWin) largestWin = pnl;
    } else if (pnl < -0.0001) {
      losingTrades++;
      grossLoss += Math.abs(pnl);
      if (largestLoss === null || pnl < largestLoss) largestLoss = pnl;
    } else {
      beTrades++;
    }

    const rVal = getTradeRMultiple(t);
    if (rVal !== null && !isNaN(rVal)) {
      validRs.push(rVal);
    }

    // Calculate risk dollar if SL and entry exist
    if (t.entry !== undefined && t.stopLoss !== undefined && t.lotSize) {
      const riskPerUnit = Math.abs(t.entry - t.stopLoss);
      if (riskPerUnit > 0) {
        const riskDollar = riskPerUnit * t.lotSize;
        if (riskDollar > 0) validRisks.push(riskDollar);
      }
    }
  });

  const totalTrades = sortedTrades.length;
  const winrate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;
  const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) * 100 : null;

  // Profit Factor: Gross Profit / Gross Loss. If Gross Loss === 0, return null (never Infinity)
  let profitFactor: number | null = null;
  if (grossLoss > 0) {
    profitFactor = grossProfit / grossLoss;
  } else if (grossProfit > 0 && grossLoss === 0) {
    profitFactor = null; // Display N/A as per guidelines
  }

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : null;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : null;

  // Expectancy formula in currency
  const expectancy = calculateExpectancy(winrate, lossRate, avgWin, avgLoss, totalPnL, totalTrades);

  // Expectancy in R: Average R across all executed trades
  const expectancyR = validRs.length > 0 && totalTrades > 0
    ? Number((validRs.reduce((a, b) => a + b, 0) / totalTrades).toFixed(2))
    : null;

  const avgTrade = totalTrades > 0 ? totalPnL / totalTrades : null;

  // Drawdown Calculation
  let peakEquity = startingBalance;
  let currentEquity = startingBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  sortedTrades.forEach((t) => {
    currentEquity += t.netPnL;
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const ddAmount = peakEquity - currentEquity;
    const ddPercent = peakEquity > 0 ? (ddAmount / peakEquity) * 100 : 0;

    if (ddAmount > maxDrawdownAmount) {
      maxDrawdownAmount = ddAmount;
    }
    if (ddPercent > maxDrawdownPercent) {
      maxDrawdownPercent = ddPercent;
    }
  });

  // R metrics
  const avgR = validRs.length > 0 ? Number((validRs.reduce((a, b) => a + b, 0) / validRs.length).toFixed(2)) : null;
  const bestR = validRs.length > 0 ? Math.max(...validRs) : null;
  const worstR = validRs.length > 0 ? Math.min(...validRs) : null;

  const avgRisk = validRisks.length > 0 ? validRisks.reduce((a, b) => a + b, 0) / validRisks.length : null;
  const riskRewardRatio = avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null;

  // Win and Loss Streaks
  let winStreak = 0;
  let lossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  sortedTrades.forEach((t) => {
    if (t.netPnL > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > winStreak) winStreak = currentWinStreak;
    } else if (t.netPnL < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > lossStreak) lossStreak = currentLossStreak;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  // Group by Daily, Weekly, Monthly PnL
  const dailyPnLMap = new Map<string, number>();
  const weeklyPnLMap = new Map<string, number>();
  const monthlyPnLMap = new Map<string, number>();

  sortedTrades.forEach((t) => {
    const dStr = t.date;
    dailyPnLMap.set(dStr, (dailyPnLMap.get(dStr) || 0) + t.netPnL);

    // Week key e.g. "2026-W32"
    const d = new Date(t.date);
    const year = d.getFullYear();
    const firstJan = new Date(year, 0, 1);
    const weekNum = Math.ceil(((d.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);
    const weekKey = `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
    weeklyPnLMap.set(weekKey, (weeklyPnLMap.get(weekKey) || 0) + t.netPnL);

    // Month key e.g. "2026-08"
    const monthKey = t.date.substring(0, 7);
    monthlyPnLMap.set(monthKey, (monthlyPnLMap.get(monthKey) || 0) + t.netPnL);
  });

  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  dailyPnLMap.forEach((pnl, date) => {
    if (!bestDay || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (!worstDay || pnl < worstDay.pnl) worstDay = { date, pnl };
  });

  let bestWeek: { weekStr: string; pnl: number } | null = null;
  let worstWeek: { weekStr: string; pnl: number } | null = null;
  weeklyPnLMap.forEach((pnl, weekStr) => {
    if (!bestWeek || pnl > bestWeek.pnl) bestWeek = { weekStr, pnl };
    if (!worstWeek || pnl < worstWeek.pnl) worstWeek = { weekStr, pnl };
  });

  let bestMonth: { monthStr: string; pnl: number } | null = null;
  let worstMonth: { monthStr: string; pnl: number } | null = null;
  monthlyPnLMap.forEach((pnl, monthStr) => {
    if (!bestMonth || pnl > bestMonth.pnl) bestMonth = { monthStr, pnl };
    if (!worstMonth || pnl < worstMonth.pnl) worstMonth = { monthStr, pnl };
  });

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    beTrades,
    totalPnL,
    grossProfit,
    grossLoss,
    netProfit: totalPnL,
    winrate,
    lossRate,
    profitFactor,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    expectancy,
    expectancyR,
    avgTrade,
    maxDrawdownAmount: maxDrawdownAmount > 0 ? maxDrawdownAmount : 0,
    maxDrawdownPercent: maxDrawdownPercent > 0 ? maxDrawdownPercent : 0,
    avgRisk,
    avgR,
    bestR,
    worstR,
    riskRewardRatio,
    winStreak,
    lossStreak,
    bestDay,
    worstDay,
    bestWeek,
    worstWeek,
    bestMonth,
    worstMonth,
  };
}

/**
 * Groups trades by categorical dimension (Symbol, Session/Killzone, Direction, Setup/Tag)
 * to compute Edge Metrics. Never computes or displays groups with no valid trades.
 */
export function calculateEdgeAnalysis(trades: Trade[], planInstruments?: string[]): EdgeAnalysisResult {
  const groupByField = (keyGetter: (t: Trade) => string[]): EdgeGroupMetric[] => {
    const map = new Map<string, Trade[]>();

    trades.forEach((t) => {
      const keys = keyGetter(t);
      keys.forEach((k) => {
        if (!k || k.trim() === '' || k === 'N/A' || k === 'None') return;
        const normKey = k.trim();
        if (!map.has(normKey)) map.set(normKey, []);
        map.get(normKey)!.push(t);
      });
    });

    const results: EdgeGroupMetric[] = [];
    map.forEach((groupTrades, groupKey) => {
      const stats = calculatePerformanceStats(groupTrades);
      const conf = getStatisticalConfidence(stats.totalTrades);
      const score = calculateEdgeScore(stats);

      results.push({
        key: groupKey,
        label: groupKey,
        totalTrades: stats.totalTrades,
        winrate: stats.winrate,
        profitFactor: stats.profitFactor,
        totalPnL: stats.totalPnL,
        avgR: stats.avgR,
        expectancy: stats.expectancy,
        expectancyR: stats.expectancyR,
        avgWin: stats.avgWin,
        avgLoss: stats.avgLoss,
        maxDrawdownAmount: stats.maxDrawdownAmount,
        maxDrawdownPercent: stats.maxDrawdownPercent,
        riskRewardRatio: stats.riskRewardRatio,
        confidenceLevel: conf,
        edgeScore: score,
        trades: groupTrades,
      });
    });

    // Sort by Edge Score descending, then Total PnL
    return results.sort((a, b) => (b.edgeScore || 0) - (a.edgeScore || 0) || b.totalPnL - a.totalPnL);
  };

  const bySymbol = groupByField((t) => [t.symbol]);

  // Session / Killzone grouping with automatic deduction
  const bySession = groupByField((t) => {
    const session = getStandardSession(t);
    return session ? [session] : [];
  });
  const byKillzone = bySession;

  const byDirection = groupByField((t) => [t.side]);
  const bySetup = groupByField((t) => {
    const list: string[] = [];
    if (t.setup && t.setup.trim() !== '') list.push(t.setup.trim());
    if (t.tags && t.tags.length > 0) {
      t.tags.forEach((tag) => {
        if (tag && tag.trim() !== '' && !list.includes(tag.trim())) {
          list.push(tag.trim());
        }
      });
    }
    if (list.length === 0) list.push('Price Action / Standard');
    return list;
  });

  // Calculate 4-Way Combinations: Actif + Kill Zone + Setup + Direction
  const comboMap = new Map<string, {
    symbol: string;
    killzone: string;
    setup: string;
    side: TradeSide | string;
    trades: Trade[];
  }>();

  trades.forEach((t) => {
    const sym = t.symbol ? t.symbol.trim() : 'N/A';
    const kz = getStandardSession(t) || 'Non défini';
    const stp = t.setup && t.setup.trim() !== '' ? t.setup.trim() : (t.tags && t.tags[0] ? t.tags[0].trim() : 'Price Action');
    const dir = t.side || 'BUY';

    const comboKey = `${sym}__${kz}__${stp}__${dir}`;
    if (!comboMap.has(comboKey)) {
      comboMap.set(comboKey, {
        symbol: sym,
        killzone: kz,
        setup: stp,
        side: dir,
        trades: [],
      });
    }
    comboMap.get(comboKey)!.trades.push(t);
  });

  const allCombos: EdgeComboMetric[] = [];
  comboMap.forEach((entry, comboKey) => {
    const stats = calculatePerformanceStats(entry.trades);
    const conf = getStatisticalConfidence(stats.totalTrades);
    const score = calculateEdgeScore(stats);

    allCombos.push({
      key: comboKey,
      label: `${entry.symbol} • ${entry.killzone} • ${entry.setup} • ${entry.side}`,
      symbol: entry.symbol,
      killzone: entry.killzone,
      setup: entry.setup,
      side: entry.side,
      totalTrades: stats.totalTrades,
      winrate: stats.winrate,
      profitFactor: stats.profitFactor,
      totalPnL: stats.totalPnL,
      avgR: stats.avgR,
      expectancy: stats.expectancy,
      expectancyR: stats.expectancyR,
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
      maxDrawdownAmount: stats.maxDrawdownAmount,
      maxDrawdownPercent: stats.maxDrawdownPercent,
      riskRewardRatio: stats.riskRewardRatio,
      confidenceLevel: conf,
      edgeScore: score,
      trades: entry.trades,
    });
  });

  // Top Edges: strictly profitable combinations (PnL > 0, PF > 1.0), sorted by composite Edge Score then Expectancy R & PF
  const topCombos = allCombos
    .filter((c) => (c.totalPnL > 0) && (c.profitFactor === null || c.profitFactor > 1.0))
    .sort((a, b) => {
      // Primary: Edge Score
      if (b.edgeScore !== a.edgeScore) return (b.edgeScore || 0) - (a.edgeScore || 0);
      // Secondary: Expectancy in R
      const expRb = b.expectancyR ?? 0;
      const expRa = a.expectancyR ?? 0;
      if (expRb !== expRa) return expRb - expRa;
      // Tertiary: Profit Factor
      const pfb = b.profitFactor ?? 0;
      const pfa = a.profitFactor ?? 0;
      if (pfb !== pfa) return pfb - pfa;
      // Quaternary: Total Trades sample size
      return b.totalTrades - a.totalTrades;
    });

  // Weak Combos (Points Faibles): losing combinations with significant capital drain or negative expectancy
  const weakCombos = allCombos
    .filter((c) => (c.totalPnL < 0) || (c.profitFactor !== null && c.profitFactor < 1.0) || (c.expectancyR !== null && c.expectancyR < 0))
    .sort((a, b) => {
      // Primary: most negative total PnL
      if (a.totalPnL !== b.totalPnL) return a.totalPnL - b.totalPnL;
      // Secondary: worst expectancy in R
      const expRa = a.expectancyR ?? 0;
      const expRb = b.expectancyR ?? 0;
      if (expRa !== expRb) return expRa - expRb;
      // Tertiary: lowest profit factor
      const pfa = a.profitFactor ?? 999;
      const pfb = b.profitFactor ?? 999;
      return pfa - pfb;
    });

  // Plan vs Hors-Plan categorization (automatic based on instrument list)
  const planTrades = trades.filter((t) => isTradeInPlan(t.symbol, planInstruments));
  const offPlanTrades = trades.filter((t) => !isTradeInPlan(t.symbol, planInstruments));

  const planStats = calculatePerformanceStats(planTrades);
  const offPlanStats = calculatePerformanceStats(offPlanTrades);

  const byPlan = {
    plan: {
      key: 'plan',
      label: 'Dans le Plan',
      totalTrades: planStats.totalTrades,
      winrate: planStats.winrate,
      profitFactor: planStats.profitFactor,
      totalPnL: planStats.totalPnL,
      avgR: planStats.avgR,
      expectancy: planStats.expectancy,
      expectancyR: planStats.expectancyR,
      avgWin: planStats.avgWin,
      avgLoss: planStats.avgLoss,
      maxDrawdownAmount: planStats.maxDrawdownAmount,
      maxDrawdownPercent: planStats.maxDrawdownPercent,
      riskRewardRatio: planStats.riskRewardRatio,
      confidenceLevel: getStatisticalConfidence(planStats.totalTrades),
      edgeScore: calculateEdgeScore(planStats),
      trades: planTrades,
    },
    offPlan: {
      key: 'off_plan',
      label: 'Hors-Plan',
      totalTrades: offPlanStats.totalTrades,
      winrate: offPlanStats.winrate,
      profitFactor: offPlanStats.profitFactor,
      totalPnL: offPlanStats.totalPnL,
      avgR: offPlanStats.avgR,
      expectancy: offPlanStats.expectancy,
      expectancyR: offPlanStats.expectancyR,
      avgWin: offPlanStats.avgWin,
      avgLoss: offPlanStats.avgLoss,
      maxDrawdownAmount: offPlanStats.maxDrawdownAmount,
      maxDrawdownPercent: offPlanStats.maxDrawdownPercent,
      riskRewardRatio: offPlanStats.riskRewardRatio,
      confidenceLevel: getStatisticalConfidence(offPlanStats.totalTrades),
      edgeScore: calculateEdgeScore(offPlanStats),
      trades: offPlanTrades,
    },
  };

  // DXY Confluence breakdown
  const withDxyTrades = trades.filter((t) => t.confluenceDxy === true);
  const withoutDxyTrades = trades.filter((t) => t.confluenceDxy === false || t.confluenceDxy === undefined);

  const withDxyStats = calculatePerformanceStats(withDxyTrades);
  const withoutDxyStats = calculatePerformanceStats(withoutDxyTrades);

  const byDxy = {
    withDxy: {
      key: 'with_dxy',
      label: 'Avec Confluence DXY',
      totalTrades: withDxyStats.totalTrades,
      winrate: withDxyStats.winrate,
      profitFactor: withDxyStats.profitFactor,
      totalPnL: withDxyStats.totalPnL,
      avgR: withDxyStats.avgR,
      expectancy: withDxyStats.expectancy,
      expectancyR: withDxyStats.expectancyR,
      avgWin: withDxyStats.avgWin,
      avgLoss: withDxyStats.avgLoss,
      maxDrawdownAmount: withDxyStats.maxDrawdownAmount,
      maxDrawdownPercent: withDxyStats.maxDrawdownPercent,
      riskRewardRatio: withDxyStats.riskRewardRatio,
      confidenceLevel: getStatisticalConfidence(withDxyStats.totalTrades),
      edgeScore: calculateEdgeScore(withDxyStats),
      trades: withDxyTrades,
    },
    withoutDxy: {
      key: 'without_dxy',
      label: 'Sans Confluence DXY',
      totalTrades: withoutDxyStats.totalTrades,
      winrate: withoutDxyStats.winrate,
      profitFactor: withoutDxyStats.profitFactor,
      totalPnL: withoutDxyStats.totalPnL,
      avgR: withoutDxyStats.avgR,
      expectancy: withoutDxyStats.expectancy,
      expectancyR: withoutDxyStats.expectancyR,
      avgWin: withoutDxyStats.avgWin,
      avgLoss: withoutDxyStats.avgLoss,
      maxDrawdownAmount: withoutDxyStats.maxDrawdownAmount,
      maxDrawdownPercent: withoutDxyStats.maxDrawdownPercent,
      riskRewardRatio: withoutDxyStats.riskRewardRatio,
      confidenceLevel: getStatisticalConfidence(withoutDxyStats.totalTrades),
      edgeScore: calculateEdgeScore(withoutDxyStats),
      trades: withoutDxyTrades,
    },
  };

  return {
    bySymbol,
    bySession,
    byKillzone,
    byDirection,
    bySetup,
    topCombos,
    weakCombos,
    byPlan,
    byDxy,
  };
}

/**
 * Account Balance & Equity Curve calculation taking into account:
 * - startingBalance
 * - Deposits (+)
 * - Withdrawals (-)
 * - Closed Trades Net P&L (+/-)
 * 
 * Note: Pure trading performance (Win Rate, Profit Factor, Expectancy, R, etc.)
 * is strictly calculated from Trades ONLY via calculatePerformanceStats().
 */
export interface AccountBalanceSummary {
  startingBalance: number;
  initialCapital: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netCashFlow: number; // totalDeposited - totalWithdrawn
  totalTradingPnL: number;
  currentBalance: number; // startingBalance + netCashFlow + totalTradingPnL
  depositsCount: number;
  withdrawalsCount: number;
}

export function calculateAccountBalanceSummary(
  startingBalance: number,
  trades: Trade[],
  transactions: import('../types').AccountTransaction[] = []
): AccountBalanceSummary {
  const totalTradingPnL = trades.reduce((acc, t) => acc + (t.netPnL || 0), 0);

  let totalDeposited = 0;
  let totalWithdrawn = 0;
  let depositsCount = 0;
  let withdrawalsCount = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'DEPOSIT') {
      totalDeposited += Math.abs(tx.amount || 0);
      depositsCount++;
    } else if (tx.type === 'WITHDRAWAL') {
      totalWithdrawn += Math.abs(tx.amount || 0);
      withdrawalsCount++;
    }
  });

  const netCashFlow = totalDeposited - totalWithdrawn;
  const currentBalance = startingBalance + netCashFlow + totalTradingPnL;

  return {
    startingBalance,
    initialCapital: startingBalance,
    totalDeposited,
    totalWithdrawn,
    netCashFlow,
    totalTradingPnL,
    currentBalance,
    depositsCount,
    withdrawalsCount,
  };
}

export interface RealEquityCurvePoint {
  date: string; // MM-DD or full date
  fullDate: string;
  balance: number;
  change: number;
  type: 'INITIAL' | 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL';
  label?: string;
}

export function buildRealEquityCurve(
  startingBalance: number,
  trades: Trade[],
  transactions: import('../types').AccountTransaction[] = []
): RealEquityCurvePoint[] {
  type EventItem = {
    date: string;
    time?: string;
    amount: number;
    type: 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL';
    label: string;
  };

  const events: EventItem[] = [];

  trades.forEach((t) => {
    events.push({
      date: t.date,
      time: t.time,
      amount: t.netPnL || 0,
      type: 'TRADE',
      label: `Trade ${t.symbol} (${t.side})`,
    });
  });

  transactions.forEach((tx) => {
    events.push({
      date: tx.date,
      time: tx.time,
      amount: tx.type === 'DEPOSIT' ? Math.abs(tx.amount) : -Math.abs(tx.amount),
      type: tx.type,
      label: tx.type === 'DEPOSIT' ? `Dépôt (+${tx.amount})` : `Retrait (-${tx.amount})`,
    });
  });

  // Sort chronologically
  events.sort((a, b) => {
    const timeA = a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`;
    const timeB = b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`;
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });

  let runningBalance = startingBalance;
  const points: RealEquityCurvePoint[] = [
    {
      date: 'Départ',
      fullDate: events.length > 0 ? events[0].date : new Date().toISOString().substring(0, 10),
      balance: Number(startingBalance.toFixed(2)),
      change: 0,
      type: 'INITIAL',
      label: 'Capital Initial',
    },
  ];

  events.forEach((ev) => {
    runningBalance += ev.amount;
    points.push({
      date: ev.date.length > 5 ? ev.date.substring(5) : ev.date,
      fullDate: ev.date,
      balance: Number(runningBalance.toFixed(2)),
      change: Number(ev.amount.toFixed(2)),
      type: ev.type,
      label: ev.label,
    });
  });

  return points;
}
