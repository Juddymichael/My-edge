import { Trade, PerformanceStats, EdgeAnalysisResult, EdgeGroupMetric, EdgeComboMetric } from '../types';
import { calculatePerformanceStats, calculateEdgeScore, getTradeRMultiple } from './index';

/**
 * Filter strictly valid trading records.
 * Automatically excludes:
 * - Deposits, withdrawals, balance transactions, account fees
 * - Trades without valid/numeric net PnL
 * - Duplicate trade entries
 */
export function getValidTradingTrades(trades: Trade[]): Trade[] {
  if (!trades || trades.length === 0) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const validList: Trade[] = [];

  trades.forEach((t) => {
    // Check for null or missing
    if (!t) return;

    // Exclude if netPnL is not a valid number
    if (t.netPnL === undefined || t.netPnL === null || isNaN(Number(t.netPnL))) return;

    // Check symbol for non-trading entries (deposits, withdrawals, balance transfers)
    const sym = (t.symbol || '').trim().toUpperCase();
    const isDepositOrWithdrawal = 
      sym.includes('DEPOSIT') ||
      sym.includes('WITHDRAW') ||
      sym.includes('BALANCE') ||
      sym.includes('TRANSFER') ||
      sym.includes('INTEREST') ||
      sym.includes('CREDIT') ||
      sym === '' ||
      sym === 'DEP' ||
      sym === 'W/D';

    if (isDepositOrWithdrawal) return;

    // Exclude by source/notes if explicitly marked as cash flow
    const notesLower = (t.notes || '').toLowerCase();
    if (notesLower.includes('dépôt') || notesLower.includes('retrait') || notesLower.includes('deposit') || notesLower.includes('withdrawal')) {
      return;
    }

    // Check for unique ID or duplicate signature
    if (t.id && seenIds.has(t.id)) return;
    if (t.id) seenIds.add(t.id);

    // Composite signature check (date + time + symbol + netPnL + side)
    const signature = `${t.date}_${t.time || '00:00'}_${sym}_${t.netPnL}_${t.side || 'BUY'}_${t.lotSize || 0}`;
    if (seenSignatures.has(signature)) return;
    seenSignatures.add(signature);

    validList.push(t);
  });

  return validList;
}

export type ConfidenceTier = 'insufficient' | 'weak' | 'caution' | 'solid' | 'very-solid';

export interface ConfidenceDetails {
  tier: ConfidenceTier;
  label: string;
  count: number;
  badgeClass: string;
  description: string;
  isReliable: boolean;
}

/**
 * Categorizes statistical confidence strictly according to user thresholds:
 * < 10 trades   -> Données insuffisantes
 * 10–29 trades  -> Échantillon faible
 * 30–49 trades  -> Exploitable avec prudence
 * 50–99 trades  -> Solide
 * 100+ trades   -> Très solide
 */
export function getConfidenceDetails(count: number): ConfidenceDetails {
  if (count >= 100) {
    return {
      tier: 'very-solid',
      label: 'Très solide',
      count,
      badgeClass: 'bg-purple-100 text-[#7C3AED] border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
      description: 'Échantillon robuste (100+ trades). Résultats statistiquement fiables.',
      isReliable: true,
    };
  }
  if (count >= 50) {
    return {
      tier: 'solid',
      label: 'Solide',
      count,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
      description: 'Échantillon significatif (50–99 trades). Confiance statistique élevée.',
      isReliable: true,
    };
  }
  if (count >= 30) {
    return {
      tier: 'caution',
      label: 'Exploitable avec prudence',
      count,
      badgeClass: 'bg-orange-50 text-[#f75605] border border-orange-200 dark:bg-[#f75605]/15 dark:text-[#f75605] dark:border-[#f75605]/30',
      description: 'Seuil minimum atteint (30–49 trades). Tendance exploitable avec prudence.',
      isReliable: true,
    };
  }
  if (count >= 10) {
    return {
      tier: 'weak',
      label: 'Échantillon faible',
      count,
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800',
      description: 'Échantillon restreint (10–29 trades). Risque de variance élevé.',
      isReliable: false,
    };
  }
  return {
    tier: 'insufficient',
    label: 'Données insuffisantes',
    count,
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
    description: 'Moins de 10 trades. Ne constitue en aucun cas un edge statistically valide.',
    isReliable: false,
  };
}

export type GlobalEdgeStatus = 'positive' | 'confirm' | 'negative';

export interface GlobalEdgeEvaluation {
  status: GlobalEdgeStatus;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose';
  score: number;
  explanation: string;
}

/**
 * Evaluates global edge condition:
 * - EDGE POSITIF: Expectancy > 0 and Profit Factor > 1 and sample size >= 30
 * - EDGE À CONFIRMER: stats positive but sample size < 30 trades
 * - EDGE NÉGATIF: Expectancy <= 0 or Profit Factor < 1
 */
export function evaluateGlobalEdge(stats: PerformanceStats): GlobalEdgeEvaluation {
  const expR = stats.expectancyR ?? 0;
  const pf = stats.profitFactor ?? 0;
  const trades = stats.totalTrades;
  const score = calculateEdgeScore(stats);

  const isPositiveStats = (expR > 0 || (stats.expectancy ?? 0) > 0) && (stats.profitFactor === null || pf > 1.0) && stats.totalPnL > 0;

  if (isPositiveStats) {
    if (trades >= 30) {
      let exp = 'Avantage statistique robuste et confirmé sur un échantillon représentatif.';
      if (score >= 80) exp = 'Avantage de premier plan avec forte rentabilité et excellente maîtrise du risque.';
      else if (score >= 60) exp = 'Edge positif confirmé avec une espérance mathématique favorable.';

      return {
        status: 'positive',
        statusLabel: 'EDGE POSITIF',
        statusColor: 'emerald',
        score,
        explanation: exp,
      };
    } else {
      return {
        status: 'confirm',
        statusLabel: 'EDGE À CONFIRMER',
        statusColor: 'amber',
        score,
        explanation: `Statistiques positives mais l'échantillon (${trades} trades) est encore trop réduit pour certifier l'edge (seuil recommandé : 30+ trades).`,
      };
    }
  }

  return {
    status: 'negative',
    statusLabel: 'EDGE NÉGATIF',
    statusColor: 'rose',
    score,
    explanation: 'Déficit statistique dans les conditions actuelles (Expectancy négative ou Profit Factor < 1). Ajustements requis.',
  };
}

export interface ProgressionStats {
  recentStats: PerformanceStats;
  previousStats: PerformanceStats;
  trend: 'improving' | 'stable' | 'degrading';
  trendLabel: string;
  trendColor: 'emerald' | 'amber' | 'rose';
  winrateDiff: number;
  pfDiff: number;
  expectancyRDiff: number;
  pnlDiff: number;
  ddDiff: number;
  summary: string;
}

/**
 * Compares the last 30 trades vs the 30 trades preceding them.
 */
export function calculateProgressionComparison(trades: Trade[], sampleSize: number = 30): ProgressionStats | null {
  if (!trades || trades.length < 10) return null;

  // Sort chronological
  const sorted = [...trades].sort((a, b) => {
    const timeA = a.time ? `${a.date}T${a.time}` : `${a.date}T00:00:00`;
    const timeB = b.time ? `${b.date}T${b.time}` : `${b.date}T00:00:00`;
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });

  const total = sorted.length;
  const recentWindow = Math.min(sampleSize, Math.floor(total / 2));
  if (recentWindow < 5) return null;

  const recentTrades = sorted.slice(total - recentWindow);
  const previousTrades = sorted.slice(total - 2 * recentWindow, total - recentWindow);

  if (previousTrades.length < 5) return null;

  const recentStats = calculatePerformanceStats(recentTrades);
  const previousStats = calculatePerformanceStats(previousTrades);

  const wrRecent = recentStats.winrate ?? 0;
  const wrPrev = previousStats.winrate ?? 0;
  const winrateDiff = Number((wrRecent - wrPrev).toFixed(1));

  const pfRecent = recentStats.profitFactor ?? 0;
  const pfPrev = previousStats.profitFactor ?? 0;
  const pfDiff = Number((pfRecent - pfPrev).toFixed(2));

  const expRecent = recentStats.expectancyR ?? 0;
  const expPrev = previousStats.expectancyR ?? 0;
  const expectancyRDiff = Number((expRecent - expPrev).toFixed(2));

  const pnlDiff = Number((recentStats.totalPnL - previousStats.totalPnL).toFixed(2));
  const ddDiff = Number(((recentStats.maxDrawdownAmount ?? 0) - (previousStats.maxDrawdownAmount ?? 0)).toFixed(2));

  // Determine trend
  // Positive markers: higher expectancy R, higher PF, higher PnL, lower DD
  let scoreDiff = 0;
  if (expectancyRDiff > 0.05) scoreDiff += 2;
  else if (expectancyRDiff < -0.05) scoreDiff -= 2;

  if (pfDiff > 0.15) scoreDiff += 1.5;
  else if (pfDiff < -0.15) scoreDiff -= 1.5;

  if (pnlDiff > 0) scoreDiff += 1;
  else if (pnlDiff < 0) scoreDiff -= 1;

  if (ddDiff < 0) scoreDiff += 0.5; // drawdown reduced
  else if (ddDiff > 50) scoreDiff -= 0.5;

  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  let trendLabel = 'Stable';
  let trendColor: 'emerald' | 'amber' | 'rose' = 'amber';
  let summary = 'Votre performance reste stable sur les derniers cycles de trading.';

  if (scoreDiff >= 2) {
    trend = 'improving';
    trendLabel = 'En amélioration';
    trendColor = 'emerald';
    summary = `Excellente dynamique : l'Expectancy a progressé de ${expectancyRDiff >= 0 ? '+' : ''}${expectancyRDiff}R et le Profit Factor est passé de ${pfPrev.toFixed(2)} à ${pfRecent.toFixed(2)}.`;
  } else if (scoreDiff <= -2) {
    trend = 'degrading';
    trendLabel = 'En dégradation';
    trendColor = 'rose';
    summary = `Baisse de régime récente : l'Expectancy a reculé de ${expectancyRDiff}R et le PnL sur la période s'est détérioré. Attention aux dérives de discipline.`;
  }

  return {
    recentStats,
    previousStats,
    trend,
    trendLabel,
    trendColor,
    winrateDiff,
    pfDiff,
    expectancyRDiff,
    pnlDiff,
    ddDiff,
    summary,
  };
}

export interface EdgeConclusionInput {
  stats: PerformanceStats;
  bySymbol: EdgeGroupMetric[];
  bySession: EdgeGroupMetric[];
  bySetup: EdgeGroupMetric[];
  byDirection: EdgeGroupMetric[];
  topCombos?: EdgeComboMetric[];
  weakCombos?: EdgeComboMetric[];
  progression?: ProgressionStats | null;
  currencySymbol: string;
}

/**
 * Synthesizes an automatic, 100% deterministic conclusion directly computed from real trade data.
 * NEVER invents or hallucinates facts.
 */
export function generateDeterministicEdgeConclusion(input: EdgeConclusionInput): string {
  const { stats, bySymbol, bySession, bySetup, byDirection, topCombos, weakCombos, progression } = input;

  if (!stats || stats.totalTrades === 0) {
    return "Aucune donnée disponible pour formuler une conclusion sur votre edge.";
  }

  if (stats.totalTrades < 10) {
    return `Votre historique ne compte actuellement que ${stats.totalTrades} trade(s) valide(s). Ce volume est insuffisant pour tirer une conclusion statistique définitive sur votre edge. Continuez à journaliser vos prises de position.`;
  }

  // 1. Identify best and worst symbols (min 3 trades)
  const qualifiedSymbols = bySymbol.filter((s) => s.totalTrades >= 3);
  const bestSymbol = qualifiedSymbols.find((s) => s.totalPnL > 0 && (s.expectancyR ?? 0) > 0);
  const worstSymbol = [...qualifiedSymbols].reverse().find((s) => s.totalPnL < 0 || (s.expectancyR ?? 0) < 0);

  // 2. Identify best and worst kill zones
  const qualifiedSessions = bySession.filter((s) => s.totalTrades >= 3);
  const bestSession = [...qualifiedSessions].sort((a, b) => (b.expectancyR ?? 0) - (a.expectancyR ?? 0))[0];
  const worstSession = [...qualifiedSessions].sort((a, b) => (a.expectancyR ?? 0) - (b.expectancyR ?? 0))[0];

  // 3. Identify best setups
  const qualifiedSetups = bySetup.filter((s) => s.totalTrades >= 3);
  const bestSetup = [...qualifiedSetups].sort((a, b) => (b.expectancyR ?? 0) - (a.expectancyR ?? 0))[0];
  const worstSetup = [...qualifiedSetups].sort((a, b) => (a.expectancyR ?? 0) - (b.expectancyR ?? 0))[0];

  // 4. Direction
  const buyMetric = byDirection.find((d) => d.key === 'BUY');
  const sellMetric = byDirection.find((d) => d.key === 'SELL');
  let directionInsight = '';
  if (buyMetric && sellMetric) {
    const buyExp = buyMetric.expectancyR ?? 0;
    const sellExp = sellMetric.expectancyR ?? 0;
    if (Math.abs(buyExp - sellExp) > 0.15) {
      const topDir = buyExp > sellExp ? 'BUY (Long)' : 'SELL (Short)';
      directionInsight = `Vos résultats sont nettement plus favorables en position ${topDir}.`;
    }
  }

  const parts: string[] = [];

  // Edge core sentence
  if (bestSymbol && bestSession && (bestSession.expectancyR ?? 0) > 0) {
    const setupStr = bestSetup && (bestSetup.expectancyR ?? 0) > 0 ? ` avec le modèle ${bestSetup.label}` : '';
    parts.push(`Votre avantage actuel s'exprime principalement sur ${bestSymbol.label} pendant la session ${bestSession.label}${setupStr}.`);
  } else if (bestSession && (bestSession.expectancyR ?? 0) > 0) {
    parts.push(`Votre meilleure régularité est observée durant la Kill Zone ${bestSession.label} (+${bestSession.expectancyR?.toFixed(2)}R d'espérance).`);
  }

  // Weak area / Leaks to avoid
  if (worstSession && (worstSession.expectancyR ?? 0) < 0) {
    parts.push(`La session ${worstSession.label} présente une expectancy négative (${worstSession.expectancyR?.toFixed(2)}R) et constitue une fuite de capital à limiter.`);
  } else if (worstSymbol && (worstSymbol.expectancyR ?? 0) < 0) {
    parts.push(`L'actif ${worstSymbol.label} sous-performe (${worstSymbol.expectancyR?.toFixed(2)}R) et devrait être surveillé ou écarté temporairement.`);
  }

  if (directionInsight) {
    parts.push(directionInsight);
  }

  // Top combo note
  if (topCombos && topCombos.length > 0) {
    const top = topCombos[0];
    if (top.totalTrades < 30) {
      parts.push(`Votre meilleure combinaison (${top.symbol} / ${top.killzone} / ${top.setup} / ${top.side}) affiche un excellent ratio mais requiert encore d'atteindre 30 trades pour être pleinement confirmée.`);
    }
  }

  // Progression note
  if (progression) {
    if (progression.trend === 'improving') {
      parts.push("Votre dynamique sur les 30 derniers trades est en nette progression positive.");
    } else if (progression.trend === 'degrading') {
      parts.push("Attention : vos métriques récentes marquent un fléchissement par rapport au cycle précédent.");
    }
  }

  return parts.join(' ');
}
