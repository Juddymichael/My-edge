import { Trade, TradeSide, PerformanceStats, EdgeGroupMetric, EdgeComboMetric, EdgeAnalysisResult, StatisticalConfidence } from '../types';
import { isTradeInPlan, getStandardSession } from '../utils/tradingSession';

export function getTradeRMultiple(t: Trade): number | null {
  if (t.rMultiple !== undefined && t.rMultiple !== null && !isNaN(t.rMultiple)) return Number(t.rMultiple);
  if (t.entry !== undefined && t.stopLoss !== undefined) {
    const riskDistance = Math.abs(t.entry - t.stopLoss);
    if (riskDistance > 0) {
      if (t.lotSize && t.lotSize > 0) {
        const riskDollars = riskDistance * t.lotSize;
        if (riskDollars > 0) return Number((t.netPnL / riskDollars).toFixed(2));
      }
      if (t.exit !== undefined) {
        const rewardDistance = t.side === 'BUY' ? t.exit - t.entry : t.entry - t.exit;
        return Number((rewardDistance / riskDistance).toFixed(2));
      }
    }
  }
  return null;
}

export function calculateExpectancy(winrate: number | null, lossRate: number | null, avgWin: number | null, avgLoss: number | null, totalPnL: number, totalTrades: number): number | null {
  if (totalTrades === 0) return null;
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
  const expR = stats.expectancyR ?? stats.avgR ?? 0;
  const pf = stats.profitFactor ?? 1;
  const expScore = Math.max(0, Math.min(expR * 45, 50));
  const pfScore = Math.max(0, Math.min((pf - 1) * 15, 30));
  const ddPenalty = Math.min(15, (stats.maxDrawdownPercent ?? 0) / 10);
  let weight = 0.5;
  if (stats.totalTrades >= 30) weight = 1;
  else if (stats.totalTrades >= 20) weight = 0.9;
  else if (stats.totalTrades >= 10) weight = 0.7;
  return Math.round(Math.max(0, Math.min((expScore + pfScore + 10 - ddPenalty) * weight, 100)));
}

export function calculatePerformanceStats(trades: Trade[], startingBalance: number = 10000): PerformanceStats {
  if (!trades || trades.length === 0) return { totalTrades: 0, winningTrades: 0, losingTrades: 0, beTrades: 0, totalPnL: 0, grossProfit: 0, grossLoss: 0, netProfit: 0, winrate: null, lossRate: null, profitFactor: null, avgWin: null, avgLoss: null, largestWin: null, largestLoss: null, expectancy: null, expectancyR: null, avgTrade: null, maxDrawdownAmount: null, maxDrawdownPercent: null, avgRisk: null, avgR: null, bestR: null, worstR: null, riskRewardRatio: null, winStreak: 0, lossStreak: 0, bestDay: null, worstDay: null, bestWeek: null, worstWeek: null, bestMonth: null, worstMonth: null };

  const sorted = [...trades].sort((a, b) => new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`).getTime() - new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`).getTime());
  let winningTrades = 0, losingTrades = 0, beTrades = 0, grossProfit = 0, grossLoss = 0, totalPnL = 0;
  let largestWin: number | null = null, largestLoss: number | null = null;
  const validRs: number[] = [], validRisks: number[] = [];

  sorted.forEach(t => {
    const pnl = t.netPnL;
    totalPnL += pnl;
    if (pnl > 0.0001) { winningTrades++; grossProfit += pnl; largestWin = largestWin === null ? pnl : Math.max(largestWin, pnl); }
    else if (pnl < -0.0001) { losingTrades++; grossLoss += Math.abs(pnl); largestLoss = largestLoss === null ? pnl : Math.min(largestLoss, pnl); }
    else beTrades++;
    const r = getTradeRMultiple(t); if (r !== null && Number.isFinite(r)) validRs.push(r);
    if (t.entry !== undefined && t.stopLoss !== undefined && t.lotSize && t.lotSize > 0) { const risk = Math.abs(t.entry - t.stopLoss) * t.lotSize; if (risk > 0 && Number.isFinite(risk)) validRisks.push(risk); }
  });

  const totalTrades = sorted.length;
  const winrate = (winningTrades / totalTrades) * 100, lossRate = (losingTrades / totalTrades) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : null, avgLoss = losingTrades > 0 ? grossLoss / losingTrades : null;
  const expectancy = calculateExpectancy(winrate, lossRate, avgWin, avgLoss, totalPnL, totalTrades);
  const expectancyR = validRs.length > 0 ? Number((validRs.reduce((a, b) => a + b, 0) / validRs.length).toFixed(2)) : null;
  const avgTrade = totalPnL / totalTrades;

  let peak = startingBalance, equity = startingBalance, maxDrawdownAmount = 0, maxDrawdownPercent = 0;
  sorted.forEach(t => { equity += t.netPnL; if (equity > peak) peak = equity; const dd = peak - equity; maxDrawdownAmount = Math.max(maxDrawdownAmount, dd); maxDrawdownPercent = Math.max(maxDrawdownPercent, peak > 0 ? (dd / peak) * 100 : 0); });
  const avgR = validRs.length ? Number((validRs.reduce((a, b) => a + b, 0) / validRs.length).toFixed(2)) : null;
  const bestR = validRs.length ? Math.max(...validRs) : null, worstR = validRs.length ? Math.min(...validRs) : null;
  const avgRisk = validRisks.length ? validRisks.reduce((a, b) => a + b, 0) / validRisks.length : null;
  const riskRewardRatio = avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null;
  let winStreak = 0, lossStreak = 0, cw = 0, cl = 0;
  sorted.forEach(t => { if (t.netPnL > 0) { cw++; cl = 0; winStreak = Math.max(winStreak, cw); } else if (t.netPnL < 0) { cl++; cw = 0; lossStreak = Math.max(lossStreak, cl); } else { cw = 0; cl = 0; } });

  const daily = new Map<string, number>(), weekly = new Map<string, number>(), monthly = new Map<string, number>();
  sorted.forEach(t => { daily.set(t.date, (daily.get(t.date) || 0) + t.netPnL); const d = new Date(t.date), year = d.getFullYear(), first = new Date(year, 0, 1); const week = Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7); const wk = `${year}-W${String(week).padStart(2, '0')}`; weekly.set(wk, (weekly.get(wk) || 0) + t.netPnL); const month = t.date.substring(0, 7); monthly.set(month, (monthly.get(month) || 0) + t.netPnL); });
  const extreme = (map: Map<string, number>, max: boolean) => { let out: { key: string; pnl: number } | null = null; map.forEach((pnl, key) => { if (!out || (max ? pnl > out.pnl : pnl < out.pnl)) out = { key, pnl }; }); return out; };
  const bd = extreme(daily, true), wd = extreme(daily, false), bw = extreme(weekly, true), ww = extreme(weekly, false), bm = extreme(monthly, true), wm = extreme(monthly, false);

  return { totalTrades, winningTrades, losingTrades, beTrades, totalPnL, grossProfit, grossLoss, netProfit: totalPnL, winrate, lossRate, profitFactor, avgWin, avgLoss, largestWin, largestLoss, expectancy, expectancyR, avgTrade, maxDrawdownAmount, maxDrawdownPercent, avgRisk, avgR, bestR, worstR, riskRewardRatio, winStreak, lossStreak, bestDay: bd ? { date: bd.key, pnl: bd.pnl } : null, worstDay: wd ? { date: wd.key, pnl: wd.pnl } : null, bestWeek: bw ? { weekStr: bw.key, pnl: bw.pnl } : null, worstWeek: ww ? { weekStr: ww.key, pnl: ww.pnl } : null, bestMonth: bm ? { monthStr: bm.key, pnl: bm.pnl } : null, worstMonth: wm ? { monthStr: wm.key, pnl: wm.pnl } : null };
}

export function calculateEdgeAnalysis(trades: Trade[], planInstruments?: string[]): EdgeAnalysisResult {
  const groupByField = (getter: (t: Trade) => string[]): EdgeGroupMetric[] => { const map = new Map<string, Trade[]>(); trades.forEach(t => getter(t).forEach(k => { if (!k || k === 'N/A' || k === 'None') return; const key = k.trim(); if (!map.has(key)) map.set(key, []); map.get(key)!.push(t); })); const result: EdgeGroupMetric[] = []; map.forEach((group, key) => { const s = calculatePerformanceStats(group), score = calculateEdgeScore(s); result.push({ key, label: key, totalTrades: s.totalTrades, winrate: s.winrate, profitFactor: s.profitFactor, totalPnL: s.totalPnL, avgR: s.avgR, expectancy: s.expectancy, expectancyR: s.expectancyR, avgWin: s.avgWin, avgLoss: s.avgLoss, maxDrawdownAmount: s.maxDrawdownAmount, maxDrawdownPercent: s.maxDrawdownPercent, riskRewardRatio: s.riskRewardRatio, confidenceLevel: getStatisticalConfidence(s.totalTrades), edgeScore: score, trades: group }); }); return result.sort((a, b) => (b.edgeScore || 0) - (a.edgeScore || 0) || b.totalPnL - a.totalPnL); };
  const bySymbol = groupByField(t => [t.symbol]);
  const bySession = groupByField(t => { const s = getStandardSession(t); return s ? [s] : []; });
  const byKillzone = bySession;
  const byDirection = groupByField(t => [t.side]);
  const bySetup = groupByField(t => { const list: string[] = []; if (t.setup?.trim()) list.push(t.setup.trim()); (t.tags || []).forEach(tag => { if (tag?.trim() && !list.includes(tag.trim())) list.push(tag.trim()); }); return list.length ? list : ['Price Action / Standard']; });

  const combos = new Map<string, { symbol: string; killzone: string; setup: string; side: TradeSide | string; trades: Trade[] }>();
  trades.forEach(t => { const symbol = t.symbol?.trim() || 'N/A', killzone = getStandardSession(t) || 'Non défini', setup = t.setup?.trim() || t.tags?.[0]?.trim() || 'Price Action', side = t.side || 'BUY'; const key = `${symbol}__${killzone}__${setup}__${side}`; if (!combos.has(key)) combos.set(key, { symbol, killzone, setup, side, trades: [] }); combos.get(key)!.trades.push(t); });
  const allCombos: EdgeComboMetric[] = [];
  combos.forEach((entry, key) => { const s = calculatePerformanceStats(entry.trades), score = calculateEdgeScore(s); allCombos.push({ key, label: `${entry.symbol} • ${entry.killzone} • ${entry.setup} • ${entry.side}`, symbol: entry.symbol, killzone: entry.killzone, setup: entry.setup, side: entry.side, totalTrades: s.totalTrades, winrate: s.winrate, profitFactor: s.profitFactor, totalPnL: s.totalPnL, avgR: s.avgR, expectancy: s.expectancy, expectancyR: s.expectancyR, avgWin: s.avgWin, avgLoss: s.avgLoss, maxDrawdownAmount: s.maxDrawdownAmount, maxDrawdownPercent: s.maxDrawdownPercent, riskRewardRatio: s.riskRewardRatio, confidenceLevel: getStatisticalConfidence(s.totalTrades), edgeScore: score, trades: entry.trades }); });
  const topCombos = allCombos.filter(c => c.totalPnL > 0 && (c.profitFactor === null || c.profitFactor > 1)).sort((a, b) => (b.edgeScore || 0) - (a.edgeScore || 0) || (b.expectancyR ?? 0) - (a.expectancyR ?? 0));
  const weakCombos = allCombos.filter(c => c.totalPnL < 0 || (c.profitFactor !== null && c.profitFactor < 1) || (c.expectancyR !== null && c.expectancyR < 0)).sort((a, b) => a.totalPnL - b.totalPnL || (a.expectancyR ?? 0) - (b.expectancyR ?? 0));
  const planTrades = trades.filter(t => isTradeInPlan(t.symbol, planInstruments)), offPlanTrades = trades.filter(t => !isTradeInPlan(t.symbol, planInstruments));
  const makeMetric = (s: PerformanceStats, key: string, label: string): EdgeGroupMetric => ({ key, label, totalTrades: s.totalTrades, winrate: s.winrate, profitFactor: s.profitFactor, totalPnL: s.totalPnL, avgR: s.avgR, expectancy: s.expectancy, expectancyR: s.expectancyR, avgWin: s.avgWin, avgLoss: s.avgLoss, maxDrawdownAmount: s.maxDrawdownAmount, maxDrawdownPercent: s.maxDrawdownPercent, riskRewardRatio: s.riskRewardRatio, confidenceLevel: getStatisticalConfidence(s.totalTrades), edgeScore: calculateEdgeScore(s), trades: s.totalTrades ? undefined : [] });
  const byPlan = { plan: makeMetric(calculatePerformanceStats(planTrades), 'plan', 'Dans le Plan'), offPlan: makeMetric(calculatePerformanceStats(offPlanTrades), 'off_plan', 'Hors-Plan') };
  const withDxyTrades = trades.filter(t => t.confluenceDxy === true), withoutDxyTrades = trades.filter(t => t.confluenceDxy !== true);
  const byDxy = { withDxy: makeMetric(calculatePerformanceStats(withDxyTrades), 'with_dxy', 'Avec Confluence DXY'), withoutDxy: makeMetric(calculatePerformanceStats(withoutDxyTrades), 'without_dxy', 'Sans Confluence DXY') };
  return { bySymbol, bySession, byKillzone, byDirection, bySetup, topCombos, weakCombos, byPlan, byDxy };
}

export interface AccountBalanceSummary { startingBalance: number; initialCapital: number; totalDeposited: number; totalWithdrawn: number; netCashFlow: number; totalTradingPnL: number; currentBalance: number; depositsCount: number; withdrawalsCount: number; }
export function calculateAccountBalanceSummary(startingBalance: number, trades: Trade[], transactions: import('../types').AccountTransaction[] = []): AccountBalanceSummary { let totalDeposited = 0, totalWithdrawn = 0, depositsCount = 0, withdrawalsCount = 0; transactions.forEach(tx => { if (tx.type === 'DEPOSIT') { totalDeposited += Math.abs(tx.amount || 0); depositsCount++; } else { totalWithdrawn += Math.abs(tx.amount || 0); withdrawalsCount++; } }); const totalTradingPnL = trades.reduce((a, t) => a + (t.netPnL || 0), 0); const netCashFlow = totalDeposited - totalWithdrawn; return { startingBalance, initialCapital: startingBalance, totalDeposited, totalWithdrawn, netCashFlow, totalTradingPnL, currentBalance: startingBalance + netCashFlow + totalTradingPnL, depositsCount, withdrawalsCount }; }

export interface RealEquityCurvePoint { date: string; fullDate: string; balance: number; change: number; type: 'INITIAL' | 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL'; label?: string; }
export function buildRealEquityCurve(startingBalance: number, trades: Trade[], transactions: import('../types').AccountTransaction[] = []): RealEquityCurvePoint[] { const events = [...trades.map(t => ({ date: t.date, time: t.time, amount: t.netPnL || 0, type: 'TRADE' as const, label: `Trade ${t.symbol} (${t.side})` })), ...transactions.map(tx => ({ date: tx.date, time: tx.time, amount: tx.type === 'DEPOSIT' ? Math.abs(tx.amount) : -Math.abs(tx.amount), type: tx.type, label: tx.type === 'DEPOSIT' ? `Dépôt (+${tx.amount})` : `Retrait (-${tx.amount})` }))]; events.sort((a, b) => new Date(a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`).getTime() - new Date(b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`).getTime()); let balance = startingBalance; const points: RealEquityCurvePoint[] = [{ date: 'Départ', fullDate: events[0]?.date || new Date().toISOString().substring(0, 10), balance: Number(balance.toFixed(2)), change: 0, type: 'INITIAL', label: 'Capital Initial' }]; events.forEach(ev => { balance += ev.amount; points.push({ date: ev.date.length > 5 ? ev.date.substring(5) : ev.date, fullDate: ev.date, balance: Number(balance.toFixed(2)), change: Number(ev.amount.toFixed(2)), type: ev.type, label: ev.label }); }); return points; }
