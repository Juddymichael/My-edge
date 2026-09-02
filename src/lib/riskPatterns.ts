import { Trade } from '../types/trade';
import { UserSettings } from '../types/settings';

export type RiskPatternType = 'REVENGE_TRADING' | 'LOSS_STREAK' | 'OVERTRADING' | 'ABNORMAL_POSITION_SIZE' | 'OUTSIDE_KILLZONE' | 'RECENT_WINRATE_DEGRADATION';

export interface RiskAlert {
  id: string;
  type: RiskPatternType;
  title: string;
  explanation: string;
  detectedAt: string;
  relatedTradeIds: string[];
  relatedTradeLabels: string[];
  read: boolean;
  dismissed: boolean;
}

export interface RiskPatternConfig {
  revengeWindowMinutes: number;
  revengeMinLotMultiplier: number;
  lossStreakThreshold: number;
  overtradingDailyMultiplier: number;
  abnormalLotMultiplier: number;
  recentWinrateWindow: number;
  recentWinrateDropPoints: number;
  outsideKillzoneMinTrades: number;
  outsideKillzonePerformanceGap: number;
}

export const DEFAULT_RISK_PATTERN_CONFIG: RiskPatternConfig = {
  revengeWindowMinutes: 15,
  revengeMinLotMultiplier: 1.5,
  lossStreakThreshold: 4,
  overtradingDailyMultiplier: 2,
  abnormalLotMultiplier: 3,
  recentWinrateWindow: 20,
  recentWinrateDropPoints: 15,
  outsideKillzoneMinTrades: 10,
  outsideKillzonePerformanceGap: 10,
};

const finite = (value: number | null | undefined): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function getRiskPatternConfig(settings: UserSettings): RiskPatternConfig {
  const r = settings.riskPatternSettings;
  return {
    revengeWindowMinutes: Math.min(60, Math.max(1, Math.round(r?.revengeWindowMinutes ?? 15))),
    revengeMinLotMultiplier: Math.min(10, Math.max(1, r?.revengeMinLotMultiplier ?? 1.5)),
    lossStreakThreshold: Math.min(20, Math.max(2, Math.round(r?.lossStreakThreshold ?? 4))),
    overtradingDailyMultiplier: Math.min(10, Math.max(1.1, r?.overtradingDailyMultiplier ?? 2)),
    abnormalLotMultiplier: Math.min(10, Math.max(1.5, r?.abnormalLotMultiplier ?? 3)),
    recentWinrateWindow: Math.min(50, Math.max(10, Math.round(r?.recentWinrateWindow ?? 20))),
    recentWinrateDropPoints: Math.min(50, Math.max(5, r?.recentWinrateDropPoints ?? 15)),
    outsideKillzoneMinTrades: Math.min(100, Math.max(5, Math.round(r?.outsideKillzoneMinTrades ?? 10))),
    outsideKillzonePerformanceGap: Math.min(50, Math.max(5, r?.outsideKillzonePerformanceGap ?? 10)),
  };
}

const sortTrades = (trades: Trade[]) => [...trades].filter(t => Boolean(t.openedAt)).sort((a,b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
const tradeLabel = (t: Trade) => `${t.symbol}${t.ticket ? ` #${t.ticket}` : ''}`;
const alertId = (type: RiskPatternType, ids: string[]) => `${type}:${ids.join(',')}`;
const pct = (n: number) => `${n.toFixed(0)} %`;

export function detectRiskPatterns(trades: Trade[], settings: UserSettings): RiskAlert[] {
  const ordered = sortTrades(trades);
  const config = getRiskPatternConfig(settings);
  const alerts: RiskAlert[] = [];
  const now = new Date().toISOString();

  // 1. Revenge trading: timing after a loss, strengthened by an increased lot size.
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1], current = ordered[i];
    const previousPnl = finite(previous.netPnL);
    if (previousPnl === null || previousPnl >= 0) continue;
    const gapMinutes = (new Date(current.openedAt).getTime() - new Date(previous.openedAt).getTime()) / 60000;
    if (gapMinutes < 0 || gapMinutes > config.revengeWindowMinutes) continue;
    const recentLots = ordered.slice(Math.max(0, i - 20), i).map(t => finite(t.lotSize)).filter((v): v is number => v !== null && v > 0);
    const avgLot = recentLots.length ? recentLots.reduce((s,v) => s + v, 0) / recentLots.length : null;
    const currentLot = finite(current.lotSize);
    const increasedLot = avgLot !== null && currentLot !== null && currentLot >= avgLot * config.revengeMinLotMultiplier;
    const ids = [previous.id, current.id];
    alerts.push({ id: alertId('REVENGE_TRADING', ids), type: 'REVENGE_TRADING', title: 'Revenge trading potentiel', explanation: increasedLot ? `Un trade a été ouvert ${Math.round(gapMinutes)} min après une perte, avec une taille d’environ ${pct((currentLot! / avgLot!) * 100)} de la moyenne récente.` : `Un trade a été ouvert ${Math.round(gapMinutes)} min après une perte, sous le seuil configuré de ${config.revengeWindowMinutes} min.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: ids.map(id => tradeLabel(ordered.find(t => t.id === id)!)), read: false, dismissed: false });
  }

  // 2. Consecutive losses.
  let streak: Trade[] = [];
  const flushStreak = () => {
    if (streak.length >= config.lossStreakThreshold) {
      const ids = streak.map(t => t.id);
      alerts.push({ id: alertId('LOSS_STREAK', ids), type: 'LOSS_STREAK', title: `${streak.length} pertes consécutives`, explanation: `Une série de ${streak.length} pertes consécutives a été détectée. Le seuil configuré est de ${config.lossStreakThreshold}.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: streak.map(tradeLabel), read: false, dismissed: false });
    }
    streak = [];
  };
  for (const trade of ordered) {
    const pnl = finite(trade.netPnL);
    if (pnl !== null && pnl < 0) streak.push(trade); else if (pnl !== null && pnl > 0) flushStreak();
  }
  flushStreak();

  // 3. Overtrading: current completed trading days versus historical average.
  const dayCounts = new Map<string, number>();
  for (const t of ordered) { const day = t.openedAt.slice(0,10); dayCounts.set(day, (dayCounts.get(day) || 0) + 1); }
  if (dayCounts.size >= 3) {
    const values = [...dayCounts.values()];
    const average = values.reduce((s,v) => s + v, 0) / values.length;
    for (const [day, count] of dayCounts) {
      if (count <= average * config.overtradingDailyMultiplier) continue;
      const ids = ordered.filter(t => t.openedAt.slice(0,10) === day).map(t => t.id);
      alerts.push({ id: alertId('OVERTRADING', ids), type: 'OVERTRADING', title: 'Sur-trading potentiel', explanation: `La journée du ${day} compte ${count} trades, contre une moyenne historique de ${average.toFixed(1)} par jour.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: ids.slice(0,8).map(id => tradeLabel(ordered.find(t => t.id === id)!)), read: false, dismissed: false });
    }
  }

  // 4. Abnormal position size: compare each trade to the 20 preceding trades.
  for (let i = 0; i < ordered.length; i += 1) {
    const currentLot = finite(ordered[i].lotSize);
    const previousLots = ordered.slice(Math.max(0, i - 20), i).map(t => finite(t.lotSize)).filter((v): v is number => v !== null && v > 0);
    if (currentLot === null || previousLots.length < 5) continue;
    const avgLot = previousLots.reduce((s,v) => s + v, 0) / previousLots.length;
    if (currentLot < avgLot * config.abnormalLotMultiplier) continue;
    const afterLoss = i > 0 && (finite(ordered[i-1].netPnL) ?? 0) < 0;
    const ids = afterLoss ? [ordered[i-1].id, ordered[i].id] : [ordered[i].id];
    alerts.push({ id: alertId('ABNORMAL_POSITION_SIZE', ids), type: 'ABNORMAL_POSITION_SIZE', title: 'Taille de position anormale', explanation: `La taille de ${currentLot} lot est ${pct(currentLot / avgLot)} de la moyenne des ${previousLots.length} trades précédents${afterLoss ? ', après une perte' : ''}.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: ids.map(id => tradeLabel(ordered.find(t => t.id === id)!)), read: false, dismissed: false });
  }

  // 5. Outside killzones: compare historical performance inside configured sessions to trades outside them.
  const enabledSessions = Object.entries(settings.sessionSettings || {}).filter(([,v]) => v?.enabled).map(([name,v]) => ({ name: name.toUpperCase(), start: v.startUtc, end: v.endUtc }));
  const inSession = (t: Trade) => {
    const hour = new Date(t.openedAt).getUTCHours() + new Date(t.openedAt).getUTCMinutes() / 60;
    return enabledSessions.some(s => s.start <= s.end ? hour >= s.start && hour < s.end : hour >= s.start || hour < s.end);
  };
  const inside = ordered.filter(inSession).filter(t => finite(t.netPnL) !== null);
  const outside = ordered.filter(t => !inSession(t)).filter(t => finite(t.netPnL) !== null);
  if (inside.length >= config.outsideKillzoneMinTrades && outside.length >= config.outsideKillzoneMinTrades) {
    const insideWins = inside.filter(t => (t.netPnL ?? 0) > 0).length / inside.length * 100;
    const outsideWins = outside.filter(t => (t.netPnL ?? 0) > 0).length / outside.length * 100;
    if (insideWins - outsideWins >= config.outsideKillzonePerformanceGap) {
      const ids = outside.slice(-Math.min(10, outside.length)).map(t => t.id);
      alerts.push({ id: alertId('OUTSIDE_KILLZONE', ids), type: 'OUTSIDE_KILLZONE', title: 'Trading hors killzones habituelles', explanation: `Le winrate historique hors des sessions configurées est ${outsideWins.toFixed(0)} %, contre ${insideWins.toFixed(0)} % dans les sessions configurées.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: ids.map(id => tradeLabel(ordered.find(t => t.id === id)!)), read: false, dismissed: false });
    }
  }

  // 6. Recent rolling winrate degradation versus the historical sample before the window.
  const resulted = ordered.filter(t => finite(t.netPnL) !== null);
  if (resulted.length >= config.recentWinrateWindow + 10) {
    const recent = resulted.slice(-config.recentWinrateWindow);
    const historical = resulted.slice(0, -config.recentWinrateWindow);
    const recentWinrate = recent.filter(t => (t.netPnL ?? 0) > 0).length / recent.length * 100;
    const historicalWinrate = historical.filter(t => (t.netPnL ?? 0) > 0).length / historical.length * 100;
    if (historicalWinrate - recentWinrate >= config.recentWinrateDropPoints) {
      const ids = recent.map(t => t.id);
      alerts.push({ id: alertId('RECENT_WINRATE_DEGRADATION', ids), type: 'RECENT_WINRATE_DEGRADATION', title: 'Dégradation du winrate récent', explanation: `Le winrate des ${recent.length} derniers trades est de ${recentWinrate.toFixed(0)} %, contre ${historicalWinrate.toFixed(0)} % sur l’historique précédent.`, detectedAt: now, relatedTradeIds: ids, relatedTradeLabels: recent.slice(-8).map(tradeLabel), read: false, dismissed: false });
    }
  }

  return alerts;
}
