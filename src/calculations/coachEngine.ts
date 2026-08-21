import { 
  Trade, 
  PerformanceStats, 
  TraderPerformanceScoreData, 
  TraderPillarScore, 
  EdgeFinding, 
  LeakFinding, 
  StructuredEdgeItem,
  StructuredLeakItem,
  EdgeLeakCombination,
  SmartRiskAlert, 
  DailyCoachSummary, 
  MonthlyCoachSummary,
  WeeklyCoachSummary, 
  TraderProfileData, 
  FundedModeEvaluation, 
  PropFirmConfig, 
  TradeAiReviewResult 
} from '../types';
import { getTradeRMultiple } from './index';

// 1. Calculate Trader Performance Score (0 to 100) across 5 pillars
export function calculateTraderPerformanceScore(
  trades: Trade[],
  stats: PerformanceStats,
  startingBalance: number
): TraderPerformanceScoreData {
  const totalTrades = trades.length;

  if (totalTrades < 3) {
    const insufficientPillar = (label: string): TraderPillarScore => ({
      score: 0,
      label,
      status: 'insufficient',
      reason: 'Échantillon insuffisant (minimum 3 trades requis pour une évaluation fiable).'
    });

    return {
      overallScore: 0,
      hasEnoughData: false,
      totalTrades,
      pillars: {
        setupQuality: insufficientPillar('Setup Quality'),
        execution: insufficientPillar('Execution'),
        riskManagement: insufficientPillar('Risk Management'),
        discipline: insufficientPillar('Discipline'),
        tradeManagement: insufficientPillar('Trade Management'),
      },
      summary: {
        yourEdge: 'Données insuffisantes pour dégager un edge formel.',
        biggestLeak: 'Continuez à enregistrer vos trades pour détecter vos premiers leaks.',
        behavior: 'Historique trop court pour établir une tendance comportementale.',
        currentFocus: 'Enregistrez vos 5 à 10 prochains trades avec rigueur (Stop Loss, Setup, Session).',
      }
    };
  }

  // Pillar 1: Setup Quality (0-100)
  // Evaluates if trades have declared setups and positive expectancy setups
  const tradesWithSetup = trades.filter(t => t.setup && t.setup.trim() !== '' && t.setup !== 'Autre' && t.setup !== 'None');
  const setupRatio = tradesWithSetup.length / totalTrades;
  const winrate = stats.winrate || 50;
  const profitFactor = stats.profitFactor || 1.0;
  
  let setupQualityScore = Math.round((setupRatio * 40) + Math.min(60, (winrate * 0.4) + (profitFactor > 1 ? Math.min(20, (profitFactor - 1) * 15) : 0)));
  setupQualityScore = Math.min(98, Math.max(20, setupQualityScore));

  // Pillar 2: Execution (0-100)
  // Evaluates presence of SL, TP, entry/exit precision, Killzone tagging
  const tradesWithSL = trades.filter(t => t.stopLoss !== undefined && t.stopLoss !== null && t.stopLoss > 0).length;
  const tradesWithKillzone = trades.filter(t => t.killzone && t.killzone.trim() !== '').length;
  const tradesWithNotes = trades.filter(t => (t.preTradePlan || t.postTradeReview || t.notes)).length;

  const slRatio = tradesWithSL / totalTrades;
  const kzRatio = tradesWithKillzone / totalTrades;
  const noteRatio = tradesWithNotes / totalTrades;

  let executionScore = Math.round((slRatio * 45) + (kzRatio * 35) + (noteRatio * 20));
  executionScore = Math.min(98, Math.max(25, executionScore));

  // Pillar 3: Risk Management (0-100)
  // Evaluates max drawdown percent, risk consistency, average loss vs average win
  const maxDDPercent = stats.maxDrawdownPercent || 0;
  const avgLoss = Math.abs(stats.avgLoss || 1);
  const avgWin = stats.avgWin || 1;
  const rrRatio = avgLoss > 0 ? avgWin / avgLoss : 1;

  let ddScore = maxDDPercent <= 3 ? 40 : maxDDPercent <= 6 ? 30 : maxDDPercent <= 10 ? 20 : maxDDPercent <= 15 ? 10 : 0;
  let rrScore = rrRatio >= 2.0 ? 40 : rrRatio >= 1.5 ? 35 : rrRatio >= 1.0 ? 25 : 15;
  let slDisciplineScore = slRatio >= 0.9 ? 20 : slRatio >= 0.7 ? 12 : 5;

  let riskScore = Math.min(98, Math.max(20, ddScore + rrScore + slDisciplineScore));

  // Pillar 4: Discipline & Psychological Control (0-100)
  // Evaluates overtrading on single days, revenge trading after loss, streak handling
  const tradesByDay: { [date: string]: Trade[] } = {};
  trades.forEach(t => {
    if (!tradesByDay[t.date]) tradesByDay[t.date] = [];
    tradesByDay[t.date].push(t);
  });

  const overtradedDays = Object.values(tradesByDay).filter(arr => arr.length >= 4).length;
  const totalDays = Math.max(1, Object.keys(tradesByDay).length);
  const overtradePenalty = Math.min(30, (overtradedDays / totalDays) * 60);

  // Check post-loss performance (revenge trading check)
  const sortedTrades = [...trades].sort((a, b) => new Date(`${a.date} ${a.time || '12:00'}`).getTime() - new Date(`${b.date} ${b.time || '12:00'}`).getTime());
  let postLossTradesCount = 0;
  let postLossLossesCount = 0;
  for (let i = 1; i < sortedTrades.length; i++) {
    if (sortedTrades[i - 1].netPnL < 0) {
      postLossTradesCount++;
      if (sortedTrades[i].netPnL < 0) {
        postLossLossesCount++;
      }
    }
  }
  const postLossLossRate = postLossTradesCount > 0 ? (postLossLossesCount / postLossTradesCount) : 0.5;
  const revengePenalty = postLossLossRate > 0.65 && postLossTradesCount >= 3 ? 15 : 0;

  let disciplineScore = Math.round(95 - overtradePenalty - revengePenalty - (stats.lossStreak > 4 ? 10 : 0));
  disciplineScore = Math.min(98, Math.max(25, disciplineScore));

  // Pillar 5: Trade Management (0-100)
  // Evaluates R-multiple capture, expectancy, win streak holding
  const avgR = stats.avgR || 0;
  const expectancy = stats.expectancy || 0;
  let tradeMgmtScore = Math.round(50 + (avgR > 0 ? Math.min(30, avgR * 25) : -15) + (expectancy > 0 ? 15 : -10));
  tradeMgmtScore = Math.min(98, Math.max(20, tradeMgmtScore));

  // Global weighted score
  const overallScore = Math.round(
    setupQualityScore * 0.20 +
    executionScore * 0.20 +
    riskManagementScore(riskScore) * 0.25 +
    disciplineScore * 0.20 +
    tradeMgmtScore * 0.15
  );

  function getStatus(score: number): 'excellent' | 'good' | 'caution' | 'critical' {
    if (score >= 82) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'caution';
    return 'critical';
  }

  function riskManagementScore(s: number) { return s; }

  // Generate dynamic summaries based on actual metrics
  const edgeSummary = generateEdgeSummary(trades);
  const leakSummary = generateLeakSummary(trades);
  const behaviorSummary = generateBehaviorSummary(trades, sortedTrades, overtradedDays);
  const focusSummary = generateFocusSummary(setupQualityScore, executionScore, riskScore, disciplineScore, tradeMgmtScore);

  return {
    overallScore,
    hasEnoughData: true,
    totalTrades,
    pillars: {
      setupQuality: {
        score: setupQualityScore,
        label: 'Setup Quality',
        status: getStatus(setupQualityScore),
        reason: `${Math.round(setupRatio * 100)}% des trades ont un setup qualifié. Win Rate global de ${winrate.toFixed(1)}%.`
      },
      execution: {
        score: executionScore,
        label: 'Execution',
        status: getStatus(executionScore),
        reason: `${Math.round(slRatio * 100)}% de trades avec Stop Loss explicite, ${Math.round(kzRatio * 100)}% tagués avec Session/Killzone.`
      },
      riskManagement: {
        score: riskScore,
        label: 'Risk Management',
        status: getStatus(riskScore),
        reason: `Drawdown maximum contenu à ${maxDDPercent.toFixed(1)}%. Ratio Gain/Perte moyen de ${rrRatio.toFixed(2)}.`
      },
      discipline: {
        score: disciplineScore,
        label: 'Discipline',
        status: getStatus(disciplineScore),
        reason: overtradedDays > 0 
          ? `${overtradedDays} journée(s) avec ≥ 4 trades détectée(s). Contrôle du risque émotionnel.`
          : `Excellente régularité journalière sans overtrading abusif.`
      },
      tradeManagement: {
        score: tradeMgmtScore,
        label: 'Trade Management',
        status: getStatus(tradeMgmtScore),
        reason: `Moyenne R par trade : ${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R. Expectancy de $${expectancy.toFixed(2)}.`
      },
    },
    summary: {
      yourEdge: edgeSummary,
      biggestLeak: leakSummary,
      behavior: behaviorSummary,
      currentFocus: focusSummary,
    }
  };
}

// 2. Identify Statistical Edge Findings
export function identifyYourEdgeFindings(trades: Trade[]): EdgeFinding[] {
  if (trades.length < 2) return [];

  const findings: EdgeFinding[] = [];

  // Group by setup
  const setupGroups: { [setup: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.setup?.trim() || 'Non spécifié';
    if (!setupGroups[s]) setupGroups[s] = [];
    setupGroups[s].push(t);
  });

  Object.entries(setupGroups).forEach(([setup, arr]) => {
    if (arr.length >= 2 && setup !== 'Non spécifié') {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const pnl = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const avgR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / arr.length;

      if (wr >= 50 && pnl > 0) {
        findings.push({
          title: setup,
          category: 'setup',
          tradesCount: arr.length,
          winrate: wr,
          totalPnL: pnl,
          avgR,
          sampleStatus: arr.length >= 15 ? 'reliable' : arr.length >= 5 ? 'caution' : 'small',
          sampleLabel: arr.length >= 15 ? 'Échantillon fiable' : arr.length >= 5 ? 'Tendance prometteuse' : 'Échantillon faible — continuer à collecter',
          description: `Excellente régularité sur le setup ${setup} avec ${wr.toFixed(1)}% de Win Rate sur ${arr.length} trades.`
        });
      }
    }
  });

  // Group by session / killzone
  const sessionGroups: { [kz: string]: Trade[] } = {};
  trades.forEach(t => {
    const kz = t.killzone?.trim() || 'Non spécifié';
    if (!sessionGroups[kz]) sessionGroups[kz] = [];
    sessionGroups[kz].push(t);
  });

  Object.entries(sessionGroups).forEach(([session, arr]) => {
    if (arr.length >= 2 && session !== 'Non spécifié') {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const pnl = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const avgR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / arr.length;

      if (wr >= 50 && pnl > 0) {
        findings.push({
          title: session,
          category: 'session',
          tradesCount: arr.length,
          winrate: wr,
          totalPnL: pnl,
          avgR,
          sampleStatus: arr.length >= 15 ? 'reliable' : arr.length >= 5 ? 'caution' : 'small',
          sampleLabel: arr.length >= 15 ? 'Échantillon fiable' : arr.length >= 5 ? 'Tendance prometteuse' : 'Échantillon faible — continuer à collecter',
          description: `Session hautement productive avec ${wr.toFixed(1)}% de réussite et +${avgR.toFixed(2)}R moyen.`
        });
      }
    }
  });

  // Group by instrument
  const symGroups: { [sym: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.symbol.toUpperCase();
    if (!symGroups[s]) symGroups[s] = [];
    symGroups[s].push(t);
  });

  Object.entries(symGroups).forEach(([sym, arr]) => {
    if (arr.length >= 2) {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const pnl = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const avgR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / arr.length;

      if (wr >= 50 && pnl > 0) {
        findings.push({
          title: sym,
          category: 'instrument',
          tradesCount: arr.length,
          winrate: wr,
          totalPnL: pnl,
          avgR,
          sampleStatus: arr.length >= 15 ? 'reliable' : arr.length >= 5 ? 'caution' : 'small',
          sampleLabel: arr.length >= 15 ? 'Échantillon fiable' : arr.length >= 5 ? 'Tendance prometteuse' : 'Échantillon faible — continuer à collecter',
          description: `Paire / Actif favori : ${wr.toFixed(1)}% de gains sur ${arr.length} positions enregistrées.`
        });
      }
    }
  });

  // Sort findings by totalPnL and winrate
  return findings.sort((a, b) => b.totalPnL - a.totalPnL);
}

// 3. Identify Biggest Leaks (Statistical Detractors)
export function identifyBiggestLeaks(trades: Trade[]): LeakFinding[] {
  if (trades.length < 2) return [];

  const leaks: LeakFinding[] = [];

  // 1. Weak Setups
  const setupGroups: { [setup: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.setup?.trim() || 'Non spécifié';
    if (!setupGroups[s]) setupGroups[s] = [];
    setupGroups[s].push(t);
  });

  Object.entries(setupGroups).forEach(([setup, arr]) => {
    if (arr.length >= 2) {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const pnl = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const avgR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / arr.length;

      if (pnl < 0 || (arr.length >= 3 && wr < 40)) {
        leaks.push({
          title: setup,
          category: 'Setup sous-performant',
          tradesCount: arr.length,
          winrate: wr,
          totalPnL: pnl,
          avgR,
          leakSeverity: pnl < -200 || wr < 30 ? 'high' : 'medium',
          sampleLabel: `Échantillon : ${arr.length} trades (${wr.toFixed(1)}% WR)`,
          problemDescription: `${setup} génère une perte nette cumulée avec seulement ${wr.toFixed(1)}% de taux de réussite.`,
          actionableRecommendation: `Ne prenez pas ${setup} seul comme déclencheur. Exigez une confirmation supplémentaire (ex: MSS + FVG aligné) ou réduisez le risque.`
        });
      }
    }
  });

  // 2. Underperforming Instruments
  const symGroups: { [sym: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.symbol.toUpperCase();
    if (!symGroups[s]) symGroups[s] = [];
    symGroups[s].push(t);
  });

  Object.entries(symGroups).forEach(([sym, arr]) => {
    if (arr.length >= 2) {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const pnl = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const avgR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / arr.length;

      if (pnl < 0) {
        leaks.push({
          title: sym,
          category: 'Instrument destructeur de capital',
          tradesCount: arr.length,
          winrate: wr,
          totalPnL: pnl,
          avgR,
          leakSeverity: pnl < -300 ? 'high' : 'medium',
          sampleLabel: `Échantillon : ${arr.length} trades`,
          problemDescription: `Les positions sur ${sym} sont actuellement déficitaires (${pnl.toFixed(2)}$).`,
          actionableRecommendation: `Mettez ${sym} en pause ou tradez-le uniquement lors des Killzones majeures avec votre setup A+.`
        });
      }
    }
  });

  // 3. Overtrading days detection
  const tradesByDay: { [date: string]: Trade[] } = {};
  trades.forEach(t => {
    if (!tradesByDay[t.date]) tradesByDay[t.date] = [];
    tradesByDay[t.date].push(t);
  });

  const heavyDays = Object.entries(tradesByDay).filter(([_, arr]) => arr.length >= 3);
  if (heavyDays.length > 0) {
    let thirdPlusTrades: Trade[] = [];
    heavyDays.forEach(([_, arr]) => {
      thirdPlusTrades.push(...arr.slice(2)); // Trades taken as #3, #4, etc.
    });

    if (thirdPlusTrades.length >= 2) {
      const wins = thirdPlusTrades.filter(t => t.netPnL > 0).length;
      const wr = (wins / thirdPlusTrades.length) * 100;
      const pnl = thirdPlusTrades.reduce((acc, t) => acc + t.netPnL, 0);

      if (pnl < 0 || wr < 40) {
        leaks.push({
          title: 'Sur-trading intra-journalier (> 2 trades / jour)',
          category: 'Comportement & Fatigue décisionnelle',
          tradesCount: thirdPlusTrades.length,
          winrate: wr,
          totalPnL: pnl,
          avgR: pnl / (thirdPlusTrades.length || 1),
          leakSeverity: 'high',
          sampleLabel: `${thirdPlusTrades.length} trades pris à partir du 3e trade journalier`,
          problemDescription: `Votre performance chute nettement à partir de votre 3ème position sur une même journée (${wr.toFixed(1)}% WR).`,
          actionableRecommendation: `Fixez une limite stricte de 2 trades maximum par jour ouvré. Arrêtez la session immédiatement après 2 trades.`
        });
      }
    }
  }

  // 4. Missing Stop Loss leak
  const noSlTrades = trades.filter(t => t.stopLoss === undefined || t.stopLoss === null || t.stopLoss === 0);
  if (noSlTrades.length > 0) {
    const pnl = noSlTrades.reduce((acc, t) => acc + t.netPnL, 0);
    leaks.push({
      title: 'Positions sans Stop Loss prédéfini',
      category: 'Gestion du Risque',
      tradesCount: noSlTrades.length,
      winrate: (noSlTrades.filter(t => t.netPnL > 0).length / noSlTrades.length) * 100,
      totalPnL: pnl,
      avgR: -1,
      leakSeverity: 'high',
      sampleLabel: `${noSlTrades.length} trade(s) sans SL formel`,
      problemDescription: `Entrer sur le marché sans Stop Loss défini expose le compte à des queues de distribution fatales.`,
      actionableRecommendation: `Refusez systématiquement d'entrer en position si le niveau de Stop Loss n'est pas calculé et placé avant validation.`
    });
  }

  return leaks.sort((a, b) => a.totalPnL - b.totalPnL);
}

// 4. Generate Smart Risk Alerts
export function generateSmartRiskAlerts(trades: Trade[], startingBalance: number): SmartRiskAlert[] {
  const alerts: SmartRiskAlert[] = [];
  if (trades.length === 0) return alerts;

  // Sort trades chronologically
  const sorted = [...trades].sort((a, b) => new Date(`${a.date} ${a.time || '12:00'}`).getTime() - new Date(`${b.date} ${b.time || '12:00'}`).getTime());
  const lastTrade = sorted[sorted.length - 1];

  // 1. Today's trade count check
  const latestDate = lastTrade.date;
  const todayTrades = sorted.filter(t => t.date === latestDate);

  if (todayTrades.length >= 3) {
    alerts.push({
      id: 'alert-overtrade-today',
      type: 'warning',
      title: `Alerte Fréquence Journalière (${todayTrades.length} trades le ${latestDate})`,
      message: `Vous avez déjà pris ${todayTrades.length} trades aujourd'hui. Vos statistiques historiques montrent que la lucidité décisionnelle décline après 2 positions.`,
      recommendation: `Envisagez de couper la plateforme pour la journée et de protéger votre capital.`,
      dataBacking: `${todayTrades.length} trades enregistrés sur la journée courante.`
    });
  }

  // 2. Consecutive losses check
  let consecutiveLosses = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].netPnL < 0) consecutiveLosses++;
    else break;
  }

  if (consecutiveLosses >= 2) {
    alerts.push({
      id: 'alert-loss-streak',
      type: 'danger',
      title: `Série de ${consecutiveLosses} Pertes Consécutives`,
      message: `Vous venez d'enchaîner ${consecutiveLosses} pertes. Le risque de trading de revanche (revenge trading) ou d'augmentation impulsive du lot est au niveau maximal.`,
      recommendation: `Prenez une pause obligatoire de minimum 2 heures. Ne tentez surtout pas de 'récupérer' la perte immédiatement.`,
      dataBacking: `Dernières positions : ${sorted.slice(-consecutiveLosses).map(t => `${t.symbol} (${t.netPnL}$)`).join(', ')}.`
    });
  }

  // 3. Lot size escalation check after loss
  if (sorted.length >= 2) {
    const prevTrade = sorted[sorted.length - 2];
    if (prevTrade.netPnL < 0 && (lastTrade.lotSize || 1) > (prevTrade.lotSize || 1) * 1.3) {
      alerts.push({
        id: 'alert-lot-escalation',
        type: 'danger',
        title: `Augmentation de Lot après Perte Détectée`,
        message: `Votre dernier trade a été pris avec une taille de lot (${lastTrade.lotSize}) supérieure à celle du trade perdant précédent (${prevTrade.lotSize}). C'est le marqueur typique de la martingale.`,
        recommendation: `Revenez immédiatement à un risque fixe standard (ex: 0.5% ou 1% du compte max).`,
        dataBacking: `Lot passé de ${prevTrade.lotSize} à ${lastTrade.lotSize} suite à une perte de ${prevTrade.netPnL}$.`
      });
    }
  }

  return alerts;
}

// 5. Calculate Daily Coach Summaries
export function calculateDailyCoachSummaries(trades: Trade[]): DailyCoachSummary[] {
  const daysMap: { [date: string]: Trade[] } = {};
  trades.forEach(t => {
    if (!daysMap[t.date]) daysMap[t.date] = [];
    daysMap[t.date].push(t);
  });

  const summaries: DailyCoachSummary[] = [];

  Object.entries(daysMap).forEach(([date, dayTrades]) => {
    const wins = dayTrades.filter(t => t.netPnL > 0);
    const losses = dayTrades.filter(t => t.netPnL < 0);
    const be = dayTrades.filter(t => Math.abs(t.netPnL) <= 0.001);
    const totalPnL = dayTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = dayTrades.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    const winrate = dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0;
    const avgR = dayTrades.length > 0 ? totalR / dayTrades.length : 0;

    // Find best and worst trade
    const sortedPnL = [...dayTrades].sort((a, b) => b.netPnL - a.netPnL);
    const bestTrade = sortedPnL[0] || null;
    const worstTrade = sortedPnL[sortedPnL.length - 1] || null;

    let strength = '';
    let weakness = '';
    let observation = '';
    let focus = '';

    if (totalPnL > 0) {
      strength = `Excellente exécution globale (+${totalPnL.toFixed(2)}$ / +${totalR.toFixed(2)}R) avec ${winrate.toFixed(0)}% de réussite.`;
      weakness = losses.length > 0 ? `Perte contenue sur ${losses.map(l => l.symbol).join(', ')} sans dérapage émotionnel.` : `Aucune perte notable.`;
      observation = dayTrades.length <= 2 ? `Volume de trading discipliné et ciblé (${dayTrades.length} trades).` : `Volume de ${dayTrades.length} trades soutenu.`;
      focus = `Maintenir la même sélectivité demain sans tomber dans l'excès de confiance.`;
    } else {
      strength = `Arrêt des pertes enregistré (${dayTrades.length} trades traités).`;
      weakness = `Journée négative (${totalPnL.toFixed(2)}$). Déficit principal sur ${worstTrade?.symbol || 'les positions prises'}.`;
      observation = dayTrades.length >= 3 ? `Risque d'overtrading ou d'acharnement sur la session.` : `Perte sous contrôle dans les limites normales de variance.`;
      focus = `Ne pas chercher à se rattraper demain. Attendre un setup A+ parfait avec confirmation complète.`;
    }

    summaries.push({
      date,
      tradesCount: dayTrades.length,
      wins: wins.length,
      losses: losses.length,
      be: be.length,
      winrate,
      totalPnL,
      totalR,
      avgR,
      avgRisk: 1.0,
      bestTrade,
      worstTrade,
      todayStrength: strength,
      todayWeakness: weakness,
      behavioralObservation: observation,
      tomorrowFocus: focus,
    });
  });

  return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// 6. Calculate Weekly Coach Summaries
export function calculateWeeklyCoachSummaries(trades: Trade[]): WeeklyCoachSummary[] {
  if (trades.length === 0) return [];

  // Group trades by ISO week (YYYY-Www)
  const weeksMap: { [weekKey: string]: Trade[] } = {};

  trades.forEach(t => {
    const d = new Date(t.date);
    const weekKey = getISOWeekKey(d);
    if (!weeksMap[weekKey]) weeksMap[weekKey] = [];
    weeksMap[weekKey].push(t);
  });

  const summaries: WeeklyCoachSummary[] = [];

  Object.entries(weeksMap).forEach(([weekKey, weekTrades]) => {
    const wins = weekTrades.filter(t => t.netPnL > 0);
    const losses = weekTrades.filter(t => t.netPnL < 0);
    const totalPnL = weekTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = weekTrades.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    const winrate = (wins.length / weekTrades.length) * 100;
    const avgR = totalR / weekTrades.length;

    const grossProfit = wins.reduce((acc, t) => acc + t.netPnL, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.netPnL, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const expectancy = totalPnL / weekTrades.length;

    // Best & worst setups
    const setupCounts: { [s: string]: { pnl: number; wins: number; total: number } } = {};
    weekTrades.forEach(t => {
      const s = t.setup || 'Non spécifié';
      if (!setupCounts[s]) setupCounts[s] = { pnl: 0, wins: 0, total: 0 };
      setupCounts[s].pnl += t.netPnL;
      setupCounts[s].total++;
      if (t.netPnL > 0) setupCounts[s].wins++;
    });
    const sortedSetups = Object.entries(setupCounts).sort((a, b) => b[1].pnl - a[1].pnl);
    const bestSetup = sortedSetups[0]?.[0] || 'N/A';
    const worstSetup = sortedSetups[sortedSetups.length - 1]?.[0] || 'N/A';

    // Best & worst session
    const kzCounts: { [kz: string]: number } = {};
    weekTrades.forEach(t => {
      const kz = t.killzone || 'London';
      kzCounts[kz] = (kzCounts[kz] || 0) + t.netPnL;
    });
    const sortedKz = Object.entries(kzCounts).sort((a, b) => b[1] - a[1]);
    const bestSession = sortedKz[0]?.[0] || 'London';
    const worstSession = sortedKz[sortedKz.length - 1]?.[0] || 'NY PM';

    // Best & worst instrument
    const symCounts: { [sym: string]: number } = {};
    weekTrades.forEach(t => {
      symCounts[t.symbol] = (symCounts[t.symbol] || 0) + t.netPnL;
    });
    const sortedSym = Object.entries(symCounts).sort((a, b) => b[1] - a[1]);
    const bestInstrument = sortedSym[0]?.[0] || 'EURUSD';
    const worstInstrument = sortedSym[sortedSym.length - 1]?.[0] || 'XAUUSD';

    const overtradingRisk = weekTrades.length > 15 ? 'High' : weekTrades.length > 8 ? 'Medium' : 'Low';

    const biggestStrength = totalPnL >= 0 
      ? `Consistance hebdomadaire solide avec +${totalPnL.toFixed(2)}$ (+${totalR.toFixed(2)}R) et un PF de ${profitFactor.toFixed(2)}.`
      : `Discipline de Stop Loss respectée sur la majorité des sessions.`;

    const biggestWeakness = worstSetup !== 'N/A' && setupCounts[worstSetup]?.pnl < 0
      ? `Pertes concentrées sur ${worstSetup} (${setupCounts[worstSetup].pnl.toFixed(2)}$).`
      : `Quelques sorties prématurées avant l'atteinte de l'objectif R:R complet.`;

    const behavioralPattern = overtradingRisk === 'High'
      ? `Volume élevé (${weekTrades.length} trades). Tendance à sur-trader en milieu de semaine.`
      : `Bonne patience dans l'attente des opportunités de qualité.`;

    const nextWeekFocus = `Concentrer 100% de l'attention sur votre setup A+ (${bestSetup}) en session ${bestSession}.`;
    const oneThingToFix = worstSetup !== 'N/A' && setupCounts[worstSetup]?.pnl < 0
      ? `Arrêter de prendre des trades sur ${worstSetup} sans confirmation préalable.`
      : `Respecter strictement le plan de trading sans modifier les Stop Loss en cours de trade.`;

    summaries.push({
      weekKey,
      label: `Semaine ${weekKey.split('-W')[1]} (${weekKey})`,
      tradesCount: weekTrades.length,
      winrate,
      profitFactor,
      expectancy,
      totalR,
      avgR,
      totalPnL,
      maxDrawdownAmount: grossLoss,
      bestSetup,
      worstSetup,
      bestSession,
      worstSession,
      bestInstrument,
      worstInstrument,
      avgRisk: 1.0,
      disciplineScore: Math.min(95, Math.max(50, Math.round(winrate * 0.5 + (profitFactor > 1 ? 40 : 15)))),
      executionScore: 85,
      overtradingRisk,
      biggestStrength,
      biggestWeakness,
      behavioralPattern,
      nextWeekFocus,
      oneThingToFix,
    });
  });

  return summaries.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

// 7. Calculate Monthly Coach Summaries
export function calculateMonthlyCoachSummaries(trades: Trade[]): MonthlyCoachSummary[] {
  if (trades.length === 0) return [];

  // Group by YYYY-MM
  const monthsMap: { [monthKey: string]: Trade[] } = {};
  trades.forEach(t => {
    const monthKey = t.date.substring(0, 7); // "2026-08"
    if (!monthsMap[monthKey]) monthsMap[monthKey] = [];
    monthsMap[monthKey].push(t);
  });

  const MONTH_NAMES_FR: { [m: string]: string } = {
    '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
    '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
    '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre',
  };

  const summaries: MonthlyCoachSummary[] = [];

  Object.entries(monthsMap).forEach(([monthKey, mTrades]) => {
    const [year, monthNum] = monthKey.split('-');
    const monthLabel = `${MONTH_NAMES_FR[monthNum] || monthNum} ${year}`;

    const wins = mTrades.filter(t => t.netPnL > 0);
    const losses = mTrades.filter(t => t.netPnL < 0);
    const be = mTrades.filter(t => Math.abs(t.netPnL) <= 0.001);
    const winrate = mTrades.length > 0 ? (wins.length / mTrades.length) * 100 : 0;
    const totalPnL = mTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = mTrades.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    const avgR = mTrades.length > 0 ? totalR / mTrades.length : 0;

    const grossProfit = wins.reduce((acc, t) => acc + t.netPnL, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.netPnL, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

    // Find Best Edge for this month
    const setupCounts: { [s: string]: { pnl: number; wins: number; total: number; totalR: number } } = {};
    mTrades.forEach(t => {
      const s = t.setup?.trim() || t.symbol || 'Standard';
      if (!setupCounts[s]) setupCounts[s] = { pnl: 0, wins: 0, total: 0, totalR: 0 };
      setupCounts[s].pnl += t.netPnL;
      setupCounts[s].total++;
      setupCounts[s].totalR += getTradeRMultiple(t) || 0;
      if (t.netPnL > 0) setupCounts[s].wins++;
    });

    const sortedSetups = Object.entries(setupCounts).sort((a, b) => b[1].pnl - a[1].pnl);
    const topPositive = sortedSetups.find(([_, d]) => d.pnl > 0);
    const bestEdge = topPositive ? `${topPositive[0]} (${(topPositive[1].wins / topPositive[1].total * 100).toFixed(0)}% WR)` : (sortedSetups[0]?.[0] || 'N/A');

    // Find Main Leak for this month
    const topNegative = [...sortedSetups].reverse().find(([_, d]) => d.pnl < 0);
    const mainLeak = topNegative ? `${topNegative[0]} (${topNegative[1].pnl.toFixed(0)}$)` : 'Aucun leak majeur';

    // What went well (1-2 points max)
    const whatWentWell: string[] = [];
    if (topPositive) {
      whatWentWell.push(`Sélection solide sur ${topPositive[0]} (+${topPositive[1].totalR >= 0 ? '+' : ''}${topPositive[1].totalR.toFixed(1)}R).`);
    }
    const slCompliance = mTrades.filter(t => t.stopLoss && t.stopLoss > 0).length / mTrades.length;
    if (slCompliance >= 0.85) {
      whatWentWell.push(`Rigueur du Stop Loss respectée sur ${Math.round(slCompliance * 100)}% des positions.`);
    } else if (winrate >= 50) {
      whatWentWell.push(`Taux de réussite global de ${winrate.toFixed(0)}% avec maîtrise des sorties.`);
    } else {
      whatWentWell.push(`Préservation du capital et arrêt des positions sans dérive majeure.`);
    }

    // What hurt performance (1-2 points max)
    const whatHurtPerformance: string[] = [];
    if (topNegative) {
      whatHurtPerformance.push(`Pertes concentrées sur ${topNegative[0]} (${topNegative[1].pnl.toFixed(2)}$ / ${topNegative[1].total} trades).`);
    }
    const lowSlTrades = mTrades.filter(t => !t.stopLoss || t.stopLoss === 0).length;
    if (lowSlTrades > 0) {
      whatHurtPerformance.push(`${lowSlTrades} position(s) sans Stop Loss prédéfini.`);
    } else if (losses.length > 0 && winrate < 45) {
      whatHurtPerformance.push(`Sorties parfois prématurées avant d'atteindre l'objectif R:R complet.`);
    } else if (whatHurtPerformance.length === 0) {
      whatHurtPerformance.push(`Aucun dysfonctionnement critique majeur ce mois-ci.`);
    }

    // Behavior (1 key detected behavior pattern)
    const daysMap: { [date: string]: number } = {};
    mTrades.forEach(t => { daysMap[t.date] = (daysMap[t.date] || 0) + 1; });
    const overDays = Object.values(daysMap).filter(count => count >= 3).length;
    let behavior = '';
    if (overDays > 0) {
      behavior = `${overDays} journée(s) avec ≥ 3 trades. Surveiller la fatigue décisionnelle en fin de séance.`;
    } else {
      behavior = `Excellente régularité et patience intra-journalière (moyenne de ${(mTrades.length / Math.max(1, Object.keys(daysMap).length)).toFixed(1)} trade/jour).`;
    }

    // Next Month Focus (1 single priority for next month)
    let nextMonthFocus = '';
    if (topNegative && topNegative[1].pnl < -100) {
      nextMonthFocus = `Éviter ${topNegative[0]} sans confirmation supplémentaire (MSS + Killzone).`;
    } else if (slCompliance < 0.9) {
      nextMonthFocus = `Placer et respecter le Stop Loss initial sans le modifier en cours de trade.`;
    } else if (topPositive) {
      nextMonthFocus = `Capitaliser à 80% sur votre edge confirmé (${topPositive[0]}) pendant vos meilleures sessions.`;
    } else {
      nextMonthFocus = `Maintenir la même discipline de sélection et le ratio risque/rendement fixé.`;
    }

    summaries.push({
      monthKey,
      monthLabel,
      tradesCount: mTrades.length,
      wins: wins.length,
      losses: losses.length,
      be: be.length,
      winrate,
      totalPnL,
      totalR,
      avgR,
      profitFactor,
      bestEdge,
      mainLeak,
      whatWentWell: whatWentWell.slice(0, 2),
      whatHurtPerformance: whatHurtPerformance.slice(0, 2),
      behavior,
      nextMonthFocus,
    });
  });

  return summaries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

// 8. Generate Trader Profile
export function generateTraderProfile(trades: Trade[]): TraderProfileData {
  if (trades.length === 0) {
    return {
      tradingStyle: 'Intraday / Liquidity-based / ICT-SMC',
      primaryMarket: 'EURUSD',
      preferredSessions: ['London Open', 'NY AM'],
      bestSetups: ['FVG + MSS', 'OB IRL'],
      weakSetups: ['PDH / Breakout direct'],
      riskDisciplineScore: 80,
      executionScore: 80,
      patienceScore: 80,
      overtradingRisk: 'Low',
      sampleSizeLabel: 'Données initiales',
    };
  }

  // Determine Primary Market
  const symCounts: { [sym: string]: number } = {};
  trades.forEach(t => symCounts[t.symbol] = (symCounts[t.symbol] || 0) + 1);
  const primaryMarket = Object.entries(symCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'EURUSD';

  // Determine Preferred Sessions
  const kzCounts: { [kz: string]: number } = {};
  trades.forEach(t => {
    if (t.killzone) kzCounts[t.killzone] = (kzCounts[t.killzone] || 0) + 1;
  });
  const preferredSessions = Object.entries(kzCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

  // Determine Best & Weak Setups
  const setupPnL: { [s: string]: number } = {};
  trades.forEach(t => {
    if (t.setup) setupPnL[t.setup] = (setupPnL[t.setup] || 0) + t.netPnL;
  });
  const sortedSetups = Object.entries(setupPnL).sort((a, b) => b[1] - a[1]);
  const bestSetups = sortedSetups.filter(e => e[1] > 0).slice(0, 2).map(e => e[0]);
  const weakSetups = sortedSetups.filter(e => e[1] < 0).slice(-2).map(e => e[0]);

  // Scores
  const slRatio = trades.filter(t => t.stopLoss && t.stopLoss > 0).length / trades.length;
  const riskDisciplineScore = Math.min(96, Math.max(40, Math.round(slRatio * 70 + 25)));
  const executionScore = Math.min(95, Math.max(40, Math.round(trades.filter(t => t.killzone).length / trades.length * 50 + 45)));
  const patienceScore = Math.min(94, Math.max(45, 85 - (trades.length > 20 ? 5 : 0)));

  return {
    tradingStyle: 'Intraday Liquidity / Smart Money Concepts (ICT)',
    primaryMarket,
    preferredSessions: preferredSessions.length > 0 ? preferredSessions : ['London Open', 'NY AM'],
    bestSetups: bestSetups.length > 0 ? bestSetups : ['FVG', 'Order Block (OB)'],
    weakSetups: weakSetups.length > 0 ? weakSetups : ['Entrée impulsive sans confluence'],
    riskDisciplineScore,
    executionScore,
    patienceScore,
    overtradingRisk: trades.length > 25 ? 'Medium' : 'Low',
    sampleSizeLabel: `Profil calculé sur ${trades.length} trades réels`,
  };
}

// 8. Evaluate Funded / Prop Firm Mode
export function evaluateFundedMode(
  trades: Trade[],
  startingBalance: number,
  customConfig?: PropFirmConfig
): FundedModeEvaluation {
  const config: PropFirmConfig = customConfig || {
    accountBalance: startingBalance > 0 ? startingBalance : 50000,
    profitTargetPercent: 8, // 8% profit target
    dailyLossLimitPercent: 4, // 4% max daily loss
    maxDrawdownPercent: 8, // 8% max total drawdown
    riskPerTradePercent: 1.0, // 1% risk per trade
    maxTradesPerDay: 3, // 3 trades per day max
  };

  const starting = config.accountBalance;
  const profitTargetAmount = (starting * config.profitTargetPercent) / 100;
  const dailyLossLimitAmount = (starting * config.dailyLossLimitPercent) / 100;
  const maxDrawdownLimitAmount = (starting * config.maxDrawdownPercent) / 100;

  const currentPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const currentBalance = starting + currentPnL;
  const targetProgressPercent = Math.min(100, Math.max(0, (currentPnL / profitTargetAmount) * 100));

  // Max drawdown check
  let peak = starting;
  let running = starting;
  let maxDD = 0;

  trades.forEach(t => {
    running += t.netPnL;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  });

  const drawdownDistanceAmount = Math.max(0, maxDrawdownLimitAmount - maxDD);
  const drawdownDistancePercent = (drawdownDistanceAmount / maxDrawdownLimitAmount) * 100;

  // Daily loss violations check
  const daysMap: { [date: string]: number } = {};
  trades.forEach(t => {
    daysMap[t.date] = (daysMap[t.date] || 0) + t.netPnL;
  });

  const violations: string[] = [];
  const strengths: string[] = [];

  Object.entries(daysMap).forEach(([date, pnl]) => {
    if (pnl < -dailyLossLimitAmount) {
      violations.push(`Dépassement de la limite de perte journalière le ${date} (${pnl.toFixed(2)}$ vs max -${dailyLossLimitAmount.toFixed(2)}$).`);
    }
  });

  if (maxDD > maxDrawdownLimitAmount) {
    violations.push(`Drawdown maximum violé (${maxDD.toFixed(2)}$ vs limite max ${maxDrawdownLimitAmount.toFixed(2)}$).`);
  } else {
    strengths.push(`Drawdown total sous contrôle : ${maxDD.toFixed(2)}$ atteints sur une tolérance de ${maxDrawdownLimitAmount.toFixed(2)}$.`);
  }

  if (currentPnL > 0) {
    strengths.push(`Progression positive vers l'objectif : +${currentPnL.toFixed(2)}$ réalisés (${targetProgressPercent.toFixed(1)}% du target).`);
  }

  // Scores
  const riskDisciplineScore = violations.length === 0 ? 92 : Math.max(40, 92 - violations.length * 20);
  const drawdownControlScore = Math.min(100, Math.max(30, Math.round(drawdownDistancePercent)));
  const consistencyScore = Math.min(95, Math.max(45, Math.round(targetProgressPercent * 0.4 + 50)));
  const ruleComplianceScore = violations.length === 0 ? 96 : Math.max(35, 96 - violations.length * 25);

  let overallStatus: 'Safe' | 'Caution' | 'High Risk' = 'Safe';
  if (violations.length > 0 || drawdownDistancePercent < 25) {
    overallStatus = 'High Risk';
  } else if (drawdownDistancePercent < 55) {
    overallStatus = 'Caution';
  }

  return {
    config,
    currentBalance,
    startingBalance: starting,
    profitTargetAmount,
    dailyLossLimitAmount,
    maxDrawdownLimitAmount,
    currentPnL,
    targetProgressPercent,
    maxDrawdownReached: maxDD,
    drawdownDistancePercent,
    riskDisciplineScore,
    drawdownControlScore,
    consistencyScore,
    ruleComplianceScore,
    overallStatus,
    violations,
    strengths,
  };
}

// 9. Detailed Trade-by-Trade AI Review Evaluator (Quality vs Result)
export function evaluateTradeAiReview(trade: Trade, allTrades: Trade[]): TradeAiReviewResult {
  const isWin = trade.netPnL > 0;
  const isLoss = trade.netPnL < 0;
  const rVal = getTradeRMultiple(trade);

  const hasSL = trade.stopLoss !== undefined && trade.stopLoss !== null && trade.stopLoss > 0;
  const hasTP = trade.takeProfit !== undefined && trade.takeProfit !== null && trade.takeProfit > 0;
  const hasSetup = trade.setup && trade.setup.trim() !== '' && trade.setup !== 'None';
  const hasSession = trade.killzone && trade.killzone.trim() !== '';

  const whatWasGood: string[] = [];
  const whatCouldBeImproved: string[] = [];

  if (hasSL) {
    whatWasGood.push(`Stop Loss rigoureusement défini (${trade.stopLoss}), limitant le risque financier absolu.`);
  } else {
    whatCouldBeImproved.push(`Aucun Stop Loss formel renseigné lors de l'entrée en position.`);
  }

  if (hasSetup) {
    whatWasGood.push(`Setup qualifié identifié : ${trade.setup}.`);
  } else {
    whatCouldBeImproved.push(`Trade pris sans setup formel explicité au journal.`);
  }

  if (hasSession) {
    whatWasGood.push(`Pris pendant la session active : ${trade.killzone}.`);
  } else {
    whatCouldBeImproved.push(`Session / Killzone non documentée.`);
  }

  if (trade.confluenceDxy) {
    whatWasGood.push(`Confluence macro DXY vérifiée et alignée avec le biais.`);
  }

  if (trade.preTradePlan) {
    whatWasGood.push(`Plan pré-trade documenté avec précision.`);
  }

  // Plan compliance verdict
  let planCompliance: 'YES' | 'PARTIALLY' | 'NO' | 'INSUFFICIENT DATA' = 'PARTIALLY';
  if (hasSL && hasSetup && hasSession) {
    planCompliance = 'YES';
  } else if (!hasSL && !hasSetup) {
    planCompliance = 'NO';
  } else {
    planCompliance = 'PARTIALLY';
  }

  // Verdict Tag & Quality vs Result logic
  let verdictTag: 'A — Valid Loss' | 'A — Valid Win' | 'B — Valid but improvable' | 'C — Plan violation' | 'D — Insufficient info' = 'B — Valid but improvable';
  let isGoodProcess = false;
  let coachVerdict = '';

  if (planCompliance === 'YES') {
    isGoodProcess = true;
    if (isWin) {
      verdictTag = 'A — Valid Win';
      coachVerdict = 'A — Valid Win (Good Process + Positive Outcome)';
    } else if (isLoss) {
      verdictTag = 'A — Valid Loss';
      coachVerdict = 'A — Valid Loss (Good Trade + Loss)';
    } else {
      verdictTag = 'A — Valid Win';
      coachVerdict = 'A — Valid Execution (Break Even)';
    }
  } else if (planCompliance === 'NO') {
    isGoodProcess = false;
    verdictTag = 'C — Plan violation';
    coachVerdict = isWin ? 'C — Plan Violation (Bad Trade + Lucky Win)' : 'C — Plan Violation (Bad Trade + Loss)';
  } else {
    verdictTag = 'B — Valid but improvable';
    coachVerdict = 'B — Valid but Improvable (Partially Compliant)';
  }

  const detailedAnalysis = isLoss && isGoodProcess
    ? `Ce trade est une PERTE VALIDE (Good Trade + Loss). Vous avez respecté vos règles de risque et votre setup. En trading probabiliste, les pertes font partie intégrante de l'avantage statistique.`
    : isWin && !isGoodProcess
    ? `Ce trade est un GAIN NON CONFORME (Bad Trade + Win). Malgré le gain de ${trade.netPnL.toFixed(2)}$, l'absence de Stop Loss ou de setup qualifié représente un comportement à risque sur le long terme.`
    : isWin && isGoodProcess
    ? `Excellente exécution conforme à votre plan de trading. Gain encaissé avec respect des critères techniques.`
    : `Exécution convenable mais certains éléments de validation (SL, notes ou confirmation) méritent d'être renforcés.`;

  return {
    trade,
    rMultiple: rVal,
    isWin,
    isLoss,
    planCompliance,
    whatWasGood: whatWasGood.length > 0 ? whatWasGood : ['Entrée documentée sur le journal.'],
    whatCouldBeImproved: whatCouldBeImproved.length > 0 ? whatCouldBeImproved : ['Maintenir la même rigueur d\'exécution.'],
    coachVerdict,
    verdictTag,
    isGoodProcess,
    detailedAnalysis,
  };
}

// Helpers
function generateEdgeSummary(trades: Trade[]): string {
  const edges = identifyYourEdgeFindings(trades);
  if (edges.length === 0) return 'Continuez à journaliser vos trades pour identifier vos setups à plus haute probabilité.';
  const top2 = edges.slice(0, 2).map(e => e.title);
  return `${top2.join(' et ')} constituent actuellement vos configurations statistiques les plus solides.`;
}

function generateLeakSummary(trades: Trade[]): string {
  const leaks = identifyBiggestLeaks(trades);
  if (leaks.length === 0) return 'Aucun leak critique majeur détecté pour le moment.';
  return `${leaks[0].title} sous-performe actuellement (${leaks[0].problemDescription})`;
}

function generateBehaviorSummary(trades: Trade[], sortedTrades: Trade[], overtradedDays: number): string {
  if (overtradedDays > 0) {
    return `Tendance à multiplier les prises de positions lors des sessions volatiles. Restez limité à 2 trades par jour.`;
  }
  return `Rythme de trading régulier et discipliné. Excellente patience dans la sélection des trades.`;
}

function generateFocusSummary(q: number, e: number, r: number, d: number, m: number): string {
  const min = Math.min(q, e, r, d, m);
  if (min === r) return 'Renforcer la gestion du risque : maintenir un Stop Loss strict et limiter le drawdown.';
  if (min === d) return 'Priorité Discipline : éviter les trades émotionnels et respecter la limite journalière.';
  if (min === q) return 'Priorité Sélection : trader uniquement vos setups A+ avec confirmation technique.';
  return 'Améliorer la sortie des trades pour maximiser le multiple R moyen.';
}

function getISOWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ============================================================================
// REDESIGNED YOUR EDGE & LEAKS ENGINE (SIMPLIFIED & STRUCTURED)
// ============================================================================

function getSampleStatus(count: number): { status: 'small' | 'growing' | 'reliable'; label: string } {
  if (count >= 16) return { status: 'reliable', label: 'Reliable sample' };
  if (count >= 6) return { status: 'growing', label: 'Growing sample' };
  return { status: 'small', label: 'Small sample' };
}

// 1. Identify up to 3 structured edges: Best Setup, Best Session, Best Combination
export function identifyStructuredEdges(trades: Trade[]): StructuredEdgeItem[] {
  if (trades.length < 2) return [];

  const items: StructuredEdgeItem[] = [];

  // 1. Best Setup
  const setupMap: { [setup: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.setup?.trim() || 'Non spécifié';
    if (s !== 'Non spécifié' && s !== 'Autre' && s !== 'None') {
      if (!setupMap[s]) setupMap[s] = [];
      setupMap[s].push(t);
    }
  });

  const setupStats = Object.entries(setupMap).map(([setup, arr]) => {
    const wins = arr.filter(t => t.netPnL > 0).length;
    const wr = (wins / arr.length) * 100;
    const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    return { title: setup, tradesCount: arr.length, winrate: wr, totalPnL, totalR };
  });

  // Sort setups: prioritize positive R, higher winrate, sample size
  const positiveSetups = setupStats.filter(s => s.totalR > 0 || (s.winrate >= 50 && s.totalPnL >= 0));
  const sortedSetups = (positiveSetups.length > 0 ? positiveSetups : setupStats).sort((a, b) => {
    if (b.totalR !== a.totalR) return b.totalR - a.totalR;
    return b.winrate - a.winrate;
  });

  if (sortedSetups.length > 0) {
    const best = sortedSetups[0];
    const sample = getSampleStatus(best.tradesCount);
    items.push({
      id: 'edge-best-setup',
      categoryType: 'setup',
      rankingBadge: '🥇 Best Setup',
      title: best.title,
      whatWorks: 'Ce setup génère tes entrées les plus nettes et régulières.',
      proof: `${best.winrate.toFixed(0)}% Win Rate sur ${best.tradesCount} trades (${best.totalR >= 0 ? '+' : ''}${best.totalR.toFixed(1)}R, ${best.totalPnL >= 0 ? '+' : ''}${best.totalPnL.toFixed(0)}$).`,
      whyInteresting: sample.status === 'small'
        ? 'Échantillon encore trop faible pour une certitude absolue, mais la dynamique de gain est prometteuse.'
        : 'C’est ton principal moteur de gain et de consistance sur la période.',
      toContinue: 'Priorise ce setup en début de session et applique ses règles sans hésiter.',
      tradesCount: best.tradesCount,
      winrate: best.winrate,
      totalR: best.totalR,
      totalPnL: best.totalPnL,
      sampleStatus: sample.status,
      sampleLabel: sample.label,
      explanation: 'Ce setup génère tes entrées les plus nettes et régulières.'
    });
  }

  // 2. Best Session
  const sessionMap: { [sess: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.killzone?.trim() || 'Hors Session';
    if (s !== 'Hors Session' && s !== 'Non spécifié') {
      if (!sessionMap[s]) sessionMap[s] = [];
      sessionMap[s].push(t);
    }
  });

  const sessionStats = Object.entries(sessionMap).map(([session, arr]) => {
    const wins = arr.filter(t => t.netPnL > 0).length;
    const wr = (wins / arr.length) * 100;
    const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    return { title: session, tradesCount: arr.length, winrate: wr, totalPnL, totalR };
  });

  const positiveSessions = sessionStats.filter(s => s.totalR > 0 || s.winrate >= 50);
  const sortedSessions = (positiveSessions.length > 0 ? positiveSessions : sessionStats).sort((a, b) => {
    if (b.totalR !== a.totalR) return b.totalR - a.totalR;
    return b.winrate - a.winrate;
  });

  if (sortedSessions.length > 0) {
    const best = sortedSessions[0];
    const sample = getSampleStatus(best.tradesCount);
    items.push({
      id: 'edge-best-session',
      categoryType: 'session',
      rankingBadge: '🥈 Best Session',
      title: best.title,
      whatWorks: `Tu exécutes avec plus de clarté pendant la session ${best.title}.`,
      proof: `${best.winrate.toFixed(0)}% Win Rate sur ${best.tradesCount} trades (${best.totalR >= 0 ? '+' : ''}${best.totalR.toFixed(1)}R, ${best.totalPnL >= 0 ? '+' : ''}${best.totalPnL.toFixed(0)}$).`,
      whyInteresting: 'La liquidité et le rythme de cette session semblent correspondre parfaitement à ta lecture de marché.',
      toContinue: 'Concentre tes prises de risque sur cette tranche horaire.',
      tradesCount: best.tradesCount,
      winrate: best.winrate,
      totalR: best.totalR,
      totalPnL: best.totalPnL,
      sampleStatus: sample.status,
      sampleLabel: sample.label,
      explanation: `Tu exécutes avec plus de clarté pendant la session ${best.title}.`
    });
  }

  // 3. Best Combination (Multi-factor confluence: Setup + Session + Asset or Setup + Session)
  const combinationMap: { [combKey: string]: { setup: string; session: string; symbol: string; trades: Trade[] } } = {};
  
  trades.forEach(t => {
    const setup = t.setup?.trim() || '';
    const session = t.killzone?.trim() || '';
    const symbol = t.symbol?.toUpperCase() || '';

    if (setup && setup !== 'Non spécifié' && setup !== 'Autre' && session && session !== 'Hors Session') {
      // 3-way combination
      const key3 = `${setup} + ${session} + ${symbol}`;
      if (!combinationMap[key3]) {
        combinationMap[key3] = { setup, session, symbol, trades: [] };
      }
      combinationMap[key3].trades.push(t);

      // 2-way combination
      const key2 = `${setup} + ${session}`;
      if (!combinationMap[key2]) {
        combinationMap[key2] = { setup, session, symbol: '', trades: [] };
      }
      combinationMap[key2].trades.push(t);
    }
  });

  const combinationStats = Object.entries(combinationMap)
    .filter(([_, data]) => data.trades.length >= 2)
    .map(([key, data]) => {
      const arr = data.trades;
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
      return {
        title: key,
        tradesCount: arr.length,
        winrate: wr,
        totalPnL,
        totalR,
        setup: data.setup,
        session: data.session,
        symbol: data.symbol,
      };
    });

  const positiveCombinations = combinationStats.filter(c => c.totalR > 0 && c.winrate >= 50);
  const sortedCombinations = (positiveCombinations.length > 0 ? positiveCombinations : combinationStats).sort((a, b) => {
    // Prefer higher trades count with positive R
    const scoreA = a.totalR * Math.sqrt(a.tradesCount);
    const scoreB = b.totalR * Math.sqrt(b.tradesCount);
    return scoreB - scoreA;
  });

  if (sortedCombinations.length > 0) {
    const best = sortedCombinations[0];
    const sample = getSampleStatus(best.tradesCount);
    items.push({
      id: 'edge-best-combination',
      categoryType: 'combination',
      rankingBadge: '🥉 Best Combination',
      title: best.title,
      whatWorks: 'Cette combinaison technique et temporelle maximise ton espérance mathématique.',
      proof: `${best.winrate.toFixed(0)}% Win Rate sur ${best.tradesCount} trades (${best.totalR >= 0 ? '+' : ''}${best.totalR.toFixed(1)}R).`,
      whyInteresting: 'L’alignement de ces facteurs élimine le bruit de marché.',
      toContinue: 'Considère cette configuration comme ton trade A+ de référence.',
      tradesCount: best.tradesCount,
      winrate: best.winrate,
      totalR: best.totalR,
      totalPnL: best.totalPnL,
      sampleStatus: sample.status,
      sampleLabel: sample.label,
      explanation: 'Cette combinaison technique et temporelle maximise ton espérance mathématique.'
    });
  }

  return items;
}

// 2. Identify Structured Leaks: Problem -> What the data suggests -> Coach Action (Max 1-2)
export function identifyTopStructuredLeaks(trades: Trade[]): StructuredLeakItem[] {
  if (trades.length < 2) return [];

  const rawLeaks = identifyBiggestLeaks(trades);
  if (rawLeaks.length === 0) return [];

  const leaks: StructuredLeakItem[] = [];

  rawLeaks.slice(0, 2).forEach((raw, idx) => {
    const sample = getSampleStatus(raw.tradesCount);
    const leakNum = idx + 1;
    
    // Clean up title to simple name: "Sur-trading", "Trades sans Stop Loss", "Setup [Nom]", "Actif [Nom]"
    let title = raw.title;
    if (title.includes('Sur-trading') || title.includes('Overtrading')) title = 'Sur-trading';
    else if (title.includes('Stop Loss')) title = 'Trades sans Stop Loss';
    else if (title.includes('Setup sous-performant')) title = `Setup ${raw.title.replace('Setup sous-performant :', '').trim()}`;
    else if (title.includes('Instrument sous-performant')) title = `Actif ${raw.title.replace('Instrument sous-performant :', '').trim()}`;

    // 1. Ce que j'observe
    let observe = '';
    // 2. La preuve
    let proof = '';
    // 3. Impact
    let impact = '';
    // 4. Ce que tu dois changer
    let action = '';
    // 5. Pourquoi
    let why = '';

    const lossR = Math.abs(raw.avgR * raw.tradesCount);
    const lossMoney = Math.abs(raw.totalPnL);

    if (title === 'Sur-trading') {
      observe = 'Ta performance baisse lorsque tu multiplies les entrées dans la même journée.';
      proof = `${raw.tradesCount} trades pris au-delà de 2 trades / jour → ${raw.winrate.toFixed(0)}% Win Rate.`;
      impact = `Ces trades supplémentaires représentent une perte cumulée de -${lossR.toFixed(1)}R (-${lossMoney.toFixed(0)}$).`;
      action = 'Après 2 pertes consécutives ou 2 trades dans la journée, arrête ta session.';
      why = 'Ton problème semble être davantage la sélection des trades supplémentaires que ton setup principal.';
    } else if (title === 'Trades sans Stop Loss') {
      observe = 'Tu laisses courir des positions sans protection définie dès l’entrée.';
      proof = `${raw.tradesCount} trades exécutés sans Stop Loss (${raw.winrate.toFixed(0)}% Win Rate).`;
      impact = `Ces positions génèrent des pertes incontrôlées (-${lossMoney.toFixed(0)}$).`;
      action = 'Refuse systématiquement toute entrée si ton Stop Loss n’est pas placé avant validation.';
      why = 'Sans Stop Loss, un seul accident de marché peut effacer plusieurs jours de gains.';
    } else if (title.startsWith('Setup')) {
      observe = `Le setup ${title.replace('Setup ', '')} montre un rendement nettement inférieur à tes standards.`;
      proof = `${raw.tradesCount} trades pris avec ${raw.winrate.toFixed(0)}% Win Rate.`;
      impact = `Cette configuration ampute ton bilan de -${lossR.toFixed(1)}R (-${lossMoney.toFixed(0)}$).`;
      action = 'Exige une confirmation supplémentaire (ex: MSS clair + Killzone alignée) ou mets ce setup en pause.';
      why = sample.status === 'small'
        ? 'Échantillon encore trop faible pour tirer une conclusion définitive, mais la prudence s’impose.'
        : 'Ce setup semble associé à une baisse de performance par rapport à ton setup principal.';
    } else if (title.startsWith('Actif')) {
      observe = `Tes résultats sur ${title.replace('Actif ', '')} pénalisent ta rentabilité globale.`;
      proof = `${raw.tradesCount} trades avec ${raw.winrate.toFixed(0)}% Win Rate.`;
      impact = `Pertes nettes cumulées de -${lossR.toFixed(1)}R (-${lossMoney.toFixed(0)}$).`;
      action = 'Concentre-toi sur tes 1 à 2 actifs majeurs et élimine celui-ci de ta watchlist.';
      why = sample.status === 'small'
        ? 'Échantillon encore trop faible pour tirer une conclusion définitive.'
        : 'Cet actif semble associé à une baisse de performance liée à une volatilité moins maîtrisée.';
    } else {
      observe = raw.problemDescription;
      proof = `${raw.tradesCount} trades concernés avec ${raw.winrate.toFixed(0)}% Win Rate.`;
      impact = `Impact négatif estimé à -${lossR.toFixed(1)}R (-${lossMoney.toFixed(0)}$).`;
      action = raw.actionableRecommendation;
      why = sample.status === 'small'
        ? 'Échantillon encore trop faible pour tirer une conclusion définitive.'
        : 'Ce comportement semble associé à une baisse de performance.';
    }

    leaks.push({
      id: `leak-${idx}`,
      leakNumber: leakNum,
      title,
      observe,
      proof,
      impact,
      action,
      why,
      tradesCount: raw.tradesCount,
      winrate: raw.winrate,
      totalR: raw.avgR * raw.tradesCount,
      totalPnL: raw.totalPnL,
      sampleStatus: sample.status,
      sampleLabel: sample.label,
      suggests: observe,
    });
  });

  return leaks;
}

// 3. What Changed? (Shows only significant recent evolutions compared to earlier baseline)
export function calculateWhatChanged(trades: Trade[]): string[] {
  if (trades.length < 6) return [];

  // Sort trades chronologically
  const sorted = [...trades].sort((a, b) => new Date(`${a.date} ${a.time || '12:00'}`).getTime() - new Date(`${b.date} ${b.time || '12:00'}`).getTime());
  
  // Split into recent half (or last 10 trades) vs previous half
  const splitIndex = Math.max(2, Math.floor(sorted.length * 0.6));
  const previousTrades = sorted.slice(0, splitIndex);
  const recentTrades = sorted.slice(splitIndex);

  if (previousTrades.length < 2 || recentTrades.length < 2) return [];

  const changes: string[] = [];

  // Winrate comparison
  const prevWins = previousTrades.filter(t => t.netPnL > 0).length;
  const prevWR = (prevWins / previousTrades.length) * 100;
  const recentWins = recentTrades.filter(t => t.netPnL > 0).length;
  const recentWR = (recentWins / recentTrades.length) * 100;
  const wrDiff = recentWR - prevWR;

  if (wrDiff >= 10) {
    changes.push(`Setup selection improved recently (+${wrDiff.toFixed(0)}% Win Rate on latest trades).`);
  } else if (wrDiff <= -12) {
    changes.push(`Execution consistency declined slightly on recent trades (${recentWR.toFixed(0)}% vs ${prevWR.toFixed(0)}% previously).`);
  }

  // Stop Loss compliance
  const prevSL = previousTrades.filter(t => t.stopLoss && t.stopLoss > 0).length / previousTrades.length;
  const recentSL = recentTrades.filter(t => t.stopLoss && t.stopLoss > 0).length / recentTrades.length;
  if (recentSL > prevSL + 0.2) {
    changes.push(`Stop Loss discipline increased to ${(recentSL * 100).toFixed(0)}% on recent entries.`);
  }

  // Average R comparison
  const prevR = previousTrades.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / previousTrades.length;
  const recentR = recentTrades.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0) / recentTrades.length;
  if (recentR >= prevR + 0.4 && recentR > 0) {
    changes.push(`Average reward per trade increased (+${(recentR - prevR).toFixed(1)}R improvement).`);
  }

  // Overtrading days check
  const recentDaysMap: { [d: string]: number } = {};
  recentTrades.forEach(t => {
    recentDaysMap[t.date] = (recentDaysMap[t.date] || 0) + 1;
  });
  const heavyRecentDays = Object.values(recentDaysMap).filter(cnt => cnt >= 3).length;
  if (heavyRecentDays > 0) {
    changes.push(`Overtrading after losses or during active sessions increased recently.`);
  }

  return changes.slice(0, 2);
}

// 4. Generate Single-sentence Trading Profile
export function generateShortTradingProfile(
  trades: Trade[],
  stats: PerformanceStats,
  topEdges: StructuredEdgeItem[],
  topLeaks: StructuredLeakItem[]
): string {
  if (trades.length < 3) {
    return 'Collect more trades to establish a personalized edge profile.';
  }

  const bestSetup = topEdges.find(e => e.categoryType === 'setup')?.title;
  const bestSession = topEdges.find(e => e.categoryType === 'session')?.title;
  const mainLeak = topLeaks[0]?.title;

  let strengthPart = 'setup selection';
  if (bestSetup && bestSession) {
    strengthPart = `${bestSetup} execution during ${bestSession}`;
  } else if (bestSetup) {
    strengthPart = `${bestSetup} setups`;
  } else if (bestSession) {
    strengthPart = `${bestSession} session timing`;
  }

  let weaknessPart = 'trade management';
  if (mainLeak) {
    if (mainLeak.toLowerCase().includes('overtrading') || mainLeak.toLowerCase().includes('sur-trading')) {
      weaknessPart = 'overtrading on active sessions';
    } else if (mainLeak.toLowerCase().includes('stop loss')) {
      weaknessPart = 'risk control without stop loss';
    } else {
      weaknessPart = `${mainLeak.toLowerCase()}`;
    }
  }

  return `Your strongest advantage is ${strengthPart}. Your main weakness is ${weaknessPart}.`;
}

// 5. Detailed Analysis Data (Groupings for Collapsible Detailed View)
export function getDetailedAnalysisBreakdown(trades: Trade[]) {
  // Setups
  const setupsMap: { [key: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.setup?.trim() || 'Non spécifié';
    if (!setupsMap[s]) setupsMap[s] = [];
    setupsMap[s].push(t);
  });
  const setups = Object.entries(setupsMap).map(([name, arr]) => {
    const wins = arr.filter(t => t.netPnL > 0).length;
    const wr = (wins / arr.length) * 100;
    const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    const grossProfit = arr.filter(t => t.netPnL > 0).reduce((acc, t) => acc + t.netPnL, 0);
    const grossLoss = Math.abs(arr.filter(t => t.netPnL < 0).reduce((acc, t) => acc + t.netPnL, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    return { name, count: arr.length, winrate: wr, totalR, totalPnL, profitFactor };
  }).sort((a, b) => b.totalPnL - a.totalPnL);

  // Sessions
  const sessionsMap: { [key: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.killzone?.trim() || 'Hors Session';
    if (!sessionsMap[s]) sessionsMap[s] = [];
    sessionsMap[s].push(t);
  });
  const sessions = Object.entries(sessionsMap).map(([name, arr]) => {
    const wins = arr.filter(t => t.netPnL > 0).length;
    const wr = (wins / arr.length) * 100;
    const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    return { name, count: arr.length, winrate: wr, totalR, totalPnL };
  }).sort((a, b) => b.totalPnL - a.totalPnL);

  // Assets
  const assetsMap: { [key: string]: Trade[] } = {};
  trades.forEach(t => {
    const s = t.symbol.toUpperCase();
    if (!assetsMap[s]) assetsMap[s] = [];
    assetsMap[s].push(t);
  });
  const assets = Object.entries(assetsMap).map(([name, arr]) => {
    const wins = arr.filter(t => t.netPnL > 0).length;
    const wr = (wins / arr.length) * 100;
    const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
    const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
    return { name, count: arr.length, winrate: wr, totalR, totalPnL };
  }).sort((a, b) => b.totalPnL - a.totalPnL);

  // Confluences / Combinations
  const combMap: { [key: string]: Trade[] } = {};
  trades.forEach(t => {
    const setup = t.setup?.trim() || '';
    const session = t.killzone?.trim() || '';
    const symbol = t.symbol.toUpperCase();
    if (setup && setup !== 'Non spécifié' && session && session !== 'Hors Session') {
      const key = `${setup} + ${session} + ${symbol}`;
      if (!combMap[key]) combMap[key] = [];
      combMap[key].push(t);
    }
  });
  const combinations = Object.entries(combMap)
    .map(([name, arr]) => {
      const wins = arr.filter(t => t.netPnL > 0).length;
      const wr = (wins / arr.length) * 100;
      const totalPnL = arr.reduce((acc, t) => acc + t.netPnL, 0);
      const totalR = arr.reduce((acc, t) => acc + (getTradeRMultiple(t) || 0), 0);
      return { name, count: arr.length, winrate: wr, totalR, totalPnL };
    })
    .sort((a, b) => b.totalR - a.totalR);

  return { setups, sessions, assets, combinations };
}

