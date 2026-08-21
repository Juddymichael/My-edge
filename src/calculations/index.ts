import { Trade, PerformanceStats, EdgeGroupMetric, EdgeComboMetric, EdgeAnalysisResult, StatisticalConfidence } from '../types';
import { isTradeInPlan, getStandardSession } from '../utils/tradingSession';

/** Return a recorded R or derive it only when sufficient risk data exists. Never guess. */
export function getTradeRMultiple(t: Trade): number | null {
  if (t.rMultiple !== undefined && t.rMultiple !== null && Number.isFinite(t.rMultiple)) return Number(t.rMultiple);
  if (t.entry === undefined || t.stopLoss === undefined || !Number.isFinite(t.entry) || !Number.isFinite(t.stopLoss)) return null;
  const riskDistance = Math.abs(t.entry - t.stopLoss);
  if (riskDistance <= 0) return null;
  if (t.exit !== undefined && Number.isFinite(t.exit)) {
    const rewardDistance = t.side === 'BUY' ? t.exit - t.entry : t.entry - t.exit;
    return Number((rewardDistance / riskDistance).toFixed(2));
  }
  if (t.lotSize !== undefined && t.lotSize > 0 && Number.isFinite(t.netPnL)) {
    const riskDollars = riskDistance * t.lotSize;
    if (riskDollars > 0) return Number((t.netPnL / riskDollars).toFixed(2));
  }
  return null;
}

export function calculateExpectancy(winrate: number | null, lossRate: number | null, avgWin: number | null, avgLoss: number | null, totalPnL: number, totalTrades: number): number | null {
  if (totalTrades <= 0) return null;
  if (winrate !== null && lossRate !== null && avgWin !== null && avgLoss !== null) return Number(((winrate / 100) * avgWin - (lossRate / 100) * avgLoss).toFixed(2));
  return Number((totalPnL / totalTrades).toFixed(2));
}

export function getStatisticalConfidence(totalTrades: number): StatisticalConfidence {
  if (totalTrades >= 30) return 'high';
  if (totalTrades >= 20) return 'moderate';
  if (totalTrades >= 10) return 'indicative';
  return 'low';
}

export function calculateEdgeScore(stats: PerformanceStats): number {
  if (stats.totalTrades === 0 || stats.totalPnL <= 0 || (stats.profitFactor !== null && stats.profitFactor <= 1)) return 0;
  const expR = stats.expectancyR ?? 0;
  const pf = stats.profitFactor ?? 1;
  const expScore = Math.max(0, Math.min(expR * 45, 50));
  const pfScore = Math.max(0, Math.min((pf - 1) * 15, 30));
  const ddPenalty = Math.min(15, (stats.maxDrawdownPercent ?? 0) / 10);
  let confidenceWeight = 0.5;
  if (stats.totalTrades >= 30) confidenceWeight = 1;
  else if (stats.totalTrades >= 20) confidenceWeight = 0.9;
  else if (stats.totalTrades >= 10) confidenceWeight = 0.7;
  return Math.round(Math.max(0, Math.min((expScore + pfScore + 10 - ddPenalty) * confidenceWeight, 100)));
}

export function calculatePerformanceStats(trades: Trade[], startingBalance: number = 10000): PerformanceStats {
  if (!trades || trades.length === 0) return {
    totalTrades: 0, winningTrades: 0, losingTrades: 0, beTrades: 0, totalPnL: 0, grossProfit: 0, grossLoss: 0, netProfit: 0,
    winrate: null, lossRate: null, profitFactor: null, avgWin: null, avgLoss: null, largestWin: null, largestLoss: null,
    expectancy: null, expectancyR: null, avgTrade: null, maxDrawdownAmount: null, maxDrawdownPercent: null, avgRisk: null,
    avgR: null, bestR: null, worstR: null, riskRewardRatio: null, winStreak: 0, lossStreak: 0,
    bestDay: null, worstDay: null, bestWeek: null, worstWeek: null, bestMonth: null, worstMonth: null,
  };

  const sortedTrades = [...trades].sort((a, b) => {
    const ta = new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`).getTime();
    const tb = new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`).getTime();
    return ta - tb;
  });

  let winningTrades = 0, losingTrades = 0, beTrades = 0, grossProfit = 0, grossLoss = 0, totalPnL = 0;
  let largestWin: number | null = null, largestLoss: number | null = null;
  const validRs: number[] = [], validRisks: number[] = [];

  for (const t of sortedTrades) {
    const pnl = Number(t.netPnL);
    totalPnL += pnl;
    if (pnl > 0.0001) { winningTrades++; grossProfit += pnl; largestWin = largestWin === null ? pnl : Math.max(largestWin, pnl); }
    else if (pnl < -0.0001) { losingTrades++; grossLoss += Math.abs(pnl); largestLoss = largestLoss === null ? pnl : Math.min(largestLoss, pnl); }
    else beTrades++;

    const r = getTradeRMultiple(t);
    if (r !== null && Number.isFinite(r)) validRs.push(r);

    if (t.entry !== undefined && t.stopLoss !== undefined && t.lotSize && t.lotSize > 0) {
      const risk = Math.abs(t.entry - t.stopLoss) * t.lotSize;
      if (risk > 0 && Number.isFinite(risk)) validRisks.push(risk);
    }
  }

  const totalTrades = sortedTrades.length;
  const winrate = (winningTrades / totalTrades) * 100;
  const lossRate = (losingTrades / totalTrades) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : null;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : null;
  const expectancy = calculateExpectancy(winrate, lossRate, avgWin, avgLoss, totalPnL, totalTrades);
  const expectancyR = validRs.length > 0 ? Number((validRs.reduce((a, b) => a + b, 0) / validRs.length).toFixed(2)) : null;
  const avgTrade = totalPnL / totalTrades;

  let peakEquity = startingBalance, currentEquity = startingBalance, maxDrawdownAmount = 0, maxDrawdownPercent = 0;
  for (const t of sortedTrades) {
    currentEquity += t.netPnL;
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = peakEquity - currentEquity;
    const ddPct = peakEquity > 0 ? (dd / peakEquity) * 100 : 0;
    maxDrawdownAmount = Math.max(maxDrawdownAmount, dd);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, ddPct);
  }

  const avgR = validRs.length > 0 ? Number((validRs.reduce((a, b) => a + b, 0) / validRs.length).toFixed(2)) : null;
  const bestR = validRs.length > 0 ? Math.max(...validRs) : null;
  const worstR = validRs.length > 0 ? Math.min(...validRs) : null;
  const avgRisk = validRisks.length > 0 ? validRisks.reduce((a, b) => a + b, 0) / validRisks.length : null;
  const riskRewardRatio = avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null;

  let winStreak = 0, lossStreak = 0, cw = 0, cl = 0;
  for (const t of sortedTrades) {
    if (t.netPnL > 0) { cw++; cl = 0; winStreak = Math.max(winStreak, cw); }
    else if (t.netPnL < 0) { cl++; cw = 0; lossStreak = Math.max(lossStreak, cl); }
    else { cw = 0; cl = 0; }
  }

  const daily = new Map<string, number>(), weekly = new Map<string, number>(), monthly = new Map<string, number>();
  for (const t of sortedTrades) {
    daily.set(t.date, (daily.get(t.date) || 0) + t.netPnL);
    const d = new Date(`${t.date}T00:00:00`);
    const year = d.getFullYear();
    const first = new Date(year, 0, 1);
    const week = Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
    const wk = `${year}-W${String(week).padStart(2, '0')}`;
    weekly.set(wk, (weekly.get(wk) || 0) + t.netPnL);
    const month = t.date.substring(0, 7);
    monthly.set(month, (monthly.get(month) || 0) + t.netPnL);
  }

  const extreme = (map: Map<string, number>, mode: 'max' | 'min') => {
    let out: { key: string; pnl: number } | null = null;
    map.forEach((pnl, key) => { if (!out || (mode === 'max' ? pnl > out.pnl : pnl < out.pnl)) out = { key, pnl }; });
    return out;
  };
  const bd = extreme(daily, 'max'), wd = extreme(daily, 'min'), bw = extreme(weekly, 'max'), ww = extreme(weekly, 'min'), bm = extreme(monthly, 'max'), wm = extreme(monthly, 'min');

  return {
    totalTrades, winningTrades, losingTrades, beTrades, totalPnL, grossProfit, grossLoss, netProfit: totalPnL,
    winrate, lossRate, profitFactor, avgWin, avgLoss, largestWin, largestLoss, expectancy, expectancyR, avgTrade,
    maxDrawdownAmount, maxDrawdownPercent, avgRisk, avgR, bestR, worstR, riskRewardRatio, winStreak, lossStreak,
    bestDay: bd ? { date: bd.key, pnl: bd.pnl } : null, worstDay: wd ? { date: wd.key, pnl: wd.pnl } : null,
    bestWeek: bw ? { weekStr: bw.key, pnl: bw.pnl } : null, worstWeek: ww ? { weekStr: ww.key, pnl: ww.pnl } : null,
    bestMonth: bm ? { monthStr: bm.key, pnl: bm.pnl } : null, worstMonth: wm ? { monthStr: wm.key, pnl: wm.pnl } : null,
  };
}

export function calculateEdgeAnalysis(trades: Trade[], planInstruments?: string[]): EdgeAnalysisResult {
  const groupByField = (getKeys: (t: Trade) => string[]): EdgeGroupMetric[] => {
    const map = new Map<string, Trade[]>();
    trades.forEach(t => getKeys(t).filter(Boolean).forEach(k => { if (!map.has(k)) map.set(k, []); map.get(k)!.push(t); }));
    return [...map.entries()].map(([key, group]) => {
      const s = calculatePerformanceStats(group, 10000);
      return { key, trades: group.length, wins: s.winningTrades, losses: s.losingTrades, winRate: s.winrate ?? 0, pnl: s.totalPnL, profitFactor: s.profitFactor, expectancy: s.expectancy, expectancyR: s.expectancyR } as EdgeGroupMetric;
    }).sort((a, b) => b.pnl - a.pnl);
  };
  const bySymbol = groupByField(t => [t.symbol]);
  const bySession = groupByField(t => [t.session || getStandardSession(t.time)]);
  const byDirection = groupByField(t => [t.side]);
  const bySetup = groupByField(t => t.setup ? [t.setup] : (t.tags || []));
  const byDay = groupByField(t => [new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' })]);
  const byPlan = groupByField(t => [isTradeInPlan(t, planInstruments) ? 'In Plan' : 'Outside Plan']);
  const combos = new Map<string, Trade[]>();
  trades.forEach(t => {
    const key = `${t.symbol || 'Unknown'} · ${t.session || getStandardSession(t.time)} · ${t.setup || 'No Setup'}`;
    if (!combos.has(key)) combos.set(key, []);
    combos.get(key)!.push(t);
  });
  const comboMetrics: EdgeComboMetric[] = [...combos.entries()].map(([key, group]) => {
    const s = calculatePerformanceStats(group, 10000);
    return { key, trades: group.length, wins: s.winningTrades, losses: s.losingTrades, winRate: s.winrate ?? 0, pnl: s.totalPnL, profitFactor: s.profitFactor, expectancy: s.expectancy, expectancyR: s.expectancyR } as EdgeComboMetric;
  }).sort((a, b) => b.pnl - a.pnl);
  return { bySymbol, bySession, byDirection, bySetup, byDay, byPlan, combos: comboMetrics } as EdgeAnalysisResult;
}
