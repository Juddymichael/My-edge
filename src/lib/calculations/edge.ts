import { Trade } from '../../types/trade';
import { Setup } from '../../types/setup';
import { safeAdd, safeDivide, roundToDecimals } from './precision';
import { calculateDrawdown } from './drawdown';
import { calculateProfitFactor, calculateWinRate, calculateExpectancy } from './statistics';

export type ConfidenceTier = 'CONFIRMED' | 'DEVELOPING' | 'LOW_SAMPLE';

export interface EdgeScoreBreakdown {
  totalScore: number; // 0 to 100
  ratingLabel: 'EXCELLENT' | 'SOLIDE' | 'MOYEN' | 'FRAGILE' | 'INSUFFISANT';
  expectancyPoints: number; // /30
  profitFactorPoints: number; // /25
  winRateEfficiencyPoints: number; // /25
  sampleConfidencePoints: number; // /20
  explanations: string[];
}

export interface DimensionPerformance {
  key: string;
  label: string;
  category?: string;
  sampleSize: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number; // in %
  profitFactor: number | null;
  totalNetPnL: number;
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  avgReturn: number;
  totalR: number | null;
  avgR: number | null;
  rExpectancy: number | null; // in R
  monetaryExpectancy: number; // in Currency
  confidenceTier: ConfidenceTier;
  confidenceMessage: string;
  edgeScore: EdgeScoreBreakdown;
}

export interface SetupPairKillzoneCombo {
  setup: string;
  pair: string;
  killzone: string;
  sampleSize: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalNetPnL: number;
  totalR: number | null;
  rExpectancy: number | null;
  profitFactor: number | null;
  confidenceTier: ConfidenceTier;
  edgeScore: EdgeScoreBreakdown;
}

export interface EdgeAuditVerdict {
  bestSetup: DimensionPerformance | null;
  worstSetup: DimensionPerformance | null;
  bestPair: DimensionPerformance | null;
  worstPair: DimensionPerformance | null;
  bestKillzone: DimensionPerformance | null;
  worstKillzone: DimensionPerformance | null;
  buyPerformance: DimensionPerformance | null;
  sellPerformance: DimensionPerformance | null;
  topCombination: SetupPairKillzoneCombo | null;
  worstCombination: SetupPairKillzoneCombo | null;
  recurringConditions: string[];
  keyTakeaway: string;
}

/**
 * Determines confidence tier according to rigorous statistical sample size.
 */
export function getConfidenceTier(sampleSize: number): {
  tier: ConfidenceTier;
  message: string;
} {
  if (sampleSize >= 15) {
    return {
      tier: 'CONFIRMED',
      message: 'Échantillon robuste (≥ 15 trades) — Edge confirmé',
    };
  }
  if (sampleSize >= 5) {
    return {
      tier: 'DEVELOPING',
      message: 'Échantillon modéré (5-14 trades) — Tendance en développement',
    };
  }
  return {
    tier: 'LOW_SAMPLE',
    message: 'Échantillon insuffisant (< 5 trades) — Non représentatif',
  };
}

/**
 * Calcul transparent et explicable de l'Edge Score (sur 100 points).
 * 
 * 4 Piliers Mathématiques :
 * 1. Espérance Mathématique / Expectancy (30 points)
 * 2. Facteur de Profit / Profit Factor (25 points)
 * 3. Efficience Win Rate × Ratio R/R (25 points)
 * 4. Fiabilité Statistique / Sample Size (20 points)
 */
export function calculateTransparentEdgeScore(
  closedCount: number,
  winRate: number,
  profitFactor: number | null,
  monetaryExpectancy: number,
  rExpectancy: number | null,
  avgWin: number,
  avgLoss: number
): EdgeScoreBreakdown {
  const explanations: string[] = [];

  // --- PILIER 1 : ESPÉRANCE MATHÉMATIQUE (Max 30 pts) ---
  let expectancyPoints = 0;
  if (rExpectancy !== null) {
    if (rExpectancy >= 1.0) {
      expectancyPoints = 30;
      explanations.push(`Espérance exceptionnelle (+${rExpectancy.toFixed(2)}R par trade) → 30/30 pts`);
    } else if (rExpectancy >= 0.5) {
      expectancyPoints = 25;
      explanations.push(`Très forte espérance (+${rExpectancy.toFixed(2)}R par trade) → 25/30 pts`);
    } else if (rExpectancy >= 0.2) {
      expectancyPoints = 18;
      explanations.push(`Espérance positive solide (+${rExpectancy.toFixed(2)}R par trade) → 18/30 pts`);
    } else if (rExpectancy > 0) {
      expectancyPoints = 10;
      explanations.push(`Espérance légèrement positive (+${rExpectancy.toFixed(2)}R par trade) → 10/30 pts`);
    } else {
      expectancyPoints = 0;
      explanations.push(`Espérance négative (${rExpectancy.toFixed(2)}R par trade) → 0/30 pts`);
    }
  } else {
    // Monétaire
    if (monetaryExpectancy > 100) {
      expectancyPoints = 25;
      explanations.push(`Espérance monétaire élevée (+${monetaryExpectancy.toFixed(2)}) → 25/30 pts`);
    } else if (monetaryExpectancy > 0) {
      expectancyPoints = 15;
      explanations.push(`Espérance monétaire positive (+${monetaryExpectancy.toFixed(2)}) → 15/30 pts`);
    } else {
      expectancyPoints = 0;
      explanations.push(`Espérance monétaire négative ou nulle → 0/30 pts`);
    }
  }

  // --- PILIER 2 : PROFIT FACTOR (Max 25 pts) ---
  let profitFactorPoints = 0;
  if (profitFactor !== null && closedCount >= 2) {
    if (profitFactor >= 2.5) {
      profitFactorPoints = 25;
      explanations.push(`Profit Factor d'élite (PF ${profitFactor.toFixed(2)} ≥ 2.5) → 25/25 pts`);
    } else if (profitFactor >= 1.8) {
      profitFactorPoints = 20;
      explanations.push(`Excellent Profit Factor (PF ${profitFactor.toFixed(2)} ≥ 1.8) → 20/25 pts`);
    } else if (profitFactor >= 1.3) {
      profitFactorPoints = 15;
      explanations.push(`Profit Factor rentable (PF ${profitFactor.toFixed(2)} ≥ 1.3) → 15/25 pts`);
    } else if (profitFactor >= 1.0) {
      profitFactorPoints = 8;
      explanations.push(`Profit Factor tout juste à l'équilibre (PF ${profitFactor.toFixed(2)}) → 8/25 pts`);
    } else {
      profitFactorPoints = 0;
      explanations.push(`Stratégie déficitaire (PF ${profitFactor.toFixed(2)} < 1.0) → 0/25 pts`);
    }
  } else {
    explanations.push(`Profit Factor non calculable (échantillon trop court) → 0/25 pts`);
  }

  // --- PILIER 3 : EFFICIENCE WIN RATE × R/R RÉALISÉ (Max 25 pts) ---
  let winRateEfficiencyPoints = 0;
  const realizedRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 2.5 : 1;
  const breakEvenWinRate = 100 / (1 + realizedRR);
  const winRateAdvantage = winRate - breakEvenWinRate;

  if (closedCount >= 2) {
    if (winRateAdvantage >= 20) {
      winRateEfficiencyPoints = 25;
      explanations.push(`Taux de réussite largement au-dessus du seuil de rentabilité (+${winRateAdvantage.toFixed(1)}% de marge) → 25/25 pts`);
    } else if (winRateAdvantage >= 10) {
      winRateEfficiencyPoints = 20;
      explanations.push(`Bonne marge de sécurité statistique (+${winRateAdvantage.toFixed(1)}% vs BE) → 20/25 pts`);
    } else if (winRateAdvantage >= 0) {
      winRateEfficiencyPoints = 12;
      explanations.push(`Taux de réussite au-dessus du seuil neutre (${winRate.toFixed(1)}% vs ${breakEvenWinRate.toFixed(1)}% seuil) → 12/25 pts`);
    } else {
      winRateEfficiencyPoints = 0;
      explanations.push(`Taux de réussite insuffisant pour compenser le R/R (${winRate.toFixed(1)}% < ${breakEvenWinRate.toFixed(1)}% requis) → 0/25 pts`);
    }
  }

  // --- PILIER 4 : FIABILITÉ STATISTIQUE & SAMPLE SIZE (Max 20 pts) ---
  let sampleConfidencePoints = 0;
  if (closedCount >= 30) {
    sampleConfidencePoints = 20;
    explanations.push(`Échantillon très robuste (${closedCount} trades ≥ 30) → 20/20 pts`);
  } else if (closedCount >= 15) {
    sampleConfidencePoints = 16;
    explanations.push(`Échantillon confirmé (${closedCount} trades ≥ 15) → 16/20 pts`);
  } else if (closedCount >= 8) {
    sampleConfidencePoints = 10;
    explanations.push(`Échantillon modéré en cours de validation (${closedCount} trades) → 10/20 pts`);
  } else if (closedCount >= 4) {
    sampleConfidencePoints = 5;
    explanations.push(`Échantillon réduit (${closedCount} trades) — Fiabilité limitée → 5/20 pts`);
  } else {
    sampleConfidencePoints = 1;
    explanations.push(`Échantillon insuffisant (${closedCount} trade(s) < 4) — Aucun recul statistique → 1/20 pts`);
  }

  const totalScore = expectancyPoints + profitFactorPoints + winRateEfficiencyPoints + sampleConfidencePoints;

  let ratingLabel: 'EXCELLENT' | 'SOLIDE' | 'MOYEN' | 'FRAGILE' | 'INSUFFISANT' = 'INSUFFISANT';
  if (totalScore >= 80) ratingLabel = 'EXCELLENT';
  else if (totalScore >= 65) ratingLabel = 'SOLIDE';
  else if (totalScore >= 45) ratingLabel = 'MOYEN';
  else if (totalScore >= 25) ratingLabel = 'FRAGILE';

  return {
    totalScore,
    ratingLabel,
    expectancyPoints,
    profitFactorPoints,
    winRateEfficiencyPoints,
    sampleConfidencePoints,
    explanations,
  };
}

/**
 * Universal cluster analyzer for any group of trades (Setup, Symbol, Killzone, Direction, Combination).
 */
export function analyzeCluster(
  trades: Trade[],
  key: string,
  label: string,
  category?: string
): DimensionPerformance {
  const EPSILON = 0.0001;
  const sampleSize = trades.length;
  const closedTrades = trades.filter(
    (t) => t.status !== 'OPEN' && t.netPnL !== null && t.netPnL !== undefined
  );
  const openTrades = trades.filter((t) => t.status === 'OPEN').length;

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalNetPnL = 0;
  let totalR: number | null = null;
  let rCount = 0;

  for (const t of closedTrades) {
    const pnl = t.netPnL ?? 0;
    totalNetPnL = safeAdd(totalNetPnL, pnl);

    if (pnl > EPSILON) {
      wins++;
      grossProfit = safeAdd(grossProfit, pnl);
    } else if (pnl < -EPSILON) {
      losses++;
      grossLoss = safeAdd(grossLoss, Math.abs(pnl));
    } else {
      breakevens++;
    }

    if (t.rMultiple !== null && t.rMultiple !== undefined && !isNaN(t.rMultiple)) {
      if (totalR === null) totalR = 0;
      totalR = safeAdd(totalR, t.rMultiple);
      rCount++;
    }
  }

  const closedCount = closedTrades.length;
  const winRate = closedCount > 0 ? (wins / closedCount) * 100 : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const avgReturn = closedCount > 0 ? totalNetPnL / closedCount : 0;

  // Profit Factor (only computed if sufficient sample, capped at 99.99 for display)
  let profitFactor: number | null = null;
  if (closedCount >= 2) {
    if (grossLoss > 0) {
      profitFactor = roundToDecimals(grossProfit / grossLoss, 2);
    } else if (grossProfit > 0) {
      profitFactor = 99.99;
    } else {
      profitFactor = 0;
    }
  }

  // Expectancy in Currency: (WinRate * AvgWin) - (LossRate * AvgLoss)
  const winFraction = closedCount > 0 ? wins / closedCount : 0;
  const lossFraction = closedCount > 0 ? losses / closedCount : 0;
  const monetaryExpectancy =
    closedCount > 0 ? roundToDecimals(winFraction * avgWin - lossFraction * avgLoss, 2) : 0;

  // Expectancy in R
  const avgR = rCount > 0 && totalR !== null ? roundToDecimals(totalR / rCount, 2) : null;
  let rExpectancy: number | null = null;
  if (rCount >= 2 && totalR !== null) {
    rExpectancy = avgR;
  }

  const { tier, message } = getConfidenceTier(closedCount);

  const edgeScore = calculateTransparentEdgeScore(
    closedCount,
    winRate,
    profitFactor,
    monetaryExpectancy,
    rExpectancy,
    avgWin,
    avgLoss
  );

  return {
    key,
    label,
    category,
    sampleSize,
    closedTrades: closedCount,
    openTrades,
    wins,
    losses,
    breakevens,
    winRate: roundToDecimals(winRate, 1),
    profitFactor,
    totalNetPnL: roundToDecimals(totalNetPnL, 2),
    grossProfit: roundToDecimals(grossProfit, 2),
    grossLoss: roundToDecimals(grossLoss, 2),
    avgWin: roundToDecimals(avgWin, 2),
    avgLoss: roundToDecimals(avgLoss, 2),
    avgReturn: roundToDecimals(avgReturn, 2),
    totalR: totalR !== null ? roundToDecimals(totalR, 2) : null,
    avgR,
    rExpectancy,
    monetaryExpectancy,
    confidenceTier: tier,
    confidenceMessage: message,
    edgeScore,
  };
}

/**
 * Generates an exhaustive breakdown across Setups, Pairs, Sessions, Directions,
 * and Combo matrices (Setup × Pair × Killzone) strictly from real logged trade data.
 */
export function calculateMyEdgeDeepAudit(
  trades: Trade[] = [],
  registeredSetups: Setup[] = []
): {
  setups: DimensionPerformance[];
  pairs: DimensionPerformance[];
  killzones: DimensionPerformance[];
  directions: DimensionPerformance[];
  combinations: SetupPairKillzoneCombo[];
  verdict: EdgeAuditVerdict;
} {
  const safeTrades = (trades || []).filter((t) => t !== null && t !== undefined);

  // 1. Group by Setup
  const setupMap = new Map<string, Trade[]>();
  for (const t of safeTrades) {
    const rawSetup = t.setup?.trim() || t.setupId || 'Non défini / Général';
    const group = setupMap.get(rawSetup) || [];
    group.push(t);
    setupMap.set(rawSetup, group);
  }

  const setupPerformances: DimensionPerformance[] = [];
  // Add registered setups
  for (const reg of registeredSetups) {
    const matching =
      setupMap.get(reg.name) || setupMap.get(reg.shortName) || setupMap.get(reg.id) || [];
    setupMap.delete(reg.name);
    setupMap.delete(reg.shortName);
    setupMap.delete(reg.id);

    setupPerformances.push(analyzeCluster(matching, reg.id, reg.name, reg.category));
  }
  // Add remaining unmapped setups
  for (const [key, cluster] of setupMap.entries()) {
    setupPerformances.push(analyzeCluster(cluster, key, key, 'Personnalisé'));
  }
  // Sort setups by Edge score then sample size
  setupPerformances.sort(
    (a, b) => b.edgeScore.totalScore - a.edgeScore.totalScore || b.sampleSize - a.sampleSize
  );

  // 2. Group by Pair / Symbol
  const pairMap = new Map<string, Trade[]>();
  for (const t of safeTrades) {
    const sym = (t.symbol || 'AUTRE').toUpperCase().trim();
    const group = pairMap.get(sym) || [];
    group.push(t);
    pairMap.set(sym, group);
  }
  const pairPerformances: DimensionPerformance[] = [];
  for (const [pair, cluster] of pairMap.entries()) {
    pairPerformances.push(analyzeCluster(cluster, pair, pair, 'Paire'));
  }
  pairPerformances.sort((a, b) => b.totalNetPnL - a.totalNetPnL || b.sampleSize - a.sampleSize);

  // 3. Group by Killzone / Killzone
  const killzoneMap = new Map<string, Trade[]>();
  for (const t of safeTrades) {
    let sess = (t.session || 'AUTRE').toUpperCase().trim();
    if (sess === 'LONDON' || sess === 'LONDRES') sess = 'Killzone Londres';
    else if (sess === 'NEW_YORK' || sess === 'NEW YORK' || sess === 'NY') sess = 'New York';
    else if (sess === 'TOKYO' || sess === 'ASIE' || sess === 'ASIA') sess = 'Killzone Asia';
    else if (sess === 'Killzone Sydney') sess = 'Sydney';
    else if (sess === 'OVERNIGHT') sess = 'Overnight';
    else sess = t.session || 'Standard / Non spécifié';

    const group = killzoneMap.get(sess) || [];
    group.push(t);
    killzoneMap.set(sess, group);
  }
  const killzonePerformances: DimensionPerformance[] = [];
  for (const [sess, cluster] of killzoneMap.entries()) {
    killzonePerformances.push(analyzeCluster(cluster, sess, sess, 'Killzone'));
  }
  killzonePerformances.sort((a, b) => b.totalNetPnL - a.totalNetPnL || b.sampleSize - a.sampleSize);

  // 4. Group by Direction (Buy vs Sell)
  const dirMap = new Map<string, Trade[]>();
  for (const t of safeTrades) {
    const dir = t.direction === 'SELL' ? 'SELL' : 'BUY';
    const group = dirMap.get(dir) || [];
    group.push(t);
    dirMap.set(dir, group);
  }
  const directionPerformances: DimensionPerformance[] = [
    analyzeCluster(dirMap.get('BUY') || [], 'BUY', 'Positions Long (BUY)', 'Direction'),
    analyzeCluster(dirMap.get('SELL') || [], 'SELL', 'Positions Short (SELL)', 'Direction'),
  ];

  // 5. Multi-dimensional Combinations: Setup × Pair × Killzone
  const comboMap = new Map<string, Trade[]>();
  for (const t of safeTrades) {
    const setup = t.setup?.trim() || t.setupId || 'Général';
    const pair = (t.symbol || 'AUTRE').toUpperCase().trim();
    const session = t.session || 'Toutes';
    const comboKey = `${setup}___${pair}___${session}`;
    const group = comboMap.get(comboKey) || [];
    group.push(t);
    comboMap.set(comboKey, group);
  }

  const combinations: SetupPairKillzoneCombo[] = [];
  for (const [comboKey, cluster] of comboMap.entries()) {
    const [setup, pair, session] = comboKey.split('___');
    const clusterStats = analyzeCluster(cluster, comboKey, comboKey);
    combinations.push({
      setup,
      pair,
      session,
      sampleSize: clusterStats.sampleSize,
      wins: clusterStats.wins,
      losses: clusterStats.losses,
      breakevens: clusterStats.breakevens,
      winRate: clusterStats.winRate,
      totalNetPnL: clusterStats.totalNetPnL,
      totalR: clusterStats.totalR,
      rExpectancy: clusterStats.rExpectancy,
      profitFactor: clusterStats.profitFactor,
      confidenceTier: clusterStats.confidenceTier,
      edgeScore: clusterStats.edgeScore,
    });
  }
  combinations.sort((a, b) => b.totalNetPnL - a.totalNetPnL || b.sampleSize - a.sampleSize);

  // 6. Formulate Executive Verdict
  const eligibleSetups = setupPerformances.filter((s) => s.closedTrades >= 2);
  const bestSetup = eligibleSetups.length > 0
    ? [...eligibleSetups].sort((a, b) => b.edgeScore.totalScore - a.edgeScore.totalScore || b.totalNetPnL - a.totalNetPnL)[0]
    : setupPerformances[0] || null;
  const worstSetup = eligibleSetups.length > 1
    ? [...eligibleSetups].sort((a, b) => a.totalNetPnL - b.totalNetPnL)[0]
    : null;

  const eligiblePairs = pairPerformances.filter((p) => p.closedTrades >= 2);
  const bestPair = eligiblePairs.length > 0
    ? [...eligiblePairs].sort((a, b) => b.totalNetPnL - a.totalNetPnL)[0]
    : pairPerformances[0] || null;
  const worstPair = eligiblePairs.length > 1
    ? [...eligiblePairs].sort((a, b) => a.totalNetPnL - b.totalNetPnL)[0]
    : null;

  const eligibleSessions = killzonePerformances.filter((s) => s.closedTrades >= 2);
  const bestKillzone = eligibleSessions.length > 0
    ? [...eligibleSessions].sort((a, b) => b.totalNetPnL - a.totalNetPnL)[0]
    : killzonePerformances[0] || null;
  const worstKillzone = eligibleSessions.length > 1
    ? [...eligibleSessions].sort((a, b) => a.totalNetPnL - b.totalNetPnL)[0]
    : null;

  const buyPerf = directionPerformances.find((d) => d.key === 'BUY') || null;
  const sellPerf = directionPerformances.find((d) => d.key === 'SELL') || null;

  const topCombo = combinations.length > 0 ? combinations[0] : null;
  const worstCombo =
    combinations.length > 1 ? combinations[combinations.length - 1] : null;

  // Recurring conditions
  const recurringConditions: string[] = [];
  if (bestPair && bestPair.totalNetPnL > 0) {
    recurringConditions.push(
      `Paire dominante : ${bestPair.label} avec ${bestPair.winRate}% de réussite sur ${bestPair.sampleSize} trades.`
    );
  }
  if (bestKillzone && bestKillzone.totalNetPnL > 0) {
    recurringConditions.push(
      `Killzone la plus rentable : ${bestKillzone.label} (P&L net ${bestKillzone.totalNetPnL >= 0 ? '+' : ''}${bestKillzone.totalNetPnL}).`
    );
  }
  if (buyPerf && sellPerf && buyPerf.closedTrades > 0 && sellPerf.closedTrades > 0) {
    if (buyPerf.winRate > sellPerf.winRate + 5) {
      recurringConditions.push(
        `Biais directionnel : Les achats (BUY) surperforment avec ${buyPerf.winRate}% vs ${sellPerf.winRate}% en vente.`
      );
    } else if (sellPerf.winRate > buyPerf.winRate + 5) {
      recurringConditions.push(
        `Biais directionnel : Les ventes (SELL) surperforment avec ${sellPerf.winRate}% vs ${buyPerf.winRate}% en achat.`
      );
    } else {
      recurringConditions.push(
        `Biais équilibré : Rentabilité comparable entre les positions Long (${buyPerf.winRate}%) et Short (${sellPerf.winRate}%).`
      );
    }
  }

  let keyTakeaway = 'Données en cours de constitution.';
  if (topCombo && topCombo.sampleSize >= 2) {
    keyTakeaway = `Votre rentabilité maximale est concentrée sur ${topCombo.pair} pendant la session ${topCombo.session} (${topCombo.setup}), générant ${topCombo.winRate}% de win rate sur ${topCombo.sampleSize} trades.`;
  } else if (bestPair) {
    keyTakeaway = `Votre meilleur actif de trading est ${bestPair.label} avec un taux de réussite de ${bestPair.winRate}%.`;
  }

  return {
    setups: setupPerformances,
    pairs: pairPerformances,
    killzones: killzonePerformances,
    directions: directionPerformances,
    combinations,
    verdict: {
      bestSetup,
      worstSetup,
      bestPair,
      worstPair,
      bestKillzone,
      worstKillzone,
      buyPerformance: buyPerf,
      sellPerformance: sellPerf,
      topCombination: topCombo,
      worstCombination: worstCombo,
      recurringConditions,
      keyTakeaway,
    },
  };
}
