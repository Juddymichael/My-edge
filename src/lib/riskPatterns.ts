import { Trade } from '../types/trade';
import { UserSettings } from '../types/settings';

export type RiskPatternType = 'REVENGE_TRADING' | 'LOSS_STREAK';

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
}

export const DEFAULT_RISK_PATTERN_CONFIG: RiskPatternConfig = {
  revengeWindowMinutes: 15,
  revengeMinLotMultiplier: 1.5,
  lossStreakThreshold: 4,
};

const finite = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function getRiskPatternConfig(settings: UserSettings): RiskPatternConfig {
  return {
    revengeWindowMinutes: Math.min(60, Math.max(1, Math.round(settings.riskPatternSettings?.revengeWindowMinutes ?? DEFAULT_RISK_PATTERN_CONFIG.revengeWindowMinutes))),
    revengeMinLotMultiplier: Math.min(10, Math.max(1, settings.riskPatternSettings?.revengeMinLotMultiplier ?? DEFAULT_RISK_PATTERN_CONFIG.revengeMinLotMultiplier)),
    lossStreakThreshold: Math.min(20, Math.max(2, Math.round(settings.riskPatternSettings?.lossStreakThreshold ?? DEFAULT_RISK_PATTERN_CONFIG.lossStreakThreshold))),
  };
}

const sortTrades = (trades: Trade[]) => [...trades]
  .filter((trade) => Boolean(trade.openedAt))
  .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());

const tradeLabel = (trade: Trade) => `${trade.symbol}${trade.ticket ? ` #${trade.ticket}` : ''}`;

const alertId = (type: RiskPatternType, ids: string[]) => `${type}:${ids.join(',')}`;

export function detectRiskPatterns(trades: Trade[], settings: UserSettings): RiskAlert[] {
  const ordered = sortTrades(trades);
  const config = getRiskPatternConfig(settings);
  const alerts: RiskAlert[] = [];
  const now = new Date().toISOString();

  // Revenge trading: a new trade shortly after a loss, with an optional stronger
  // signal when its lot size is materially above the user's recent baseline.
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    const previousPnl = finite(previous.netPnL);
    if (previousPnl === null || previousPnl >= 0) continue;

    const gapMinutes = (new Date(current.openedAt).getTime() - new Date(previous.openedAt).getTime()) / 60000;
    if (gapMinutes < 0 || gapMinutes > config.revengeWindowMinutes) continue;

    const recentLots = ordered
      .slice(Math.max(0, i - 20), i)
      .map((trade) => finite(trade.lotSize))
      .filter((value): value is number => value !== null && value > 0);
    const avgLot = recentLots.length ? recentLots.reduce((sum, value) => sum + value, 0) / recentLots.length : null;
    const currentLot = finite(current.lotSize);
    const increasedLot = avgLot !== null && currentLot !== null && currentLot >= avgLot * config.revengeMinLotMultiplier;

    if (!increasedLot && recentLots.length >= 3) {
      // Keep the detector conservative when there is enough sizing history:
      // the timing signal alone is retained, but the explanation states exactly
      // what was observed.
    }

    const ids = [previous.id, current.id];
    alerts.push({
      id: alertId('REVENGE_TRADING', ids),
      type: 'REVENGE_TRADING',
      title: 'Revenge trading potentiel',
      explanation: increasedLot
        ? `Un trade a été ouvert ${Math.round(gapMinutes)} min après une perte, avec une taille de lot d’environ ${((currentLot! / avgLot!) * 100).toFixed(0)} % de la moyenne récente.`
        : `Un trade a été ouvert ${Math.round(gapMinutes)} min après une perte. Le délai est inférieur au seuil configuré de ${config.revengeWindowMinutes} min.`,
      detectedAt: now,
      relatedTradeIds: ids,
      relatedTradeLabels: ids.map((id) => tradeLabel(ordered.find((trade) => trade.id === id)!)),
      read: false,
      dismissed: false,
    });
  }

  // Consecutive losses: evaluate the closed/resulted sequence in chronological order.
  let streak: Trade[] = [];
  const flushStreak = () => {
    if (streak.length >= config.lossStreakThreshold) {
      const ids = streak.map((trade) => trade.id);
      alerts.push({
        id: alertId('LOSS_STREAK', ids),
        type: 'LOSS_STREAK',
        title: `${streak.length} pertes consécutives`,
        explanation: `Une série de ${streak.length} pertes consécutives a été détectée. Le seuil configuré est de ${config.lossStreakThreshold}.`,
        detectedAt: now,
        relatedTradeIds: ids,
        relatedTradeLabels: streak.map(tradeLabel),
        read: false,
        dismissed: false,
      });
    }
    streak = [];
  };

  for (const trade of ordered) {
    const pnl = finite(trade.netPnL);
    if (pnl !== null && pnl < 0) streak.push(trade);
    else if (pnl !== null && pnl > 0) flushStreak();
  }
  flushStreak();

  return alerts;
}
