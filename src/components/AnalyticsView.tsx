import React, { useState, useMemo } from 'react';
import { Trade } from '../types/trade';
import { formatCurrency, formatRMultiple, formatPercent, formatDecimal } from '../lib/formatting';
import { calculateStreaks } from '../lib/calculations/streaks';
import { calculateDrawdown } from '../lib/calculations/drawdown';
import { calculateProfitFactor, calculateWinRate, calculateExpectancy } from '../lib/calculations/statistics';
import {
  calculateMyEdgeDeepAudit,
  EdgeScoreBreakdown,
  calculateTransparentEdgeScore,
} from '../lib/calculations/edge';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  Flame,
  Globe,
  Layers,
  Clock,
  Crosshair,
  ShieldAlert,
  Award,
  Compass,
  Calculator,
} from 'lucide-react';
import { TradeDetailModal } from './TradeDetailModal';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';
import { EquityCurveChart } from './EquityCurveChart';

interface AnalyticsViewProps {
  trades?: Trade[];
  currency?: string;
  initialBalance?: number;
  onSelectTrade?: (trade: Trade) => void;
  onNavigateToMyEdge?: () => void;
}

// Exact logical order requested:
// Performance globale → Performance par Setup → Performance par Killzone → Performance par Paire → Edge
type AnalyticsSubTab = 'overview' | 'setups' | 'killzones' | 'pairs' | 'edge' | 'directions' | 'timeline';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  trades = [],
  currency = 'EUR',
  initialBalance: appInitialBalance = 10000,
  onSelectTrade,
  onNavigateToMyEdge,
}) => {
  const safeTrades = trades || [];

  // 6 Dynamic Interactive Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedSetup, setSelectedSetup] = useState<string>('ALL');
  const [selectedKillzone, setSelectedKillzone] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');

  // Active Tab
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>('overview');

  // Trade drill-down modal & Edge Score breakdown modal
  const [activeTradeDetail, setActiveTradeDetail] = useState<Trade | null>(null);
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<{
    title: string;
    breakdown: EdgeScoreBreakdown;
  } | null>(null);

  // Extract unique filter dropdown values
  const availableSymbols = useMemo(() => {
    const s = new Set<string>();
    safeTrades.forEach((t) => t?.symbol && s.add(t.symbol.toUpperCase().trim()));
    return Array.from(s).sort();
  }, [safeTrades]);

  const availableSetups = useMemo(() => {
    const s = new Set<string>();
    safeTrades.forEach((t) => {
      const name = t.setup?.trim() || t.setupId;
      if (name) s.add(name);
    });
    return Array.from(s).sort();
  }, [safeTrades]);

  // Dynamically Filtered Trades based on all 6 criteria
  const filteredTrades = useMemo(() => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const EPSILON = 0.0001;

    return safeTrades.filter((t) => {
      if (!t) return false;
      const tradeTime = new Date(t.closedAt || t.openedAt).getTime();

      // 1. Period
      if (selectedPeriod === '7D' && now - tradeTime > 7 * oneDayMs) return false;
      if (selectedPeriod === '30D' && now - tradeTime > 30 * oneDayMs) return false;
      if (selectedPeriod === 'MONTH') {
        const d = new Date(tradeTime);
        const cur = new Date();
        if (d.getMonth() !== cur.getMonth() || d.getFullYear() !== cur.getFullYear()) return false;
      }
      if (selectedPeriod === 'YEAR') {
        const d = new Date(tradeTime);
        const cur = new Date();
        if (d.getFullYear() !== cur.getFullYear()) return false;
      }

      // 2. Pair / Symbol
      if (
        selectedSymbol !== 'ALL' &&
        (t.symbol || '').toUpperCase().trim() !== selectedSymbol
      ) {
        return false;
      }

      // 3. Setup
      if (selectedSetup !== 'ALL') {
        const name = t.setup?.trim() || t.setupId;
        if (name !== selectedSetup) return false;
      }

      // 4. Killzone
      if (selectedKillzone !== 'ALL') {
        const sess = (t.session || '').toUpperCase().trim();
        if (sess !== selectedKillzone) return false;
      }

      // 5. Direction
      if (selectedDirection !== 'ALL' && t.direction !== selectedDirection) return false;

      // 6. Result (WIN, LOSS, BREAKEVEN)
      if (selectedResult !== 'ALL') {
        const pnl = t.netPnL ?? 0;
        if (selectedResult === 'WIN' && pnl <= EPSILON) return false;
        if (selectedResult === 'LOSS' && pnl >= -EPSILON) return false;
        if (selectedResult === 'BREAKEVEN' && Math.abs(pnl) > EPSILON) return false;
      }

      return true;
    });
  }, [
    safeTrades,
    selectedPeriod,
    selectedSymbol,
    selectedSetup,
    selectedKillzone,
    selectedDirection,
    selectedResult,
  ]);

  // Chronologically sorted closed trades
  const closedTrades = useMemo(() => {
    return filteredTrades
      .filter((t) => t.status !== 'OPEN' && t.netPnL !== null && t.netPnL !== undefined)
      .sort((a, b) => {
        const timeA = new Date(a.closedAt || a.openedAt).getTime();
        const timeB = new Date(b.closedAt || b.openedAt).getTime();
        return timeA - timeB;
      });
  }, [filteredTrades]);

  // 1. COMPREHENSIVE GLOBAL METRICS
  const globalMetrics = useMemo(() => {
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

    const totalClosed = closedTrades.length;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
    const lossRate = totalClosed > 0 ? (losses / totalClosed) * 100 : 0;
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;

    let profitFactor = 0;
    if (grossLoss > 0) {
      profitFactor = grossProfit / grossLoss;
    } else if (grossProfit > 0) {
      profitFactor = 99.99;
    }

    // Expectancy
    const winFraction = totalClosed > 0 ? wins / totalClosed : 0;
    const lossFraction = totalClosed > 0 ? losses / totalClosed : 0;
    const monetaryExpectancy = totalClosed > 0 ? winFraction * avgWin - lossFraction * avgLoss : 0;
    const rExpectancy = rCount > 0 ? totalR / rCount : null;

    // Drawdown
    const initialBalance = appInitialBalance > 0 ? appInitialBalance : 10000;
    const currentBalance = initialBalance + totalNetPnL;
    const netReturnPercent = (totalNetPnL / initialBalance) * 100;

    const ddResult = calculateDrawdown(closedTrades, initialBalance);
    const streakResult = calculateStreaks(closedTrades);

    // Realized R/R
    const realizedRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 2.5 : 0;

    return {
      totalClosed,
      wins,
      losses,
      breakevens,
      winRate,
      grossProfit,
      grossLoss,
      totalNetPnL,
      profitFactor,
      avgWin,
      avgLoss,
      realizedRR,
      monetaryExpectancy,
      totalR,
      rExpectancy,
      rCount,
      initialBalance,
      currentBalance,
      netReturnPercent,
      maxDrawdownMoney: ddResult.maxDrawdown,
      maxDrawdownPercent: ddResult.maxDrawdownPercent,
      currentDrawdownMoney: ddResult.currentDrawdown,
      currentDrawdownPercent: ddResult.currentDrawdownPercent,
      streaks: streakResult,
      equityCurve: ddResult.equityCurve,
    };
  }, [closedTrades, appInitialBalance]);

  // 2. BREAKDOWN BY SETUP (with transparent Edge Score)
  const setupBreakdown = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of closedTrades) {
      const s = t.setup?.trim() || t.setupId || 'Non défini';
      const arr = map.get(s) || [];
      arr.push(t);
      map.set(s, arr);
    }

    return Array.from(map.entries()).map(([setupName, cluster]) => {
      const wr = calculateWinRate(cluster);
      const pf = calculateProfitFactor(cluster);
      const exp = calculateExpectancy(cluster);
      let pnl = 0;
      let totalR = 0;
      let rCount = 0;
      let grossProfit = 0;
      let grossLoss = 0;

      cluster.forEach((t) => {
        const net = t.netPnL ?? 0;
        pnl += net;
        if (net > 0) grossProfit += net;
        else if (net < 0) grossLoss += Math.abs(net);

        if (t.rMultiple !== null && t.rMultiple !== undefined) {
          totalR += t.rMultiple;
          rCount++;
        }
      });

      const avgWin = wr.wins > 0 ? grossProfit / wr.wins : 0;
      const avgLoss = wr.losses > 0 ? grossLoss / wr.losses : 0;
      const rExp = rCount > 0 ? totalR / rCount : null;

      const edgeScore = calculateTransparentEdgeScore(
        cluster.length,
        wr.winRate ?? 0,
        pf.profitFactor,
        exp.moneyExpectancy ?? 0,
        rExp,
        avgWin,
        avgLoss
      );

      return {
        name: setupName,
        tradesCount: cluster.length,
        wins: wr.wins,
        losses: wr.losses,
        breakevens: wr.breakeven,
        winRate: wr.winRate ?? 0,
        profitFactor: pf.profitFactor,
        pnl,
        totalR: rCount > 0 ? totalR : null,
        rExpectancy: exp.rExpectancy,
        monetaryExpectancy: exp.moneyExpectancy ?? 0,
        edgeScore,
      };
    }).sort((a, b) => b.edgeScore.totalScore - a.edgeScore.totalScore || b.pnl - a.pnl);
  }, [closedTrades]);

  // 3. BREAKDOWN BY SESSION / KILLZONE
  const killzoneBreakdown = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of closedTrades) {
      let sess = (t.session || 'AUTRE').toUpperCase().trim();
      if (sess === 'LONDON' || sess === 'LONDRES') sess = 'Killzone Londres';
      else if (sess === 'NEW_YORK' || sess === 'NEW YORK' || sess === 'NY') sess = 'New York';
      else if (sess === 'TOKYO' || sess === 'ASIE' || sess === 'ASIA') sess = 'Killzone Asia';
      else if (sess === 'Killzone Sydney') sess = 'Sydney';
      else sess = t.session || 'Standard / Non spécifié';

      const arr = map.get(sess) || [];
      arr.push(t);
      map.set(sess, arr);
    }

    return Array.from(map.entries()).map(([killzoneName, cluster]) => {
      const wr = calculateWinRate(cluster);
      const pf = calculateProfitFactor(cluster);
      let pnl = 0;
      cluster.forEach((t) => (pnl += t.netPnL ?? 0));

      return {
        killzone: killzoneName,
        tradesCount: cluster.length,
        wins: wr.wins,
        losses: wr.losses,
        winRate: wr.winRate ?? 0,
        profitFactor: pf.profitFactor,
        pnl,
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // 4. BREAKDOWN BY PAIR / SYMBOL
  const pairBreakdown = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of closedTrades) {
      const sym = (t.symbol || 'AUTRE').toUpperCase().trim();
      const arr = map.get(sym) || [];
      arr.push(t);
      map.set(sym, arr);
    }

    return Array.from(map.entries()).map(([sym, cluster]) => {
      const wr = calculateWinRate(cluster);
      const pf = calculateProfitFactor(cluster);
      let pnl = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      cluster.forEach((t) => {
        const net = t.netPnL ?? 0;
        pnl += net;
        if (net > 0) grossProfit += net;
        else if (net < 0) grossLoss += Math.abs(net);
      });

      return {
        symbol: sym,
        tradesCount: cluster.length,
        wins: wr.wins,
        losses: wr.losses,
        winRate: wr.winRate ?? 0,
        profitFactor: pf.profitFactor,
        grossProfit,
        grossLoss,
        pnl,
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [closedTrades]);

  // 5. EDGE DEEP AUDIT FOR EDGE TAB
  const edgeAudit = useMemo(() => {
    return calculateMyEdgeDeepAudit(filteredTrades);
  }, [filteredTrades]);

  // 6. BREAKDOWN BY DIRECTION (BUY VS SELL)
  const directionBreakdown = useMemo(() => {
    const buyTrades = closedTrades.filter((t) => t.direction === 'BUY');
    const sellTrades = closedTrades.filter((t) => t.direction === 'SELL');

    const getStats = (cluster: Trade[], label: string) => {
      const wr = calculateWinRate(cluster);
      const pf = calculateProfitFactor(cluster);
      let pnl = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      cluster.forEach((t) => {
        const net = t.netPnL ?? 0;
        pnl += net;
        if (net > 0) grossProfit += net;
        else if (net < 0) grossLoss += Math.abs(net);
      });

      return {
        label,
        count: cluster.length,
        wins: wr.wins,
        losses: wr.losses,
        winRate: wr.winRate ?? 0,
        profitFactor: pf.profitFactor,
        grossProfit,
        grossLoss,
        pnl,
      };
    };

    return {
      buy: getStats(buyTrades, 'Positions Acheteuses (BUY)'),
      sell: getStats(sellTrades, 'Positions Vendeuses (SELL)'),
    };
  }, [closedTrades]);

  // 7. TIMELINE BREAKDOWN (DAY OF WEEK & MONTH)
  const timelineBreakdown = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayMap = new Map<number, Trade[]>();
    const monthMap = new Map<string, Trade[]>();

    for (const t of closedTrades) {
      const d = new Date(t.closedAt || t.openedAt);
      const dayIdx = d.getDay();
      const monthKey = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

      const dayArr = dayMap.get(dayIdx) || [];
      dayArr.push(t);
      dayMap.set(dayIdx, dayArr);

      const mArr = monthMap.get(monthKey) || [];
      mArr.push(t);
      monthMap.set(monthKey, mArr);
    }

    const byDay = [1, 2, 3, 4, 5].map((dIdx) => {
      const cluster = dayMap.get(dIdx) || [];
      const wr = calculateWinRate(cluster);
      let pnl = 0;
      cluster.forEach((t) => (pnl += t.netPnL ?? 0));
      return {
        dayName: days[dIdx],
        tradesCount: cluster.length,
        winRate: wr.winRate ?? 0,
        pnl,
      };
    });

    const byMonth = Array.from(monthMap.entries()).map(([mKey, cluster]) => {
      const wr = calculateWinRate(cluster);
      let pnl = 0;
      cluster.forEach((t) => (pnl += t.netPnL ?? 0));
      return {
        month: mKey,
        tradesCount: cluster.length,
        winRate: wr.winRate ?? 0,
        pnl,
      };
    });

    return { byDay, byMonth };
  }, [closedTrades]);

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80';
    if (score >= 65) return 'text-[var(--analytics-accent)] bg-[var(--analytics-accent-soft)]/70 border-[var(--analytics-accent-border)]/80';
    if (score >= 45) return 'text-amber-400 bg-amber-950/70 border-amber-800/80';
    return 'text-rose-400 bg-rose-950/70 border-rose-800/80';
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans select-none pb-12" id="view-analytics">
      {/* 1. HEADER */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--analytics-accent)]/10 text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Statistiques &amp; Analytics</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#181C25] text-slate-600 dark:text-slate-300 font-medium">
                  {closedTrades.length} trades analysés
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Hiérarchie analytique : Performance globale → Setup → Killzone → Paire → Edge
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC FILTERS BAR (6 SYNCHRONIZED FILTERS) */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
          <Filter className="w-3.5 h-3.5 text-[var(--analytics-accent)]" />
          <span>Filtres :</span>
        </div>

        {/* 1. Period */}
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Période : Toute</option>
          <option value="7D">7 derniers jours</option>
          <option value="30D">30 derniers jours</option>
          <option value="MONTH">Ce mois-ci</option>
          <option value="YEAR">Cette année</option>
        </select>

        {/* 2. Pair / Symbol */}
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Toutes les paires ({availableSymbols.length})</option>
          {availableSymbols.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>

        {/* 3. Setup */}
        <select
          value={selectedSetup}
          onChange={(e) => setSelectedSetup(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Tous les setups ({availableSetups.length})</option>
          {availableSetups.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* 4. Killzone */}
        <select
          value={selectedKillzone}
          onChange={(e) => setSelectedKillzone(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Toutes les killzones</option>
          <option value="LONDON">Killzone Londres</option>
          <option value="NEW_YORK">New York</option>
          <option value="TOKYO">Tokyo / Asie</option>
          <option value="SYDNEY">Sydney</option>
        </select>

        {/* 5. Direction */}
        <select
          value={selectedDirection}
          onChange={(e) => setSelectedDirection(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Toutes directions (BUY &amp; SELL)</option>
          <option value="BUY">Achats (BUY)</option>
          <option value="SELL">Ventes (SELL)</option>
        </select>

        {/* 6. Result (WIN, LOSS, BE) */}
        <select
          value={selectedResult}
          onChange={(e) => setSelectedResult(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 bg-slate-50 dark:bg-[#0B0D12] text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--analytics-accent)] cursor-pointer"
        >
          <option value="ALL">Tous résultats</option>
          <option value="WIN">Gagnants (WIN)</option>
          <option value="LOSS">Perdants (LOSS)</option>
          <option value="BREAKEVEN">Breakeven (BE)</option>
        </select>

        {(selectedPeriod !== 'ALL' ||
          selectedSymbol !== 'ALL' ||
          selectedSetup !== 'ALL' ||
          selectedKillzone !== 'ALL' ||
          selectedDirection !== 'ALL' ||
          selectedResult !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedPeriod('ALL');
              setSelectedSymbol('ALL');
              setSelectedSetup('ALL');
              setSelectedKillzone('ALL');
              setSelectedDirection('ALL');
              setSelectedResult('ALL');
            }}
            className="text-xs text-[var(--analytics-accent)] hover:underline ml-auto font-semibold cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* 3. LOGICAL PROGRESSION NAVIGATION TABS */}
      {/* Performance globale → Performance par Setup → Performance par Killzone → Performance par Paire → Edge */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#292E38] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>1. Performance Globale</span>
        </button>

        <button
          onClick={() => setActiveTab('setups')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'setups'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>2. Par Setup ({setupBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('killzones')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'killzones'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>3. Par Killzone ({killzoneBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pairs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pairs'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>4. Par Paire ({pairBreakdown.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('edge')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'edge'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>5. Edge &amp; Synthèse</span>
        </button>

        <button
          onClick={() => setActiveTab('directions')}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'directions'
              ? 'bg-slate-100 dark:bg-[#181C25] text-slate-700 dark:text-slate-200 border border-slate-700'
              : 'text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Buy vs Sell</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-slate-100 dark:bg-[#181C25] text-slate-700 dark:text-slate-200 border border-slate-700'
              : 'text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Timing</span>
        </button>
      </div>

      {/* 4. TAB 1: PERFORMANCE GLOBALE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 6 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* KPI 1: Solde & P&L */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">P&amp;L Net Total</span>
              <div className="text-lg font-bold tabular-nums mt-1 color-transition">
                <AnimatedNumber
                  value={globalMetrics.totalNetPnL}
                  format={(val) => `${val >= 0 ? '+' : ''}${formatCurrency(val, currency)}`}
                  colorizeSigned={true}
                  duration={850}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-1">
                Rendement : {globalMetrics.netReturnPercent >= 0 ? '+' : ''}
                {formatPercent(globalMetrics.netReturnPercent)}
              </span>
            </div>

            {/* KPI 2: Win Rate */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Win Rate</span>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                <AnimatedNumber
                  value={globalMetrics.winRate}
                  format={(val) => formatPercent(val)}
                  duration={850}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {globalMetrics.wins}W / {globalMetrics.losses}L ({globalMetrics.breakevens} BE)
              </span>
            </div>

            {/* KPI 3: Profit Factor */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Profit Factor</span>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                <AnimatedNumber
                  value={globalMetrics.profitFactor > 0 ? globalMetrics.profitFactor : 0}
                  format={(val) => (val > 0 ? formatDecimal(val, 2) : '—')}
                  duration={800}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                Gains / Pertes brutes
              </span>
            </div>

            {/* KPI 4: Expectancy */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Espérance / Trade</span>
              <div className="text-lg font-bold tabular-nums mt-1 color-transition">
                {globalMetrics.rExpectancy !== null ? (
                  <AnimatedNumber
                    value={globalMetrics.rExpectancy}
                    format={(val) => `${val >= 0 ? '+' : ''}${formatRMultiple(val)}`}
                    colorizeSigned={true}
                    duration={850}
                  />
                ) : (
                  <AnimatedNumber
                    value={globalMetrics.monetaryExpectancy}
                    format={(val) => `${val >= 0 ? '+' : ''}${formatCurrency(val, currency)}`}
                    colorizeSigned={true}
                    duration={850}
                  />
                )}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                {globalMetrics.rCount > 0 ? `Sur ${globalMetrics.rCount} trades en R` : 'Espérance monétaire'}
              </span>
            </div>

            {/* KPI 5: Avg Win / Avg Loss */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gain / Perte Moyenne</span>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                <span className="text-[var(--analytics-accent)]">
                  +<AnimatedNumber value={globalMetrics.avgWin} format={(v) => formatCurrency(v, currency)} duration={800} />
                </span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-rose-400">
                  -<AnimatedNumber value={globalMetrics.avgLoss} format={(v) => formatCurrency(v, currency)} duration={800} />
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                R/R réalisé : {formatDecimal(globalMetrics.realizedRR, 2)}
              </span>
            </div>

            {/* KPI 6: Max Drawdown */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between interactive-card">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Max Drawdown</span>
              <div className="text-lg font-bold tabular-nums text-rose-400 mt-1">
                -<AnimatedNumber value={globalMetrics.maxDrawdownPercent} format={(v) => formatPercent(v)} duration={850} />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                -{formatCurrency(globalMetrics.maxDrawdownMoney, currency)} du pic
              </span>
            </div>
          </div>

          {/* Equity Curve Tracing */}
          <EquityCurveChart trades={closedTrades} initialBalance={globalMetrics.initialBalance} currency={currency} />

          {/* Streaks & Consecutive Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--analytics-accent)]/10 text-[var(--analytics-accent)]">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">Max Série Gagnante</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {globalMetrics.streaks.maxConsecutiveWins} victoires d&apos;affilée
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">Max Série Perdante</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {globalMetrics.streaks.maxConsecutiveLosses} pertes d&apos;affilée
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--analytics-accent)]/10 text-[var(--analytics-accent)]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">Série Actuelle</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {globalMetrics.streaks.currentStreak > 0
                      ? `+${globalMetrics.streaks.currentStreak} Victoires`
                      : globalMetrics.streaks.currentStreak < 0
                      ? `${globalMetrics.streaks.currentStreak} Pertes`
                      : 'Neutre (0)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: PERFORMANCE PAR SETUP */}
      {activeTab === 'setups' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Performance par Setup &amp; Modèle d&apos;Exécution ({setupBreakdown.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chaque setup reçoit un Edge Score objectif et transparent sur 100 points
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Nom du Setup</th>
                  <th className="pb-3 font-semibold text-center">Trades (n)</th>
                  <th className="pb-3 font-semibold text-center">Win Rate</th>
                  <th className="pb-3 font-semibold text-right">P&amp;L Net</th>
                  <th className="pb-3 font-semibold text-right">Total R</th>
                  <th className="pb-3 font-semibold text-center">Profit Factor</th>
                  <th className="pb-3 font-semibold text-right">Expectancy</th>
                  <th className="pb-3 font-semibold text-center">Edge Score</th>
                  <th className="pb-3 font-semibold text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#292E38]">
                {setupBreakdown.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-100 dark:bg-[#181C25]/40 transition">
                    <td className="py-3 font-bold text-slate-900 dark:text-slate-100">{s.name}</td>
                    <td className="py-3 text-center font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {s.tradesCount}
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-[var(--analytics-accent)]">
                      {s.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${
                        s.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                      }`}
                    >
                      {s.pnl >= 0 ? '+' : ''}
                      {formatCurrency(s.pnl, currency)}
                    </td>
                    <td className="py-3 text-right font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {s.totalR !== null ? `${s.totalR > 0 ? '+' : ''}${s.totalR.toFixed(2)}R` : '—'}
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {s.profitFactor ? s.profitFactor.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums text-[var(--analytics-accent)]">
                      {s.rExpectancy !== null
                        ? `${s.rExpectancy > 0 ? '+' : ''}${s.rExpectancy.toFixed(2)}R`
                        : formatCurrency(s.monetaryExpectancy, currency)}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() =>
                          setSelectedScoreBreakdown({
                            title: s.name,
                            breakdown: s.edgeScore,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${getScoreBadgeClass(
                          s.edgeScore.totalScore
                        )}`}
                      >
                        {s.edgeScore.totalScore}/100
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          setSelectedScoreBreakdown({
                            title: s.name,
                            breakdown: s.edgeScore,
                          })
                        }
                        className="text-xs text-[var(--analytics-accent)] hover:underline font-semibold cursor-pointer"
                      >
                        Score →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 3: PERFORMANCE PAR SESSION */}
      {activeTab === 'killzones' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Performance par Killzone de Marché &amp; Killzone ({killzoneBreakdown.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {killzoneBreakdown.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Killzone</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]">
                      n = {s.tradesCount}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{s.session}</h3>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Win Rate :</span>
                    <span className="font-bold text-[var(--analytics-accent)]">{s.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">P&amp;L Net :</span>
                    <span
                      className={`font-bold tabular-nums ${
                        s.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                      }`}
                    >
                      {s.pnl >= 0 ? '+' : ''}
                      {formatCurrency(s.pnl, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Profit Factor :</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {s.profitFactor ? s.profitFactor.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Gains / Pertes :</span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {s.wins}W / {s.losses}L
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB 4: PERFORMANCE PAR PAIRE */}
      {activeTab === 'pairs' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Classement de Performance par Paire ({pairBreakdown.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Symbole</th>
                  <th className="pb-3 font-semibold text-center">Trades (n)</th>
                  <th className="pb-3 font-semibold text-center">Win Rate</th>
                  <th className="pb-3 font-semibold text-right">P&amp;L Net</th>
                  <th className="pb-3 font-semibold text-right">Gains Bruts</th>
                  <th className="pb-3 font-semibold text-right">Pertes Brutes</th>
                  <th className="pb-3 font-semibold text-center">Profit Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#292E38]">
                {pairBreakdown.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-100 dark:bg-[#181C25]/40 transition">
                    <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                      <span className="px-2 py-0.5 rounded bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]">
                        {p.symbol}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {p.tradesCount}
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-[var(--analytics-accent)]">
                      {p.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${
                        p.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                      }`}
                    >
                      {p.pnl >= 0 ? '+' : ''}
                      {formatCurrency(p.pnl, currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-[var(--analytics-accent)] tabular-nums">
                      +{formatCurrency(p.grossProfit, currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-rose-400 tabular-nums">
                      -{formatCurrency(p.grossLoss, currency)}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                      {p.profitFactor ? p.profitFactor.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 5: EDGE & SYNTHÈSE STRATÉGIQUE */}
      {activeTab === 'edge' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-[var(--analytics-accent-border)] shadow-md space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Compass className="w-6 h-6 text-[var(--analytics-accent)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[var(--analytics-accent)] block">
                    Synthèse de l&apos;Edge Stratégique
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {edgeAudit.verdict.keyTakeaway}
                  </h3>
                </div>
              </div>

              {onNavigateToMyEdge && (
                <button
                  onClick={onNavigateToMyEdge}
                  className="px-4 py-2 rounded-xl bg-[var(--analytics-accent)] text-slate-950 text-xs font-bold hover:bg-[var(--analytics-accent)] transition cursor-pointer shrink-0"
                >
                  Ouvrir My Edge complet →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-[#292E38]">
              {edgeAudit.verdict.recurringConditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[var(--analytics-accent)] shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{cond}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 6: BUY VS SELL */}
      {activeTab === 'directions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--analytics-accent-soft)] text-[var(--analytics-accent)] border border-[var(--analytics-accent-border)]">
                BUY (Positions Long)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {directionBreakdown.buy.count} trades
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-200 dark:border-[#292E38] text-center">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Win Rate</span>
                <span className="text-lg font-bold text-[var(--analytics-accent)]">
                  {directionBreakdown.buy.winRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Profit Factor</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {directionBreakdown.buy.profitFactor ? directionBreakdown.buy.profitFactor.toFixed(2) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">P&amp;L Net</span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    directionBreakdown.buy.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                  }`}
                >
                  {directionBreakdown.buy.pnl >= 0 ? '+' : ''}
                  {formatCurrency(directionBreakdown.buy.pnl, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
                SELL (Positions Short)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {directionBreakdown.sell.count} trades
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-200 dark:border-[#292E38] text-center">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Win Rate</span>
                <span className="text-lg font-bold text-[var(--analytics-accent)]">
                  {directionBreakdown.sell.winRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Profit Factor</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {directionBreakdown.sell.profitFactor ? directionBreakdown.sell.profitFactor.toFixed(2) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">P&amp;L Net</span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    directionBreakdown.sell.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                  }`}
                >
                  {directionBreakdown.sell.pnl >= 0 ? '+' : ''}
                  {formatCurrency(directionBreakdown.sell.pnl, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 7: TIMING (JOURS & MOIS) */}
      {activeTab === 'timeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Rentabilité par Jour de la Semaine</h2>
            <div className="space-y-2">
              {timelineBreakdown.byDay.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{d.dayName}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 dark:text-slate-400">{d.tradesCount} trades</span>
                    <span className="font-bold text-[var(--analytics-accent)]">{d.winRate.toFixed(1)}% WR</span>
                    <span
                      className={`font-bold tabular-nums ${
                        d.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                      }`}
                    >
                      {d.pnl >= 0 ? '+' : ''}
                      {formatCurrency(d.pnl, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-md space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Rentabilité par Mois</h2>
            <div className="space-y-2">
              {timelineBreakdown.byMonth.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{m.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 dark:text-slate-400">{m.tradesCount} trades</span>
                    <span className="font-bold text-[var(--analytics-accent)]">{m.winRate.toFixed(1)}% WR</span>
                    <span
                      className={`font-bold tabular-nums ${
                        m.pnl >= 0 ? 'text-[var(--analytics-accent)]' : 'text-rose-400'
                      }`}
                    >
                      {m.pnl >= 0 ? '+' : ''}
                      {formatCurrency(m.pnl, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. INDIVIDUAL SCORE BREAKDOWN POPUP */}
      {selectedScoreBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#12151D] border border-[var(--analytics-accent-border)] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#292E38] pb-4">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  Décomposition de l&apos;Edge Score
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedScoreBreakdown.title}
                </h3>
              </div>
              <div
                className={`px-3 py-1 rounded-xl text-sm font-bold border ${getScoreBadgeClass(
                  selectedScoreBreakdown.breakdown.totalScore
                )}`}
              >
                {selectedScoreBreakdown.breakdown.totalScore} / 100 · {selectedScoreBreakdown.breakdown.ratingLabel}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">1. Espérance Mathématique (Expectancy) :</span>
                  <span className="font-bold text-[var(--analytics-accent)]">
                    {selectedScoreBreakdown.breakdown.expectancyPoints} / 30 pts
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#181C25] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--analytics-accent)] h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.expectancyPoints / 30) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">2. Facteur de Profit (Profit Factor) :</span>
                  <span className="font-bold text-[var(--analytics-accent)]">
                    {selectedScoreBreakdown.breakdown.profitFactorPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#181C25] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--analytics-accent)] h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.profitFactorPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">3. Efficience Win Rate / RR :</span>
                  <span className="font-bold text-emerald-400">
                    {selectedScoreBreakdown.breakdown.winRateEfficiencyPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#181C25] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.winRateEfficiencyPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0D12] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">4. Fiabilité Statistique (Sample Size) :</span>
                  <span className="font-bold text-amber-400">
                    {selectedScoreBreakdown.breakdown.sampleConfidencePoints} / 20 pts
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-[#181C25] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.sampleConfidencePoints / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Explanations list */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Justifications mathématiques :</span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {selectedScoreBreakdown.breakdown.explanations.map((exp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--analytics-accent)] font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#292E38] flex justify-end">
              <button
                onClick={() => setSelectedScoreBreakdown(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#181C25] hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. TRADE DETAIL MODAL */}
      {activeTradeDetail && (
        <TradeDetailModal
          trade={activeTradeDetail}
          currency={currency}
          onClose={() => setActiveTradeDetail(null)}
        />
      )}
    </div>
  );
};
