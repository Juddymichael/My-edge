import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trade, UserAppSettings, TradeSide } from '../types';
import { calculatePerformanceStats } from '../calculations';
import { getValidTradingTrades } from '../calculations/edgeEngine';
import { getStandardSession } from '../utils/tradingSession';
import { AnimatedNumber } from './AnimatedNumber';
import {
  Zap,
  Trophy,
  Clock,
  Target,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Scale,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Award
} from 'lucide-react';

interface EdgeViewProps {
  trades: Trade[];
  settings: UserAppSettings;
}

type TimeFilterOption = '30d' | '60d' | '90d' | 'all';

// List of official setups requested by the user
export const ICT_USER_SETUPS = [
  'FVG',
  'CRT',
  'FVG dans FVG',
  'Orderblock',
  'IFVG',
  'GAP',
  'Inverted GAP',
  'VI'
] as const;

/**
 * Normalizes any setup name into user's canonical setup categories
 */
export function normalizeUserSetupName(rawSetup?: string): string {
  if (!rawSetup || rawSetup.trim() === '') return 'Non spécifié';
  const s = rawSetup.trim();
  const lower = s.toLowerCase();

  if (lower.includes('fvg dans fvg') || lower.includes('fvg in fvg')) return 'FVG dans FVG';
  if (lower === 'ifvg' || lower.includes('inverted fvg') || lower.includes('inversion fvg')) return 'IFVG';
  if (lower === 'fvg' || lower.includes('fair value gap')) return 'FVG';
  if (lower === 'crt' || lower.includes('candle range theory') || lower.includes('candle range') || lower.includes('sweep')) return 'CRT';
  if (lower.includes('orderblock') || lower.includes('order block') || lower === 'ob' || lower.includes('breaker')) return 'Orderblock';
  if (lower.includes('invetef gap') || lower.includes('inverted gap') || lower.includes('invert gap')) return 'Inverted GAP';
  if (lower === 'gap' || lower.includes('opening gap') || lower.includes('volume gap')) return 'GAP';
  if (lower === 'vi' || lower.includes('volume imbalance') || lower.includes('imbalance')) return 'VI';
  if (lower.includes('mss') || lower.includes('choch') || lower.includes('structure')) return 'Orderblock';

  return s;
}

// Formatters for static strings
const fmtCurrency = (val: number | null | undefined, symbol: string): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const prefix = val >= 0 ? '+' : '-';
  return `${prefix}${symbol}${Math.abs(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtExpectancyR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}R`;
};

const fmtPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val.toFixed(1)}%`;
};

const fmtPF = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return val.toFixed(2);
};

export const EdgeView: React.FC<EdgeViewProps> = ({ trades, settings }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>('all');
  const [selectedSymbolFilter, setSelectedSymbolFilter] = useState<string>('ALL');

  const currencySymbol = settings.currencySymbol || '$';
  const isLight = settings.theme === 'light';

  // 1. Strictly filter valid trading entries (excludes non-trades, deposits, withdrawals, duplicates)
  const validTrades = useMemo(() => getValidTradingTrades(trades), [trades]);

  // 2. Apply Time Filter
  const timeFilteredTrades = useMemo(() => {
    if (timeFilter === 'all') return validTrades;
    const now = new Date();
    const days = timeFilter === '30d' ? 30 : timeFilter === '60d' ? 60 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return validTrades.filter((t) => {
      const tradeDate = new Date(t.date);
      return !isNaN(tradeDate.getTime()) && tradeDate >= cutoff;
    });
  }, [validTrades, timeFilter]);

  // 3. Available Symbols list for quick isolate filter (e.g. XAUUSD, EURUSD)
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    timeFilteredTrades.forEach((t) => {
      if (t.symbol) set.add(t.symbol.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [timeFilteredTrades]);

  // Filtered dataset according to active symbol filter
  const activeTrades = useMemo(() => {
    if (selectedSymbolFilter === 'ALL') return timeFilteredTrades;
    return timeFilteredTrades.filter((t) => (t.symbol || '').trim().toUpperCase() === selectedSymbolFilter);
  }, [timeFilteredTrades, selectedSymbolFilter]);

  // Overall KPIs
  const overallStats = useMemo(() => calculatePerformanceStats(activeTrades), [activeTrades]);

  // 1. MES ACTIFS / PAIRES (Calculs complets)
  const assetMetrics = useMemo(() => {
    const map = new Map<string, Trade[]>();
    timeFilteredTrades.forEach((t) => {
      const sym = (t.symbol || 'AUTRE').trim().toUpperCase();
      if (!map.has(sym)) map.set(sym, []);
      map.get(sym)!.push(t);
    });

    const list: Array<{
      symbol: string;
      trades: number;
      winrate: number | null;
      pf: number | null;
      expectancyR: number | null;
      pnl: number;
      isPositive: boolean;
      status: 'win' | 'lose' | 'neutral';
    }> = [];

    map.forEach((trList, sym) => {
      const st = calculatePerformanceStats(trList);
      const isWin = st.totalPnL > 0 && (st.profitFactor === null || st.profitFactor >= 1.0) && (st.expectancyR ?? 0) >= 0;
      const isLoss = st.totalPnL < 0 || (st.profitFactor !== null && st.profitFactor < 0.95) || (st.expectancyR !== null && st.expectancyR < 0);

      list.push({
        symbol: sym,
        trades: st.totalTrades,
        winrate: st.winrate,
        pf: st.profitFactor,
        expectancyR: st.expectancyR,
        pnl: st.totalPnL,
        isPositive: isWin,
        status: isWin ? 'win' : isLoss ? 'lose' : 'neutral',
      });
    });

    // Sort by Total PnL descending
    return list.sort((a, b) => b.pnl - a.pnl || (b.expectancyR ?? 0) - (a.expectancyR ?? 0));
  }, [timeFilteredTrades]);

  // BEST & WORST ASSET (PAIRE OÙ J'AI LE PLUS DE PROFIT)
  const topProfitAsset = useMemo(() => {
    if (assetMetrics.length === 0) return null;
    const profitable = assetMetrics.filter(a => a.pnl > 0);
    return profitable.length > 0 ? profitable[0] : assetMetrics[0];
  }, [assetMetrics]);

  const worstAsset = useMemo(() => {
    if (assetMetrics.length === 0) return null;
    const losing = assetMetrics.filter(a => a.pnl < 0);
    return losing.length > 0 ? [...losing].sort((a, b) => a.pnl - b.pnl)[0] : null;
  }, [assetMetrics]);

  // 2. MES KILL ZONES (GMT-5: Asia, London, New York, London Close)
  const killzoneMetrics = useMemo(() => {
    const predefinedSessions = ['London', 'New York', 'Asia', 'London Close', 'Hors Kill Zone'];
    const map = new Map<string, Trade[]>();
    predefinedSessions.forEach((s) => map.set(s, []));

    activeTrades.forEach((t) => {
      const kz = getStandardSession(t) || 'Hors Kill Zone';
      if (!map.has(kz)) map.set(kz, []);
      map.get(kz)!.push(t);
    });

    const list: Array<{
      killzone: string;
      trades: number;
      winrate: number | null;
      pf: number | null;
      avgR: number | null;
      expectancyR: number | null;
      pnl: number;
      isPositive: boolean;
      status: 'win' | 'lose' | 'neutral';
    }> = [];

    map.forEach((trList, kz) => {
      if (trList.length === 0) return;
      const st = calculatePerformanceStats(trList);
      const isWin = st.totalPnL > 0 && (st.profitFactor === null || st.profitFactor > 1.0) && (st.expectancyR ?? 0) >= 0;
      const isLoss = st.totalPnL < 0 || (st.profitFactor !== null && st.profitFactor < 1.0) || (st.expectancyR !== null && st.expectancyR < 0);

      list.push({
        killzone: kz,
        trades: st.totalTrades,
        winrate: st.winrate,
        pf: st.profitFactor,
        avgR: st.avgR,
        expectancyR: st.expectancyR,
        pnl: st.totalPnL,
        isPositive: isWin,
        status: isWin ? 'win' : isLoss ? 'lose' : 'neutral',
      });
    });

    // Sort by best PnL and Expectancy R
    return list.sort((a, b) => b.pnl - a.pnl || (b.expectancyR ?? -999) - (a.expectancyR ?? -999));
  }, [activeTrades]);

  // BEST & WORST KILLZONE
  const topProfitKillzone = useMemo(() => {
    if (killzoneMetrics.length === 0) return null;
    const profitable = killzoneMetrics.filter(k => k.pnl > 0);
    return profitable.length > 0 ? profitable[0] : killzoneMetrics[0];
  }, [killzoneMetrics]);

  const worstKillzone = useMemo(() => {
    const losing = killzoneMetrics.filter((k) => k.pnl < 0 || (k.expectancyR ?? 0) < 0);
    if (losing.length > 0) {
      return [...losing].sort((a, b) => a.pnl - b.pnl)[0];
    }
    return null;
  }, [killzoneMetrics]);

  // 3. MES SETUPS (FVG, CRT, FVG dans FVG, Orderblock, IFVG, GAP, Inverted GAP, VI)
  const setupMetrics = useMemo(() => {
    const map = new Map<string, Trade[]>();

    activeTrades.forEach((t) => {
      let rawSetup = t.setup;
      if (!rawSetup && t.tags && t.tags.length > 0) {
        rawSetup = t.tags[0];
      }
      const canonName = normalizeUserSetupName(rawSetup);

      if (!map.has(canonName)) map.set(canonName, []);
      map.get(canonName)!.push(t);
    });

    const list: Array<{
      setup: string;
      trades: number;
      winrate: number | null;
      pf: number | null;
      avgR: number | null;
      expectancyR: number | null;
      pnl: number;
      status: 'win' | 'lose' | 'neutral';
    }> = [];

    map.forEach((trList, stp) => {
      const st = calculatePerformanceStats(trList);
      const isWin = st.totalPnL > 0 && (st.profitFactor === null || st.profitFactor > 1.0) && (st.expectancyR ?? 0) >= 0;
      const isLoss = st.totalPnL < 0 || (st.profitFactor !== null && st.profitFactor < 1.0) || (st.expectancyR !== null && st.expectancyR < 0);

      list.push({
        setup: stp,
        trades: st.totalTrades,
        winrate: st.winrate,
        pf: st.profitFactor,
        avgR: st.avgR,
        expectancyR: st.expectancyR,
        pnl: st.totalPnL,
        status: isWin ? 'win' : isLoss ? 'lose' : 'neutral',
      });
    });

    // Rank best to worst (PnL -> Expectancy R)
    return list.sort((a, b) => b.pnl - a.pnl || (b.expectancyR ?? -999) - (a.expectancyR ?? -999));
  }, [activeTrades]);

  // TOP PROFIT SETUP
  const topProfitSetup = useMemo(() => {
    if (setupMetrics.length === 0) return null;
    const profitable = setupMetrics.filter(s => s.pnl > 0 && s.setup !== 'Non spécifié');
    if (profitable.length > 0) return profitable[0];
    return setupMetrics[0];
  }, [setupMetrics]);

  // 4. BUY VS SELL
  const directionMetrics = useMemo(() => {
    const buyTrades = activeTrades.filter((t) => (t.side || 'BUY').toUpperCase() === 'BUY');
    const sellTrades = activeTrades.filter((t) => (t.side || 'BUY').toUpperCase() === 'SELL');

    const buyStats = calculatePerformanceStats(buyTrades);
    const sellStats = calculatePerformanceStats(sellTrades);

    return {
      buy: {
        side: 'BUY' as TradeSide,
        trades: buyStats.totalTrades,
        winrate: buyStats.winrate,
        pf: buyStats.profitFactor,
        expectancyR: buyStats.expectancyR,
        pnl: buyStats.totalPnL,
        avgWin: buyStats.avgWin,
        avgLoss: buyStats.avgLoss,
      },
      sell: {
        side: 'SELL' as TradeSide,
        trades: sellStats.totalTrades,
        winrate: sellStats.winrate,
        pf: sellStats.profitFactor,
        expectancyR: sellStats.expectancyR,
        pnl: sellStats.totalPnL,
        avgWin: sellStats.avgWin,
        avgLoss: sellStats.avgLoss,
      },
    };
  }, [activeTrades]);

  // 5. COMBINAISONS 4-VOIES (ACTIF + KILL ZONE + SETUP + DIRECTION)
  const { topCombos, weakCombos } = useMemo(() => {
    const comboMap = new Map<string, {
      symbol: string;
      killzone: string;
      setup: string;
      side: string;
      trades: Trade[];
    }>();

    activeTrades.forEach((t) => {
      const sym = (t.symbol || 'AUTRE').trim().toUpperCase();
      const kz = (getStandardSession(t) || 'Hors Kill Zone').trim();
      const stp = normalizeUserSetupName(t.setup || (t.tags && t.tags[0] ? t.tags[0] : 'FVG'));
      const side = (t.side || 'BUY').toUpperCase();

      const key = `${sym}__${kz}__${stp}__${side}`;
      if (!comboMap.has(key)) {
        comboMap.set(key, { symbol: sym, killzone: kz, setup: stp, side, trades: [] });
      }
      comboMap.get(key)!.trades.push(t);
    });

    const allCalculated: Array<{
      key: string;
      symbol: string;
      killzone: string;
      setup: string;
      side: string;
      tradesCount: number;
      winrate: number | null;
      pf: number | null;
      expectancyR: number | null;
      pnl: number;
    }> = [];

    comboMap.forEach((val, key) => {
      const st = calculatePerformanceStats(val.trades);
      allCalculated.push({
        key,
        symbol: val.symbol,
        killzone: val.killzone,
        setup: val.setup,
        side: val.side,
        tradesCount: st.totalTrades,
        winrate: st.winrate,
        pf: st.profitFactor,
        expectancyR: st.expectancyR,
        pnl: st.totalPnL,
      });
    });

    // Top Combos: positive PnL & PF > 1.0 & Expectancy > 0
    const top = allCalculated
      .filter((c) => c.pnl > 0 && (c.pf === null || c.pf >= 1.05) && (c.expectancyR ?? 0) >= 0)
      .sort((a, b) => b.pnl - a.pnl || (b.expectancyR ?? 0) - (a.expectancyR ?? 0))
      .slice(0, 3);

    // Weak Combos (Points Faibles): losing combinations
    const weak = allCalculated
      .filter((c) => c.pnl < 0 || (c.pf !== null && c.pf < 0.95) || (c.expectancyR !== null && c.expectancyR < 0))
      .sort((a, b) => a.pnl - b.pnl || (a.expectancyR ?? 0) - (b.expectancyR ?? 0))
      .slice(0, 3);

    return { topCombos: top, weakCombos: weak };
  }, [activeTrades]);

  if (!validTrades || validTrades.length === 0) {
    return (
      <div className={`p-8 max-w-4xl mx-auto text-center py-20 font-sans ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#161922] border-[#232733] text-slate-300'
        }`}>
          <Zap className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Mon Edge</h2>
        <p className={`text-sm sm:text-base max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Aucun trade valide identifié dans votre journal. Importez ou ajoutez vos transactions pour révéler votre avantage statistique.
        </p>
      </div>
    );
  }

  // 90% Neutral Dominant Theme Classes
  const pageBg = isLight ? 'text-slate-900' : 'text-[#E8EDF2]';
  const cardBg = isLight 
    ? 'bg-white border-slate-200 shadow-xs card-hover-lift' 
    : 'bg-[#121820] border-[#252E38] shadow-[0_1px_3px_rgba(0,0,0,0.2)] card-hover-lift';
  
  const innerBoxBg = isLight ? 'bg-[#F8FAFC] border-slate-200' : 'bg-[#0E131A] border-[#252E38]';
  const tableHeaderBg = isLight ? 'bg-[#F1F5F9] border-slate-200 text-slate-700 font-bold' : 'bg-[#0E131A] border-[#252E38] text-slate-300 font-bold';
  const tableRowHover = isLight ? 'hover:bg-slate-100/70' : 'hover:bg-[#171E27]';
  const tableBorder = isLight ? 'border-slate-200' : 'border-[#252E38]';
  const divideBorder = isLight ? 'divide-slate-200' : 'divide-[#252E38]';

  // Typography hierarchy: standard refined medium scale
  const mainText = isLight ? 'text-slate-900 font-semibold' : 'text-[#F1F5F9] font-semibold';
  const subText = isLight ? 'text-slate-500 text-xs' : 'text-[#94A3B8] text-xs';
  const labelText = isLight ? 'text-slate-500 font-semibold text-[11px] uppercase tracking-wider' : 'text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider';
  const sectionTitleText = isLight ? 'text-slate-900 font-bold text-sm sm:text-base' : 'text-[#F1F5F9] font-bold text-sm sm:text-base';

  // Semantic performance colors - Softened & only applied where truly needed
  const winColor = isLight ? 'text-emerald-600 font-bold' : 'text-[#34D399] font-bold';
  const lossColor = isLight ? 'text-rose-600 font-bold' : 'text-[#F87171] font-bold';
  
  // Diverse color palettes to avoid red/green monotony
  const winBadge = isLight 
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs' 
    : 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 font-semibold text-xs';
  
  const lossBadge = isLight 
    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-xs' 
    : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30 font-semibold text-xs';

  const neutralBadge = isLight
    ? 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs'
    : 'bg-[#171E27] text-slate-300 border border-[#252E38] font-semibold text-xs';

  const orangeBadge = isLight
    ? 'bg-orange-50 text-[#f75605] border border-orange-200 font-semibold text-xs'
    : 'bg-[#f75605]/15 text-[#f75605] border border-[#f75605]/30 font-semibold text-xs';

  const cyanBadge = isLight
    ? 'bg-sky-50 text-sky-700 border border-sky-200 font-semibold text-xs'
    : 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold text-xs';

  const purpleBadge = isLight
    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-xs'
    : 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold text-xs';

  const amberBadge = isLight
    ? 'bg-orange-50 text-[#f75605] border border-orange-200 font-semibold text-xs'
    : 'bg-[#f75605]/15 text-[#f75605] border border-[#f75605]/30 font-semibold text-xs';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans ${pageBg}`}
    >
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b ${tableBorder}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${mainText}`}>
              Mon Edge
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full ${orangeBadge}`}>
              Analyse Statistique
            </span>
          </div>
          <p className={subText}>
            Identification de vos sources d'avantage concurrentiel (Actifs, Kill Zones et Setups ICT).
          </p>
        </div>

        {/* Filtres Actif & Période */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Symbol Filter Selector */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
          }`}>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Actif :</span>
            <select
              value={selectedSymbolFilter}
              onChange={(e) => setSelectedSymbolFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold outline-none cursor-pointer text-inherit"
            >
              <option value="ALL">Tous ({availableSymbols.length})</option>
              {availableSymbols.map((sym) => (
                <option key={sym} value={sym} className={isLight ? 'text-slate-900 bg-white' : 'text-slate-100 bg-[#121820]'}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          {/* Time Selector */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'
          }`}>
            <div className="flex items-center px-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>
            {[
              { id: '30d', label: '30J' },
              { id: '60d', label: '60J' },
              { id: '90d', label: '90J' },
              { id: 'all', label: 'Tout' },
            ].map((tab) => {
              const active = timeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTimeFilter(tab.id as TimeFilterOption)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer btn-press ${
                    active
                      ? isLight
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-[#f75605] text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white hover:bg-[#171E27]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── BANDEAU RÉSUMÉ SUPÉRIEUR (3 Cartes Principales) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. PAIRE PRINCIPALE */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.04 }}
          className={`p-4 rounded-2xl border ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg border ${isLight ? 'bg-orange-50 border-orange-200 text-[#f75605]' : 'bg-[#f75605]/15 border-[#f75605]/30 text-[#f75605]'}`}>
                <Trophy className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className={labelText}>
                {topProfitAsset && topProfitAsset.pnl > 0 ? 'Paire la plus rentable' : 'Paire principale'}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              topProfitAsset && topProfitAsset.pnl > 0 ? orangeBadge : neutralBadge
            }`}>
              {topProfitAsset && topProfitAsset.pnl > 0 ? 'Top Paire' : 'Actif'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1.5">
            <div className={`text-lg sm:text-xl font-bold tracking-tight ${mainText}`}>
              {topProfitAsset ? topProfitAsset.symbol : 'N/A'}
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono ${
              (topProfitAsset?.pnl ?? 0) >= 0 ? winColor : lossColor
            }`}>
              <AnimatedNumber 
                value={topProfitAsset?.pnl ?? 0} 
                prefix={currencySymbol} 
              />
            </div>
          </div>

          <div className={`mt-3 pt-2.5 border-t ${tableBorder} flex items-center justify-between text-xs`}>
            <span className={subText}>
              {topProfitAsset ? `${topProfitAsset.trades} trades • Win Rate ` : 'Aucun trade'}
              {topProfitAsset && <span className="font-bold text-slate-800 dark:text-slate-100">{fmtPercent(topProfitAsset.winrate)}</span>}
            </span>
            <span className={`font-mono text-xs font-semibold text-slate-700 dark:text-slate-300`}>
              PF {topProfitAsset ? fmtPF(topProfitAsset.pf) : 'N/A'}
            </span>
          </div>
        </motion.div>

        {/* 2. KILL ZONE PRINCIPALE */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className={`p-4 rounded-2xl border ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg border ${isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-sky-500/15 border-sky-500/30 text-sky-300'}`}>
                <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className={labelText}>
                {topProfitKillzone && topProfitKillzone.pnl > 0 ? 'Session la plus rentable' : 'Session principale'}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              topProfitKillzone && topProfitKillzone.pnl > 0 ? cyanBadge : neutralBadge
            }`}>
              {topProfitKillzone && topProfitKillzone.pnl > 0 ? 'Meilleure Session' : 'Session'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1.5">
            <div className={`text-lg sm:text-xl font-bold tracking-tight ${mainText}`}>
              {topProfitKillzone ? topProfitKillzone.killzone : 'N/A'}
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono ${
              (topProfitKillzone?.pnl ?? 0) >= 0 ? winColor : lossColor
            }`}>
              <AnimatedNumber 
                value={topProfitKillzone?.pnl ?? 0} 
                prefix={currencySymbol} 
              />
            </div>
          </div>

          <div className={`mt-3 pt-2.5 border-t ${tableBorder} flex items-center justify-between text-xs`}>
            <span className={subText}>
              {topProfitKillzone ? `${topProfitKillzone.trades} trades • Exp ` : 'Aucun trade'}
              {topProfitKillzone && <span className="font-bold text-slate-800 dark:text-slate-100">{fmtExpectancyR(topProfitKillzone.expectancyR)}</span>}
            </span>
            <span className={`font-mono text-xs font-semibold text-slate-700 dark:text-slate-300`}>
              WR {topProfitKillzone ? fmtPercent(topProfitKillzone.winrate) : 'N/A'}
            </span>
          </div>
        </motion.div>

        {/* 3. SETUP PRINCIPAL */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className={`p-4 rounded-2xl border ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg border ${isLight ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>
                <Target className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className={labelText}>
                {topProfitSetup && topProfitSetup.pnl > 0 ? 'Setup le plus rentable' : 'Setup principal'}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              topProfitSetup && topProfitSetup.pnl > 0 ? purpleBadge : neutralBadge
            }`}>
              {topProfitSetup && topProfitSetup.pnl > 0 ? 'Modèle ICT' : 'Setup ICT'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1.5">
            <div className={`text-lg sm:text-xl font-bold tracking-tight ${mainText}`}>
              {topProfitSetup ? topProfitSetup.setup : 'FVG'}
            </div>
            <div className={`text-base sm:text-lg font-bold font-mono ${
              (topProfitSetup?.pnl ?? 0) >= 0 ? winColor : lossColor
            }`}>
              <AnimatedNumber 
                value={topProfitSetup?.pnl ?? 0} 
                prefix={currencySymbol} 
              />
            </div>
          </div>

          <div className={`mt-3 pt-2.5 border-t ${tableBorder} flex items-center justify-between text-xs`}>
            <span className={subText}>
              {topProfitSetup ? `${topProfitSetup.trades} trades • Win Rate ` : 'Setups ICT'}
              {topProfitSetup && <span className="font-bold text-slate-800 dark:text-slate-100">{fmtPercent(topProfitSetup.winrate)}</span>}
            </span>
            <span className={`font-mono text-xs font-semibold text-slate-700 dark:text-slate-300`}>
              PF {topProfitSetup ? fmtPF(topProfitSetup.pf) : 'N/A'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── 6 INDICATEURS DE VALIDATION GLOBALE ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. TRADES VALIDES */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.14 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>TRADES</span>
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${mainText}`}>
            <AnimatedNumber value={overallStats.totalTrades} decimals={0} />
          </div>
          <div className={`mt-1.5 text-[11px] ${subText}`}>
            Exécutés
          </div>
        </motion.div>

        {/* 2. WIN RATE */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.16 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>WIN RATE</span>
            <Target className="w-3.5 h-3.5 text-[#f75605]" />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono text-[#f75605]`}>
            <AnimatedNumber value={overallStats.winrate} suffix="%" decimals={1} />
          </div>
          <div className={`mt-1.5 text-[11px] font-medium text-slate-400`}>
            {overallStats.winningTrades}W / {overallStats.losingTrades}L
          </div>
        </motion.div>

        {/* 3. PROFIT FACTOR */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>PROFIT FACTOR</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${
            (overallStats.profitFactor ?? 0) >= 1.0 ? 'text-sky-400' : 'text-slate-400'
          }`}>
            <AnimatedNumber value={overallStats.profitFactor} decimals={2} />
          </div>
          <div className={`mt-1.5 text-[11px] font-medium text-slate-400`}>
            {(overallStats.profitFactor ?? 0) >= 1.5 ? 'Solide' : (overallStats.profitFactor ?? 0) >= 1 ? 'Rentable' : 'À améliorer'}
          </div>
        </motion.div>

        {/* 4. ESPÉRANCE GAIN (R) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.20 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>ESPÉRANCE (R)</span>
            <Award className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono text-purple-400`}>
            <AnimatedNumber value={overallStats.expectancyR} suffix="R" decimals={2} />
          </div>
          <div className={`mt-1.5 text-[11px] ${subText}`}>
            Moy. par trade
          </div>
        </motion.div>

        {/* 5. R MOYEN */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.22 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>R MOYEN</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${mainText}`}>
            <AnimatedNumber value={overallStats.avgR} suffix="R" decimals={2} />
          </div>
          <div className={`mt-1.5 text-[11px] ${subText}`}>
            Risk/Reward moyen
          </div>
        </motion.div>

        {/* 6. P&L TOTAL */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.24 }}
          className={`p-3.5 rounded-2xl border flex flex-col justify-between ${cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelText}>P&L TOTAL</span>
            <Award className={`w-3.5 h-3.5 ${overallStats.totalPnL >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`} />
          </div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${
            overallStats.totalPnL >= 0 ? winColor : lossColor
          }`}>
            <AnimatedNumber value={overallStats.totalPnL} prefix={currencySymbol} decimals={2} />
          </div>
          <div className={`mt-1.5 text-[11px] ${subText}`}>
            Net accumulé
          </div>
        </motion.div>
      </div>

      {/* ─── 5 & 6 — TOP COMBINAISONS & POINTS FAIBLES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SECTION 5: TOP COMBOS */}
        <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl border ${isLight ? 'bg-orange-50 border-orange-200 text-[#f75605]' : 'bg-[#f75605]/15 border-[#f75605]/30 text-[#f75605]'}`}>
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              </span>
              <div>
                <h2 className={`flex items-center gap-2 ${sectionTitleText}`}>
                  <span>5 — Ce qui fonctionne le mieux</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${orangeBadge}`}>
                    Top 3
                  </span>
                </h2>
                <p className={subText}>
                  Combinaisons 4-voies les plus rentables (Actif + Session + Setup + Sens)
                </p>
              </div>
            </div>
          </div>

          {topCombos.length === 0 ? (
            <div className={`p-6 rounded-xl text-center border border-dashed ${innerBoxBg} ${subText}`}>
              <p className="text-sm font-medium">Aucune combinaison positive identifiée pour l'instant.</p>
              <p className="text-xs mt-1">Continuez à enregistrer vos sessions pour révéler vos avantages.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCombos.map((combo, idx) => {
                return (
                  <div
                    key={combo.key}
                    className={`p-3.5 sm:p-4 rounded-xl border ${innerBoxBg}`}
                  >
                    <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 pb-2.5 border-b ${tableBorder}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center font-mono ${
                          idx === 0 
                            ? isLight ? 'bg-orange-100 text-[#f75605]' : 'bg-[#f75605]/20 text-[#f75605]'
                            : isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#252E38] text-slate-300'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className={`text-sm sm:text-base font-bold tracking-tight ${mainText}`}>
                          {combo.symbol} • {combo.killzone} • {combo.setup} • {combo.side}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${winBadge}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Edge Validé</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Trades</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${mainText}`}>{combo.tradesCount}</div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Win Rate</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-[#f75605]`}>
                          {fmtPercent(combo.winrate)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Profit Factor</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-sky-400`}>
                          {fmtPF(combo.pf)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Expectancy</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-purple-400`}>
                          {fmtExpectancyR(combo.expectancyR)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>P&L</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${winColor}`}>
                          {fmtCurrency(combo.pnl, currencySymbol)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 6: WEAK COMBOS */}
        <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl border ${isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}>
                <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
              </span>
              <div>
                <h2 className={`flex items-center gap-2 ${sectionTitleText}`}>
                  <span>6 — Ce que je dois éviter</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lossBadge}`}>
                    Points Faibles
                  </span>
                </h2>
                <p className={subText}>
                  Combinaisons responsables des pertes répétées et fuites de capital
                </p>
              </div>
            </div>
          </div>

          {weakCombos.length === 0 ? (
            <div className={`p-6 rounded-xl text-center border border-dashed ${innerBoxBg} ${subText}`}>
              <p className="text-sm font-medium">Aucun point faible majeur détecté sur cette période.</p>
              <p className="text-xs mt-1">Excellente discipline d'exécution.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakCombos.map((combo, idx) => {
                return (
                  <div
                    key={combo.key}
                    className={`p-3.5 sm:p-4 rounded-xl border ${innerBoxBg}`}
                  >
                    <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 pb-2.5 border-b ${tableBorder}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 font-bold text-xs flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <span className={`text-sm sm:text-base font-bold tracking-tight ${mainText}`}>
                          {combo.symbol} • {combo.killzone} • {combo.setup} • {combo.side}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${lossBadge}`}>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Fuite de capital</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Trades</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${mainText}`}>{combo.tradesCount}</div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Win Rate</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-slate-300`}>
                          {fmtPercent(combo.winrate)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Profit Factor</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-slate-300`}>
                          {fmtPF(combo.pf)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>Expectancy</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 text-slate-300`}>
                          {fmtExpectancyR(combo.expectancyR)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                        <div className={labelText}>P&L</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${lossColor}`}>
                          {fmtCurrency(combo.pnl, currencySymbol)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── 1 — MES ACTIFS / PAIRES ─── */}
      <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${isLight ? 'bg-orange-50 border-orange-200 text-[#f75605]' : 'bg-[#f75605]/15 border-[#f75605]/30 text-[#f75605]'}`}>
              <Trophy className="w-4 h-4 stroke-[2.2]" />
            </span>
            <div>
              <h2 className={sectionTitleText}>
                1 — Mes Actifs & Paires
              </h2>
              <p className={subText}>
                Classement par rentabilité nette : identifier les paires génératrices de valeur
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${tableHeaderBg}`}>
                <th className="py-2.5 px-3">Actif</th>
                <th className="py-2.5 px-3 text-center">Trades</th>
                <th className="py-2.5 px-3 text-center">WR</th>
                <th className="py-2.5 px-3 text-center">PF</th>
                <th className="py-2.5 px-3 text-center">Expectancy</th>
                <th className="py-2.5 px-3 text-right">P&L Net</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${divideBorder}`}>
              {assetMetrics.map((asset) => {
                const isTop = topProfitAsset && topProfitAsset.symbol === asset.symbol && asset.pnl > 0;
                return (
                  <tr
                    key={asset.symbol}
                    className={`transition-colors ${tableRowHover}`}
                  >
                    <td className="py-3 px-3 font-semibold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        asset.status === 'win' ? 'bg-[#34D399]' : asset.status === 'lose' ? 'bg-[#F87171]' : 'bg-slate-400'
                      }`} />
                      <span className={`text-sm font-bold ${mainText}`}>{asset.symbol}</span>
                      {isTop && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${orangeBadge}`}>
                          Top
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono text-xs sm:text-sm font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{asset.trades}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-[#f75605]">
                      {fmtPercent(asset.winrate)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-sky-400">
                      {fmtPF(asset.pf)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-purple-400">
                      {fmtExpectancyR(asset.expectancyR)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono text-xs sm:text-sm font-bold ${
                      asset.pnl >= 0 ? winColor : lossColor
                    }`}>
                      {fmtCurrency(asset.pnl, currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        asset.status === 'win'
                          ? winBadge
                          : asset.status === 'lose'
                          ? lossBadge
                          : neutralBadge
                      }`}>
                        {asset.status === 'win' ? 'Rentable' : asset.status === 'lose' ? 'Perdant' : 'Neutre'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 2 — MES KILL ZONES ─── */}
      <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-sky-500/15 border-sky-500/30 text-sky-300'}`}>
              <Clock className="w-4 h-4 stroke-[2.2]" />
            </span>
            <div>
              <h2 className={sectionTitleText}>
                2 — Mes Kill Zones (GMT-5)
              </h2>
              <p className={subText}>
                Asia: 20:00→00:01 • London: 02:00→05:01 • New York: 07:00→10:00 • London Close: 10:00→12:01
              </p>
            </div>
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {topProfitKillzone && topProfitKillzone.pnl > 0 && (
              <span className={`px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5 ${cyanBadge}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Top Session : <strong>{topProfitKillzone.killzone}</strong> ({fmtCurrency(topProfitKillzone.pnl, currencySymbol)})</span>
              </span>
            )}
            {worstKillzone && (
              <span className={`px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1.5 ${lossBadge}`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Attention : <strong>{worstKillzone.killzone}</strong> ({fmtCurrency(worstKillzone.pnl, currencySymbol)})</span>
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${tableHeaderBg}`}>
                <th className="py-2.5 px-3">Kill Zone</th>
                <th className="py-2.5 px-3 text-center">Trades</th>
                <th className="py-2.5 px-3 text-center">WR</th>
                <th className="py-2.5 px-3 text-center">PF</th>
                <th className="py-2.5 px-3 text-center">Avg R</th>
                <th className="py-2.5 px-3 text-center">Expectancy</th>
                <th className="py-2.5 px-3 text-right">P&L Net</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${divideBorder}`}>
              {killzoneMetrics.map((kz) => {
                return (
                  <tr
                    key={kz.killzone}
                    className={`transition-colors ${tableRowHover}`}
                  >
                    <td className="py-3 px-3 font-semibold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        kz.status === 'win' ? 'bg-[#34D399]' : kz.status === 'lose' ? 'bg-[#F87171]' : 'bg-slate-400'
                      }`} />
                      <span className={`text-sm font-bold ${mainText}`}>{kz.killzone}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono text-xs sm:text-sm font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{kz.trades}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-[#f75605]">
                      {fmtPercent(kz.winrate)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-sky-400">
                      {fmtPF(kz.pf)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-medium text-slate-300">
                      {fmtExpectancyR(kz.avgR)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-purple-400">
                      {fmtExpectancyR(kz.expectancyR)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono text-xs sm:text-sm font-bold ${
                      kz.pnl >= 0 ? winColor : lossColor
                    }`}>
                      {fmtCurrency(kz.pnl, currencySymbol)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 3 — MES SETUPS ICT & 4 — BUY VS SELL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 3 — MES SETUPS ICT */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl border ${isLight ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>
                <Target className="w-4 h-4 stroke-[2.2]" />
              </span>
              <div>
                <h2 className={sectionTitleText}>
                  3 — Mes Setups ICT
                </h2>
                <p className={subText}>
                  FVG, CRT, FVG dans FVG, Orderblock, IFVG, GAP, Inverted GAP, VI
                </p>
              </div>
            </div>

            {topProfitSetup && topProfitSetup.pnl > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${purpleBadge}`}>
                Top : {topProfitSetup.setup}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${tableHeaderBg}`}>
                  <th className="py-2.5 px-3">Setup ICT</th>
                  <th className="py-2.5 px-3 text-center">Trades</th>
                  <th className="py-2.5 px-3 text-center">WR</th>
                  <th className="py-2.5 px-3 text-center">PF</th>
                  <th className="py-2.5 px-3 text-center">Expectancy</th>
                  <th className="py-2.5 px-3 text-right">P&L Net</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${divideBorder}`}>
                {setupMetrics.map((stp) => {
                  return (
                    <tr
                      key={stp.setup}
                      className={`transition-colors ${tableRowHover}`}
                    >
                      <td className="py-3 px-3 font-semibold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          stp.status === 'win' ? 'bg-[#34D399]' : stp.status === 'lose' ? 'bg-[#F87171]' : 'bg-slate-400'
                        }`} />
                        <span className={`text-sm font-bold ${mainText}`}>{stp.setup}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono text-xs sm:text-sm font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{stp.trades}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-[#f75605]">
                        {fmtPercent(stp.winrate)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-sky-400">
                        {fmtPF(stp.pf)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs sm:text-sm font-semibold text-purple-400">
                        {fmtExpectancyR(stp.expectancyR)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono text-xs sm:text-sm font-bold ${
                        stp.pnl >= 0 ? winColor : lossColor
                      }`}>
                        {fmtCurrency(stp.pnl, currencySymbol)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 — BUY VS SELL */}
        <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
          <div className="flex items-center gap-2.5">
            <span className={`p-2 rounded-xl border ${innerBoxBg} text-slate-400`}>
              <Scale className="w-4 h-4 stroke-[2.2]" />
            </span>
            <div>
              <h2 className={sectionTitleText}>
                4 — Buy vs Sell
              </h2>
              <p className={subText}>
                Comparaison directe par direction
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* BUY CARD */}
            <div className={`p-4 rounded-xl border ${innerBoxBg}`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-bold text-xs sm:text-sm text-[#34D399] flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>BUY (Long)</span>
                </span>
                <span className={`text-xs sm:text-sm font-bold font-mono ${
                  directionMetrics.buy.pnl >= 0 ? winColor : lossColor
                }`}>
                  {fmtCurrency(directionMetrics.buy.pnl, currencySymbol)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>Trades</div>
                  <div className={`font-mono text-xs sm:text-sm font-semibold ${mainText}`}>{directionMetrics.buy.trades}</div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>WR</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-[#f75605]">
                    {fmtPercent(directionMetrics.buy.winrate)}
                  </div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>PF</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-sky-400">{fmtPF(directionMetrics.buy.pf)}</div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>Exp R</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-purple-400">
                    {fmtExpectancyR(directionMetrics.buy.expectancyR)}
                  </div>
                </div>
              </div>
            </div>

            {/* SELL CARD */}
            <div className={`p-4 rounded-xl border ${innerBoxBg}`}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-bold text-xs sm:text-sm text-[#F87171] flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  <span>SELL (Short)</span>
                </span>
                <span className={`text-xs sm:text-sm font-bold font-mono ${
                  directionMetrics.sell.pnl >= 0 ? winColor : lossColor
                }`}>
                  {fmtCurrency(directionMetrics.sell.pnl, currencySymbol)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>Trades</div>
                  <div className={`font-mono text-xs sm:text-sm font-semibold ${mainText}`}>{directionMetrics.sell.trades}</div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>WR</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-[#f75605]">
                    {fmtPercent(directionMetrics.sell.winrate)}
                  </div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>PF</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-sky-400">{fmtPF(directionMetrics.sell.pf)}</div>
                </div>
                <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
                  <div className={labelText}>Exp R</div>
                  <div className="font-mono text-xs sm:text-sm font-semibold text-purple-400">
                    {fmtExpectancyR(directionMetrics.sell.expectancyR)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EdgeView;
