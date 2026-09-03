import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import { calculateMyEdgeDeepAudit } from './calculations/edge';
import { calculateDrawdown } from './calculations/drawdown';
import { calculateStreaks } from './calculations/streaks';
import { formatCurrency, formatPercent, formatRMultiple } from './formatting';

export interface CoachContextPayload {
  summary: {
    totalTrades: number;
    closedTrades: number;
    openTrades: number;
    winRate: number;
    wins: number;
    losses: number;
    breakevens: number;
    netPnL: number;
    profitFactor: number | null;
    monetaryExpectancy: number;
    rExpectancy: number | null;
    maxDrawdownPercent: number;
    maxDrawdownMoney: number;
    currentStreak: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    disciplineRate: number;
  };
  setups: Array<{
    name: string;
    sampleSize: number;
    winRate: number;
    netPnL: number;
    totalR: number | null;
    rExpectancy: number | null;
    profitFactor: number | null;
    edgeScore: number;
    rating: string;
    confidenceTier: string;
  }>;
  killzones: Array<{
    killzone: string;
    sampleSize: number;
    winRate: number;
    netPnL: number;
    profitFactor: number | null;
  }>;
  pairs: Array<{
    symbol: string;
    sampleSize: number;
    winRate: number;
    netPnL: number;
    profitFactor: number | null;
  }>;
  directions: {
    buy: { sampleSize: number; winRate: number; netPnL: number; profitFactor: number | null };
    sell: { sampleSize: number; winRate: number; netPnL: number; profitFactor: number | null };
  };
  myEdgeVerdict: {
    bestSetup: string | null;
    worstSetup: string | null;
    bestPair: string | null;
    worstPair: string | null;
    bestKillzone: string | null;
    worstKillzone: string | null;
    topCombination: string | null;
    keyTakeaway: string;
    recurringConditions: string[];
  };
  mistakes: Array<{
    mistake: string;
    count: number;
    totalCost: number;
  }>;
  emotions: Array<{
    emotion: string;
    count: number;
    winRate: number;
    netPnL: number;
  }>;
  postLossBehavior: {
    tradesImmediatelyAfterLoss: number;
    winRateAfterLoss: number;
    mistakeRateAfterLoss: number;
    mostFrequentMistakeAfterLoss: string | null;
    avgRMultipleAfterLoss: number | null;
  };
  weeklyComparison: {
    currentWeekTrades: number;
    currentWeekPnL: number;
    currentWeekWinRate: number;
    previousWeekTrades: number;
    previousWeekPnL: number;
    previousWeekWinRate: number;
  };
  recentTrades: Array<{
    id: string;
    date: string;
    symbol: string;
    direction: string;
    setup: string;
    killzone: string;
    rMultiple: number | null;
    netPnL: number | null;
    status: string;
    mistake: string;
    emotion: string;
    notes?: string;
  }>;
}

export function buildCoachContext(
  trades: Trade[] = [],
  setups: Setup[] = [],
  initialBalance: number = 10000
): CoachContextPayload {
  const safeTrades = (trades || []).filter((t) => t !== null && t !== undefined);
  const closedTrades = safeTrades
    .filter((t) => t.status !== 'OPEN' && t.netPnL !== null && t.netPnL !== undefined)
    .sort((a, b) => new Date(a.closedAt || a.openedAt).getTime() - new Date(b.closedAt || b.openedAt).getTime());

  // 1. Global Metrics
  const EPSILON = 0.0001;
  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalNetPnL = 0;
  let totalR = 0;
  let rCount = 0;

  for (const t of closedTrades) {
    const pnl = t.netPnL ?? 0;
    totalNetPnL += pnl;
    if (pnl > EPSILON) {
      wins++;
      grossProfit += pnl;
    } else if (pnl < -EPSILON) {
      losses++;
      grossLoss += Math.abs(pnl);
    } else {
      breakevens++;
    }

    if (t.rMultiple !== null && t.rMultiple !== undefined && !isNaN(t.rMultiple)) {
      totalR += t.rMultiple;
      rCount++;
    }
  }

  const closedCount = closedTrades.length;
  const winRate = closedCount > 0 ? (wins / closedCount) * 100 : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;
  const winFraction = closedCount > 0 ? wins / closedCount : 0;
  const lossFraction = closedCount > 0 ? losses / closedCount : 0;
  const monetaryExpectancy = closedCount > 0 ? winFraction * avgWin - lossFraction * avgLoss : 0;
  const rExpectancy = rCount > 0 ? totalR / rCount : null;

  const dd = calculateDrawdown(closedTrades, initialBalance);
  const streaks = calculateStreaks(closedTrades);

  // Discipline Rate
  const cleanTradesCount = closedTrades.filter((t) => !t.mistake || t.mistake === 'NONE').length;
  const disciplineRate = closedCount > 0 ? Math.round((cleanTradesCount / closedCount) * 100) : 100;

  // 2. Edge Deep Audit
  const edgeAudit = calculateMyEdgeDeepAudit(safeTrades, setups);

  // 3. Setups Breakdown
  const setupsList = edgeAudit.setups.map((s) => ({
    name: s.label,
    sampleSize: s.closedTrades,
    winRate: s.winRate,
    netPnL: s.totalNetPnL,
    totalR: s.totalR,
    rExpectancy: s.rExpectancy,
    profitFactor: s.profitFactor,
    edgeScore: s.edgeScore.totalScore,
    rating: s.edgeScore.ratingLabel,
    confidenceTier: s.confidenceTier,
  }));

  // 4. Sessions Breakdown
  const killzonesList = edgeAudit.killzones.map((s) => ({
    killzone: s.label,
    sampleSize: s.closedTrades,
    winRate: s.winRate,
    netPnL: s.totalNetPnL,
    profitFactor: s.profitFactor,
  }));

  // 5. Pairs Breakdown
  const pairsList = edgeAudit.pairs.map((p) => ({
    symbol: p.label,
    sampleSize: p.closedTrades,
    winRate: p.winRate,
    netPnL: p.totalNetPnL,
    profitFactor: p.profitFactor,
  }));

  // 6. Directions
  const buyPerf = edgeAudit.directions.find((d) => d.key === 'BUY');
  const sellPerf = edgeAudit.directions.find((d) => d.key === 'SELL');
  const directions = {
    buy: {
      sampleSize: buyPerf?.closedTrades ?? 0,
      winRate: buyPerf?.winRate ?? 0,
      netPnL: buyPerf?.totalNetPnL ?? 0,
      profitFactor: buyPerf?.profitFactor ?? null,
    },
    sell: {
      sampleSize: sellPerf?.closedTrades ?? 0,
      winRate: sellPerf?.winRate ?? 0,
      netPnL: sellPerf?.totalNetPnL ?? 0,
      profitFactor: sellPerf?.profitFactor ?? null,
    },
  };

  // 7. Mistakes & Psychological Leaks
  const mistakeMap = new Map<string, { count: number; totalCost: number }>();
  for (const t of closedTrades) {
    const m = t.mistake || 'NONE';
    if (m === 'NONE') continue;
    const cur = mistakeMap.get(m) || { count: 0, totalCost: 0 };
    cur.count++;
    if (t.netPnL !== null && t.netPnL < 0) {
      cur.totalCost += Math.abs(t.netPnL);
    }
    mistakeMap.set(m, cur);
  }
  const mistakes = Array.from(mistakeMap.entries())
    .map(([mistake, val]) => ({ mistake, count: val.count, totalCost: val.totalCost }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // 8. Emotional Correlations
  const emotionMap = new Map<string, { count: number; wins: number; pnl: number }>();
  for (const t of closedTrades) {
    const em = t.emotion || 'NEUTRAL';
    const cur = emotionMap.get(em) || { count: 0, wins: 0, pnl: 0 };
    cur.count++;
    if (t.netPnL && t.netPnL > 0) cur.wins++;
    cur.pnl += t.netPnL ?? 0;
    emotionMap.set(em, cur);
  }
  const emotions = Array.from(emotionMap.entries()).map(([emotion, val]) => ({
    emotion,
    count: val.count,
    winRate: val.count > 0 ? (val.wins / val.count) * 100 : 0,
    netPnL: val.pnl,
  }));

  // 9. Post-Loss Behavior Analysis
  let postLossTradesCount = 0;
  let postLossWins = 0;
  let postLossMistakesCount = 0;
  let postLossTotalR = 0;
  let postLossRCount = 0;
  const postLossMistakeFreq = new Map<string, number>();

  for (let i = 1; i < closedTrades.length; i++) {
    const prevTrade = closedTrades[i - 1];
    const curTrade = closedTrades[i];
    if (prevTrade.netPnL !== null && prevTrade.netPnL < -EPSILON) {
      postLossTradesCount++;
      if (curTrade.netPnL !== null && curTrade.netPnL > EPSILON) {
        postLossWins++;
      }
      if (curTrade.mistake && curTrade.mistake !== 'NONE') {
        postLossMistakesCount++;
        postLossMistakeFreq.set(curTrade.mistake, (postLossMistakeFreq.get(curTrade.mistake) || 0) + 1);
      }
      if (curTrade.rMultiple !== null && !isNaN(curTrade.rMultiple)) {
        postLossTotalR += curTrade.rMultiple;
        postLossRCount++;
      }
    }
  }

  let mostFreqPostLossMistake: string | null = null;
  let maxCount = 0;
  for (const [m, count] of postLossMistakeFreq.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostFreqPostLossMistake = m;
    }
  }

  const postLossBehavior = {
    tradesImmediatelyAfterLoss: postLossTradesCount,
    winRateAfterLoss: postLossTradesCount > 0 ? (postLossWins / postLossTradesCount) * 100 : 0,
    mistakeRateAfterLoss: postLossTradesCount > 0 ? (postLossMistakesCount / postLossTradesCount) * 100 : 0,
    mostFrequentMistakeAfterLoss: mostFreqPostLossMistake,
    avgRMultipleAfterLoss: postLossRCount > 0 ? postLossTotalR / postLossRCount : null,
  };

  // 10. Weekly Comparison
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * oneDayMs);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * oneDayMs);

  const curWeekTrades = closedTrades.filter((t) => {
    const time = new Date(t.closedAt || t.openedAt).getTime();
    return time >= sevenDaysAgo.getTime();
  });
  const prevWeekTrades = closedTrades.filter((t) => {
    const time = new Date(t.closedAt || t.openedAt).getTime();
    return time >= fourteenDaysAgo.getTime() && time < sevenDaysAgo.getTime();
  });

  const getWeekStats = (trList: Trade[]) => {
    let pnl = 0;
    let w = 0;
    trList.forEach((t) => {
      pnl += t.netPnL ?? 0;
      if (t.netPnL && t.netPnL > 0) w++;
    });
    return {
      trades: trList.length,
      pnl,
      winRate: trList.length > 0 ? (w / trList.length) * 100 : 0,
    };
  };

  const curWeekStats = getWeekStats(curWeekTrades);
  const prevWeekStats = getWeekStats(prevWeekTrades);

  const weeklyComparison = {
    currentWeekTrades: curWeekStats.trades,
    currentWeekPnL: curWeekStats.pnl,
    currentWeekWinRate: curWeekStats.winRate,
    previousWeekTrades: prevWeekStats.trades,
    previousWeekPnL: prevWeekStats.pnl,
    previousWeekWinRate: prevWeekStats.winRate,
  };

  // 11. Recent 15 Trades
  const recentTrades = [...closedTrades]
    .reverse()
    .slice(0, 15)
    .map((t) => ({
      id: t.ticket || t.id.slice(0, 8),
      date: (t.closedAt || t.openedAt).slice(0, 10),
      symbol: t.symbol,
      direction: t.direction,
      setup: t.setup || t.setupId || 'Non spécifié',
      session: t.session || 'Standard',
      rMultiple: t.rMultiple ?? null,
      netPnL: t.netPnL ?? null,
      status: t.status,
      mistake: t.mistake || 'NONE',
      emotion: t.emotion || 'NEUTRAL',
      notes: t.notes || undefined,
    }));

  return {
    summary: {
      totalTrades: safeTrades.length,
      closedTrades: closedCount,
      openTrades: safeTrades.length - closedCount,
      winRate,
      wins,
      losses,
      breakevens,
      netPnL: totalNetPnL,
      profitFactor,
      monetaryExpectancy,
      rExpectancy,
      maxDrawdownPercent: dd.maxDrawdownPercent,
      maxDrawdownMoney: dd.maxDrawdown,
      currentStreak: streaks.currentStreakCount,
      maxConsecutiveWins: streaks.maxConsecutiveWins,
      maxConsecutiveLosses: streaks.maxConsecutiveLosses,
      disciplineRate,
    },
    setups: setupsList,
    killzones: killzonesList,
    pairs: pairsList,
    directions,
    myEdgeVerdict: {
      bestSetup: edgeAudit.verdict.bestSetup?.label || null,
      worstSetup: edgeAudit.verdict.worstSetup?.label || null,
      bestPair: edgeAudit.verdict.bestPair?.label || null,
      worstPair: edgeAudit.verdict.worstPair?.label || null,
      bestKillzone: edgeAudit.verdict.bestKillzone?.label || null,
      worstKillzone: edgeAudit.verdict.worstKillzone?.label || null,
      topCombination: edgeAudit.verdict.topCombination
        ? `${edgeAudit.verdict.topCombination.pair} en session ${edgeAudit.verdict.topCombination.session} (${edgeAudit.verdict.topCombination.setup})`
        : null,
      keyTakeaway: edgeAudit.verdict.keyTakeaway,
      recurringConditions: edgeAudit.verdict.recurringConditions,
    },
    mistakes,
    emotions,
    postLossBehavior,
    weeklyComparison,
    recentTrades,
  };
}
