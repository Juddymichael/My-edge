import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trade, PerformanceStats, UserAppSettings, AccountTransaction } from '../types';
import { getThemeClasses, getThemeConfig } from '../utils/theme';
import { calculateAccountBalanceSummary, buildRealEquityCurve } from '../calculations';
import { AnimatedNumber } from './AnimatedNumber';
import { 
  TrendingUp, 
  TrendingDown,
  Plus,
  HelpCircle,
  Sparkles,
  ChevronDown,
  Info,
  Layers,
  ArrowRight,
  Calendar,
  X,
  Zap,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardViewProps {
  trades: Trade[];
  transactions?: AccountTransaction[];
  stats: PerformanceStats;
  settings: UserAppSettings;
  onNavigate: (tab: string) => void;
  onOpenAddModal: () => void;
  onOpenAiModal?: () => void;
  onUpdateSettings?: (newSettings: UserAppSettings) => void;
}

type RangeOption = 'ALL' | '30D' | 'THIS_MONTH' | '7D' | '1D';

export interface MonthStatData {
  key: string;
  monthLabel: string;
  trades: Trade[];
  totalPnL: number;
  returnPercentage: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  beCount: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trades,
  transactions = [],
  stats,
  settings,
  onNavigate,
  onOpenAddModal,
  onOpenAiModal,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);
  const themeConfig = getThemeConfig(settings);

  const [selectedRange, setSelectedRange] = useState<RangeOption>('ALL');
  const [activeRightTab, setActiveRightTab] = useState<'drawdown' | 'recent' | 'history'>('drawdown');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<MonthStatData | null>(null);

  // Account Balance Summary
  const accountSummary = useMemo(() => {
    return calculateAccountBalanceSummary(settings.startingBalance, trades, transactions);
  }, [settings.startingBalance, trades, transactions]);

  const currentBalance = accountSummary.currentBalance;
  const isPnLPositive = stats.totalPnL >= 0;

  // Percentage Return based on initial capital
  const returnPercentage = accountSummary.initialCapital > 0
    ? (stats.totalPnL / accountSummary.initialCapital) * 100
    : 0;

  // Filter trades based on selected range
  const filteredTrades = useMemo(() => {
    if (trades.length === 0) return [];
    if (selectedRange === 'ALL') return trades;

    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestDate = new Date(sorted[sorted.length - 1].date);
    const cutoffDate = new Date(latestDate);

    if (selectedRange === '1D') cutoffDate.setDate(cutoffDate.getDate() - 1);
    else if (selectedRange === '7D') cutoffDate.setDate(cutoffDate.getDate() - 7);
    else if (selectedRange === '30D') cutoffDate.setDate(cutoffDate.getDate() - 30);
    else if (selectedRange === 'THIS_MONTH') cutoffDate.setDate(1);

    return sorted.filter((t) => new Date(t.date) >= cutoffDate);
  }, [trades, selectedRange]);

  // Equity Curve Data
  const equityCurveData = useMemo(() => {
    return buildRealEquityCurve(settings.startingBalance, filteredTrades, transactions);
  }, [settings.startingBalance, filteredTrades, transactions]);

  // Drawdown Metrics
  const drawdownMetrics = useMemo(() => {
    if (trades.length === 0) {
      return { dd24h: 0, dd7d: 0, dd30d: 0 };
    }

    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestDate = new Date(sorted[sorted.length - 1].date).getTime();

    const calculateDDForPeriod = (days: number) => {
      const periodCutoff = latestDate - days * 24 * 60 * 60 * 1000;
      const periodTrades = sorted.filter((t) => new Date(t.date).getTime() >= periodCutoff);
      if (periodTrades.length === 0) return 0;

      let peak = settings.startingBalance;
      let maxDD = 0;
      let running = settings.startingBalance;

      periodTrades.forEach((t) => {
        running += t.netPnL;
        if (running > peak) peak = running;
        const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0;
        if (dd > maxDD) maxDD = dd;
      });

      return Number(maxDD.toFixed(1));
    };

    return {
      dd24h: calculateDDForPeriod(1),
      dd7d: calculateDDForPeriod(7),
      dd30d: calculateDDForPeriod(30),
    };
  }, [trades, settings.startingBalance]);

  // Monthly Performance Breakdown
  const monthlyPerformanceData = useMemo<MonthStatData[]>(() => {
    if (trades.length === 0) return [];

    const monthGroups = new Map<string, Trade[]>();
    const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGroups.has(key)) {
        monthGroups.set(key, []);
      }
      monthGroups.get(key)!.push(t);
    });

    const monthNamesFR = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const result: MonthStatData[] = [];

    monthGroups.forEach((mTrades, key) => {
      const [yearStr, monthStr] = key.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const monthLabel = `${monthNamesFR[m - 1]} ${y}`;

      let totalPnL = 0;
      let winCount = 0;
      let lossCount = 0;
      let beCount = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let bestTrade: Trade | null = null;
      let worstTrade: Trade | null = null;

      mTrades.forEach((t) => {
        const pnl = t.netPnL;
        totalPnL += pnl;
        if (pnl > 0) {
          winCount++;
          grossProfit += pnl;
          if (!bestTrade || pnl > bestTrade.netPnL) bestTrade = t;
        } else if (pnl < 0) {
          lossCount++;
          grossLoss += Math.abs(pnl);
          if (!worstTrade || pnl < worstTrade.netPnL) worstTrade = t;
        } else {
          beCount++;
        }
      });

      const totalTrades = mTrades.length;
      const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
      const returnPercentage = settings.startingBalance > 0 ? (totalPnL / settings.startingBalance) * 100 : 0;

      result.push({
        key,
        monthLabel,
        trades: mTrades,
        totalPnL,
        returnPercentage,
        totalTrades,
        winCount,
        lossCount,
        beCount,
        winRate,
        grossProfit,
        grossLoss,
        profitFactor,
        bestTrade,
        worstTrade,
      });
    });

    return result;
  }, [trades, settings.startingBalance]);

  // Average Risk / Reward
  const validRRTrades = trades.filter((t) => t.rMultiple !== undefined && t.rMultiple !== null && t.rMultiple > 0);
  const avgRR = validRRTrades.length > 0
    ? validRRTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / validRRTrades.length
    : 0;

  // Trading score (0 to 10)
  const tradingScore = useMemo(() => {
    let score = 5.0;
    if (stats.winrate !== null) {
      if (stats.winrate >= 60) score += 2.0;
      else if (stats.winrate >= 50) score += 1.0;
      else if (stats.winrate < 40) score -= 1.5;
    }
    if (stats.profitFactor !== null) {
      if (stats.profitFactor >= 2.0) score += 2.0;
      else if (stats.profitFactor >= 1.3) score += 1.0;
      else if (stats.profitFactor < 1.0) score -= 1.5;
    }
    if (stats.maxDrawdownPercent !== null) {
      if (stats.maxDrawdownPercent <= 5) score += 1.0;
      else if (stats.maxDrawdownPercent > 15) score -= 1.5;
    }
    return Math.max(1.0, Math.min(10.0, Number(score.toFixed(1))));
  }, [stats]);

  const recentTradesList = trades.slice(0, 5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      {/* 1. Header Bar: Account Selector, Actions & Range Filter */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b ${theme.tableBorder}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Account Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer btn-press ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 shadow-2xs hover:border-slate-300'
                  : 'bg-[#121820] border-[#252E38] text-[#E8EDF2] hover:border-[#3A4654]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isLight ? 'bg-violet-600' : 'bg-[#f75605]'}`} />
              <span>Compte Principal</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {isAccountDropdownOpen && (
              <div className={`absolute top-full left-0 mt-1.5 w-52 rounded-xl border shadow-lg z-30 p-1 font-sans ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
              }`}>
                <div className="px-2.5 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100 dark:border-[#252E38]">
                  Comptes de Trading
                </div>
                <button
                  onClick={() => setIsAccountDropdownOpen(false)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center justify-between mt-1 ${
                    isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#171E27] text-[#E8EDF2]'
                  }`}
                >
                  <span>Compte Principal</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${theme.badgeNeutral}`}>Actif</span>
                </button>
              </div>
            )}
          </div>

          {/* Devise Badge */}
          <div className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${
            isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-[#121820] text-[#8B96A3] border-[#252E38]'
          }`}>
            <span className="text-[#8B96A3]">Devise:</span>
            <span className="font-mono font-semibold">{settings.currencySymbol}</span>
          </div>

          {/* Quick Access to Transactions */}
          <button
            onClick={() => onNavigate('transactions')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer btn-press ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-[#121820] border-[#252E38] text-[#8B96A3] hover:bg-[#171E27]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-[#8B96A3]" />
            <span>Transactions</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${theme.badgeNeutral}`}>
              {transactions.length}
            </span>
          </button>

          {/* Quick Access to My Edge */}
          <button
            onClick={() => onNavigate('edge')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer btn-press ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-[#121820] border-[#252E38] text-[#8B96A3] hover:bg-[#171E27]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
            <span>Mon Edge</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${theme.badgeAccent}`}>
              Avantage
            </span>
          </button>
        </div>

        {/* Right side controls: Range selector & New Trade button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector */}
          <div className={`flex items-center p-0.5 rounded-xl border text-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'
          }`}>
            {(['ALL', '30D', 'THIS_MONTH', '7D', '1D'] as RangeOption[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer btn-press ${
                  selectedRange === r
                    ? isLight
                      ? 'bg-violet-600 text-white font-semibold shadow-xs'
                      : 'bg-[#f75605] text-white font-bold shadow-xs'
                    : isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-[#8B96A3] hover:text-[#E8EDF2] hover:bg-[#171E27]'
                }`}
              >
                {r === 'ALL' ? 'Tout' : r === 'THIS_MONTH' ? 'Ce mois' : r}
              </button>
            ))}
          </div>

          {/* Primary CTA Add Trade Button */}
          <button
            onClick={onOpenAddModal}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer btn-press ${
              isLight
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-[#f75605] hover:bg-[#ff6f26] text-white font-black'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nouveau Trade</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Grid (4 Column Banner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: PnL Cumulé */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`p-4 rounded-2xl border ${theme.cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={theme.label}>
              Gain / Perte Cumulé
            </span>
            <div className={`p-1.5 rounded-lg border ${
              isPnLPositive ? theme.winBadge : theme.lossBadge
            }`}>
              {isPnLPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              isPnLPositive ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.totalPnL} 
                prefix={settings.currencySymbol} 
                decimals={2} 
              />
            </span>
          </div>

          <div className={`mt-2.5 flex items-center justify-between text-xs pt-2 border-t ${theme.tableBorder}`}>
            <span className={`font-semibold font-mono px-2 py-0.5 rounded-md text-[11px] ${
              returnPercentage >= 0 ? theme.winBadge : theme.lossBadge
            }`}>
              {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}% ROI
            </span>
            <span className={`text-[11px] ${theme.textMuted}`}>
              Capital: {settings.currencySymbol}{settings.startingBalance.toLocaleString()}
            </span>
          </div>
        </motion.div>

        {/* CARD 2: Taux de Réussite (Win Rate) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`p-4 rounded-2xl border ${theme.cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={theme.label}>
              Taux de Réussite
            </span>
            <div className={`p-1.5 rounded-lg border ${theme.badgeNeutral}`}>
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              (stats.winrate ?? 0) >= 50 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.winrate ?? 0} 
                suffix="%" 
                decimals={1} 
              />
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#232733]'}`}>
              <div 
                className={`h-full transition-all duration-500 ${
                  (stats.winrate ?? 0) >= 50 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, stats.winrate || 0))}%` }}
              />
            </div>
            <div className={`flex justify-between text-[10px] font-medium ${theme.textSecondary}`}>
              <span>{stats.winningTrades} Gagnants</span>
              <span>{stats.losingTrades} Perdants</span>
            </div>
          </div>
        </motion.div>

        {/* CARD 3: Facteur de Profit (Profit Factor) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`p-4 rounded-2xl border ${theme.cardBg}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={theme.label}>
              Facteur de Profit
            </span>
            <div className={`p-1.5 rounded-lg border ${theme.badgeNeutral}`}>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
              stats.profitFactor && stats.profitFactor >= 1.0 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.profitFactor ?? 0} 
                decimals={2} 
              />
            </span>
          </div>

          <div className={`mt-2.5 flex items-center justify-between text-xs pt-2 border-t ${theme.tableBorder}`}>
            <span className={`text-[11px] ${theme.textMuted}`}>
              Gains / Pertes
            </span>
            <span className={`font-mono text-[11px] font-semibold ${
              stats.profitFactor && stats.profitFactor >= 1.25 ? theme.winText : theme.textSecondary
            }`}>
              {stats.profitFactor && stats.profitFactor >= 1.25 ? 'Robuste' : 'Standard'}
            </span>
          </div>
        </motion.div>

        {/* CARD 4: Ratio Risk / Reward moyen */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`p-4 rounded-2xl border flex items-center justify-between ${theme.cardBg}`}
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={theme.label}>Ratio R/R moyen</span>
              <HelpCircle className="w-3 h-3 text-slate-400" />
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${theme.textPrimary}`}>
              <AnimatedNumber value={avgRR} decimals={2} suffix="R" />
            </div>
          </div>

          {/* Donut Ring Chart Visual */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isLight ? '#E2E8F0' : '#232733'}
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={theme.accentColorHex}
                strokeWidth="3.5"
                strokeDasharray={`${Math.min(75, (avgRR / 3) * 100)}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[7px] uppercase font-semibold text-slate-400">R/R</span>
              <span className={`text-[10px] font-bold font-mono ${theme.textPrimary}`}>{avgRR.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Middle Section - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Métriques du compte (Score Gauge) (3 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18 }}
          className={`lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between border ${theme.cardBg}`}
        >
          <div>
            <h3 className={theme.sectionTitle}>Métriques du compte</h3>
            <p className={`text-xs mt-0.5 ${theme.textMuted}`}>Score de performance globale</p>

            {/* Score Ring Gauge */}
            <div className="my-5 relative w-44 h-44 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={isLight ? '#F1F5F9' : '#171E27'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={theme.accentColorHex}
                  strokeWidth="8"
                  strokeDasharray={`${(tradingScore / 10) * 238.7} 238.7`}
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Score Value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-3xl font-bold font-mono tracking-tight ${theme.textPrimary}`}>{tradingScore}</span>
                <span className={`text-[10px] uppercase font-semibold tracking-wider ${theme.textMuted}`}>SCORE</span>
              </div>
            </div>

            {/* Performance Rating Bar */}
            <div className={`space-y-1 pt-3 border-t ${theme.tableBorder}`}>
              <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-2 rounded-full bg-slate-900 dark:bg-white shadow-xs transform -translate-x-1/2 transition-all"
                  style={{ left: `${Math.max(4, Math.min(96, (tradingScore / 10) * 100))}%` }}
                />
              </div>
              <div className={`flex justify-between text-[10px] font-medium ${theme.textSecondary}`}>
                <span>Faible</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* AI Tip Summary */}
          <div className={`mt-4 p-3 rounded-xl border flex items-start gap-2 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0E131A] border-[#252E38]'
          }`}>
            <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${theme.accentIcon}`} />
            <p className={`text-[11px] leading-snug ${theme.textSecondary}`}>
              {tradingScore >= 7.0
                ? 'Excellente maîtrise du risque et de la régularité.'
                : tradingScore >= 5.0
                ? 'Performance correcte. Optimisez vos entrées en ciblant un meilleur R/R.'
                : 'Performance à améliorer — analysez vos pertes dans le journal.'}
            </p>
          </div>
        </motion.div>

        {/* Column 2: Courbe d'équité (6 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.20 }}
          className={`lg:col-span-6 rounded-2xl p-5 flex flex-col justify-between border ${theme.cardBg}`}
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className={theme.sectionTitle}>Courbe d'équité</h3>
                <p className={`text-xs ${theme.textMuted}`}>Évolution du solde avec transactions</p>
              </div>

              {/* Sub Header Metrics */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div>
                  <span className={`text-[10px] block ${theme.textMuted}`}>Rendement</span>
                  <span className={`font-mono font-semibold ${returnPercentage >= 0 ? theme.winText : theme.lossText}`}>
                    {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] block ${theme.textMuted}`}>Solde</span>
                  <span className={`font-mono font-semibold ${theme.textPrimary}`}>
                    {settings.currencySymbol}{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className={`text-[10px] block ${theme.textMuted}`}>Drawdown Max</span>
                  <span className={`font-mono font-semibold ${theme.lossText}`}>
                    -{stats.maxDrawdownPercent !== null ? stats.maxDrawdownPercent.toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.accentColorHex} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={theme.accentColorHex} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E2E8F0' : '#252E38'} vertical={false} />
                  <XAxis dataKey="date" stroke={isLight ? '#94A3B8' : '#8B96A3'} fontSize={10} tickLine={false} axisLine={{ stroke: isLight ? '#E2E8F0' : '#252E38' }} />
                  <YAxis 
                    stroke={isLight ? '#94A3B8' : '#8B96A3'} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={{ stroke: isLight ? '#E2E8F0' : '#252E38' }}
                    tickFormatter={(val) => `${settings.currencySymbol}${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#FFFFFF' : '#121820',
                      borderColor: isLight ? '#E2E8F0' : '#252E38',
                      borderRadius: '8px',
                      color: isLight ? '#0F172A' : '#E8EDF2',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    formatter={(val: any) => [`${settings.currencySymbol}${Number(val).toLocaleString()}`, 'Solde']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke={theme.accentColorHex} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#equityGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Column 3: Tab Panel (3 cols) -> Drawdown / Trades Récents / Historique */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.22 }}
          className={`lg:col-span-3 rounded-2xl p-5 flex flex-col justify-between border ${theme.cardBg}`}
        >
          <div>
            {/* Navigation Tabs */}
            <div className={`flex items-center gap-0.5 p-0.5 rounded-xl border mb-3.5 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0E131A] border-[#252E38]'
            }`}>
              {(['drawdown', 'recent', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRightTab(tab)}
                  className={`flex-1 py-1 text-center text-xs font-medium rounded-lg transition-all cursor-pointer btn-press ${
                    activeRightTab === tab
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'bg-[#171E27] text-[#E8EDF2] shadow-2xs font-semibold'
                      : isLight
                        ? 'text-slate-500 hover:text-slate-900'
                        : 'text-[#8B96A3] hover:text-[#E8EDF2]'
                  }`}
                >
                  {tab === 'drawdown' ? 'Drawdown' : tab === 'recent' ? 'Récents' : 'Historique'}
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: DRAWDOWN */}
            {activeRightTab === 'drawdown' && (
              <div className="space-y-2">
                {/* 24H Card */}
                <div className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded ${theme.badgeNeutral}`}>24H</span>
                    <div>
                      <span className={`text-[10px] block ${theme.textMuted}`}>Journalier</span>
                      <span className={`text-xs font-bold font-mono ${theme.textPrimary}`}>{drawdownMetrics.dd24h}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] block ${theme.textMuted}`}>Limite 10%</span>
                    <span className={`text-[11px] font-semibold ${drawdownMetrics.dd24h <= 10 ? theme.winText : theme.lossText}`}>
                      {drawdownMetrics.dd24h <= 10 ? 'OK' : 'Alerte'}
                    </span>
                  </div>
                </div>

                {/* 7J Card */}
                <div className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded ${theme.badgeNeutral}`}>7J</span>
                    <div>
                      <span className={`text-[10px] block ${theme.textMuted}`}>Hebdomadaire</span>
                      <span className={`text-xs font-bold font-mono ${theme.textPrimary}`}>{drawdownMetrics.dd7d}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] block ${theme.textMuted}`}>Limite 15%</span>
                    <span className={`text-[11px] font-semibold ${drawdownMetrics.dd7d <= 15 ? theme.winText : theme.lossText}`}>
                      {drawdownMetrics.dd7d <= 15 ? 'OK' : 'Alerte'}
                    </span>
                  </div>
                </div>

                {/* 30J Card */}
                <div className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded ${theme.badgeNeutral}`}>30J</span>
                    <div>
                      <span className={`text-[10px] block ${theme.textMuted}`}>Mensuel</span>
                      <span className={`text-xs font-bold font-mono ${theme.textPrimary}`}>{drawdownMetrics.dd30d}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] block ${theme.textMuted}`}>Limite 20%</span>
                    <span className={`text-[11px] font-semibold ${drawdownMetrics.dd30d <= 20 ? theme.winText : theme.lossText}`}>
                      {drawdownMetrics.dd30d <= 20 ? 'OK' : 'Alerte'}
                    </span>
                  </div>
                </div>

                <div className={`pt-1.5 flex items-center gap-1 text-[10px] ${theme.textMuted}`}>
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Drawdown maximum par période</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: TRADES RECENTS */}
            {activeRightTab === 'recent' && (
              <div className="space-y-1.5">
                {recentTradesList.length === 0 ? (
                  <div className={`p-4 text-center text-xs ${theme.textMuted}`}>Aucun trade récent</div>
                ) : (
                  recentTradesList.map((t) => {
                    const isWin = t.netPnL > 0;
                    return (
                      <div key={t.id} className={`p-2 rounded-xl flex items-center justify-between text-xs border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${theme.textPrimary}`}>{t.symbol}</span>
                            <span className={`px-1 py-0.1 rounded text-[9px] font-semibold ${
                              t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                            }`}>
                              {t.side}
                            </span>
                          </div>
                          <div className={`text-[10px] ${theme.textMuted}`}>{t.date}</div>
                        </div>
                        <div className={`font-mono font-semibold text-xs ${isWin ? theme.winText : theme.lossText}`}>
                          {isWin ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT 3: HISTORIQUE */}
            {activeRightTab === 'history' && (
              <div className="space-y-2 text-xs">
                <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'}`}>
                  <div className={theme.label}>Total Exécutions</div>
                  <div className={`text-base font-bold font-mono mt-0.5 ${theme.textPrimary}`}>{stats.totalTrades} Trades</div>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'}`}>
                  <div className={theme.label}>Plus Grand Gain</div>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${theme.winText}`}>
                    +{settings.currencySymbol}{(stats.largestWin || 0).toFixed(2)}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#12151D] border-[#232733]'}`}>
                  <div className={theme.label}>Plus Grande Perte</div>
                  <div className={`text-xs font-bold font-mono mt-0.5 ${theme.lossText}`}>
                    {settings.currencySymbol}{(stats.largestLoss || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('trades')}
            className={`mt-3 w-full py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1 cursor-pointer btn-press ${
              isLight 
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                : 'bg-[#12151D] hover:bg-[#1A1E29] text-slate-300 border-[#232733]'
            }`}
          >
            <span>Voir tout l'historique</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </motion.div>
      </div>

      {/* 4. SECTION PERFORMANCE PAR MOIS (Monthly Performance Breakdown) */}
      <div className={`p-4 sm:p-6 rounded-2xl border ${theme.cardBg}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b ${theme.tableBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${theme.badgeNeutral}`}>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className={theme.sectionTitle}>
                Performance par Mois
              </h2>
              <p className={`text-xs ${theme.textMuted}`}>
                Bilan financier mensuel et détails au clic
              </p>
            </div>
          </div>
          <div className={`text-xs font-mono px-2.5 py-1 rounded-lg border self-start sm:self-auto ${theme.badgeNeutral}`}>
            {monthlyPerformanceData.length} Mois Enregistrés
          </div>
        </div>

        {monthlyPerformanceData.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border border-dashed ${
            isLight ? 'border-slate-200 text-slate-400 bg-slate-50/50' : 'border-[#232733] text-slate-500 bg-[#12151D]'
          }`}>
            <Calendar className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">Aucun trade enregistré pour calculer les statistiques mensuelles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {monthlyPerformanceData.map((m) => {
              const isPos = m.totalPnL >= 0;
              return (
                <div
                  key={m.key}
                  onClick={() => setSelectedMonthDetail(m)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group card-hover-lift btn-press ${
                    isLight
                      ? 'bg-slate-50/70 hover:bg-white border-slate-200'
                      : 'bg-[#12151D] hover:bg-[#161922] border-[#232733]'
                  }`}
                >
                  {/* Top row: Month & Return % badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-sm ${theme.textPrimary}`}>
                      {m.monthLabel}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                      isPos ? theme.winBadge : theme.lossBadge
                    }`}>
                      {isPos ? '+' : ''}{m.returnPercentage.toFixed(2)}%
                    </span>
                  </div>

                  {/* PnL Amount */}
                  <div className="mb-3">
                    <div className={theme.label}>
                      Gain Net
                    </div>
                    <div className={`text-xl font-bold font-mono ${isPos ? theme.winText : theme.lossText}`}>
                      {isPos ? '+' : ''}{settings.currencySymbol}{m.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Progress / WinRate Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className={theme.textMuted}>Win Rate</span>
                      <span className={`font-mono font-semibold ${m.winRate >= 50 ? theme.winText : theme.lossText}`}>
                        {m.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className={`w-full h-1 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-[#232733]'}`}>
                      <div
                        className={`h-full transition-all duration-500 ${m.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, m.winRate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Row stats: Trades count & Profit Factor */}
                  <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${theme.tableBorder}`}>
                    <div className={`flex items-center gap-1 font-medium text-[11px] ${theme.textSecondary}`}>
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>{m.totalTrades} trade{m.totalTrades > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className={`flex items-center gap-1 text-xs font-medium ${theme.textSecondary} group-hover:text-slate-900 dark:group-hover:text-white transition-colors`}>
                      <span>Détails</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODAL DETAIL MENSUEL */}
      {selectedMonthDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className={`relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#12151D] border-[#232733] text-slate-100'
            }`}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${theme.badgeNeutral}`}>
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold tracking-tight ${theme.textPrimary}`}>
                    Bilan — {selectedMonthDetail.monthLabel}
                  </h3>
                  <p className={`text-[11px] ${theme.textMuted}`}>
                    {selectedMonthDetail.totalTrades} transactions exécutées
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMonthDetail(null)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-[#232733] text-slate-400 hover:bg-[#1C202B]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* PnL Card */}
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
                }`}>
                  <span className={theme.label}>Gain / Perte</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    selectedMonthDetail.totalPnL >= 0 ? theme.winText : theme.lossText
                  }`}>
                    {selectedMonthDetail.totalPnL >= 0 ? '+' : ''}{settings.currencySymbol}{selectedMonthDetail.totalPnL.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 ${
                    selectedMonthDetail.returnPercentage >= 0 ? theme.winText : theme.lossText
                  }`}>
                    {selectedMonthDetail.returnPercentage >= 0 ? '+' : ''}{selectedMonthDetail.returnPercentage.toFixed(2)}% ROI
                  </div>
                </div>

                {/* Win Rate Card */}
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
                }`}>
                  <span className={theme.label}>Win Rate</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    selectedMonthDetail.winRate >= 50 ? theme.winText : theme.lossText
                  }`}>
                    {selectedMonthDetail.winRate.toFixed(1)}%
                  </div>
                  <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                    {selectedMonthDetail.winCount}W / {selectedMonthDetail.lossCount}L
                  </div>
                </div>

                {/* Profit Factor Card */}
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
                }`}>
                  <span className={theme.label}>Profit Factor</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    selectedMonthDetail.profitFactor >= 1 ? theme.winText : theme.lossText
                  }`}>
                    {selectedMonthDetail.profitFactor > 0 ? selectedMonthDetail.profitFactor.toFixed(2) : 'N/A'}
                  </div>
                  <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                    Ratio Gains/Pertes
                  </div>
                </div>

                {/* Trades Count */}
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
                }`}>
                  <span className={theme.label}>Trades</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${theme.textPrimary}`}>
                    {selectedMonthDetail.totalTrades}
                  </div>
                  <div className={`text-[10px] ${theme.textMuted} mt-0.5`}>
                    Positions
                  </div>
                </div>
              </div>

              {/* Trades Table */}
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                  Liste des Trades
                </h4>
                <div className={`rounded-xl border overflow-x-auto ${theme.tableBorder}`}>
                  <table className="w-full text-xs text-left min-w-[460px]">
                    <thead className={`text-[10px] uppercase font-semibold border-b ${theme.tableHeaderBg}`}>
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Symbole</th>
                        <th className="p-2.5">Sens</th>
                        <th className="p-2.5">Résultat</th>
                        <th className="p-2.5 text-right">R/R</th>
                        <th className="p-2.5 text-right">PnL Net</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${theme.divideBorder}`}>
                      {selectedMonthDetail.trades.map((t) => {
                        const isWin = t.netPnL > 0;
                        const isBE = t.netPnL === 0;
                        return (
                          <tr key={t.id} className={theme.tableRowHover}>
                            <td className="p-2.5 font-mono">{t.date}</td>
                            <td className={`p-2.5 font-semibold ${theme.textPrimary}`}>{t.symbol}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                              }`}>
                                {t.side}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                isWin ? theme.winBadge : isBE ? theme.badgeNeutral : theme.lossBadge
                              }`}>
                                {isWin ? 'Win' : isBE ? 'BE' : 'Loss'}
                              </span>
                            </td>
                            <td className={`p-2.5 text-right font-mono ${theme.textSecondary}`}>
                              {t.rMultiple !== undefined && t.rMultiple !== null ? `${Number(t.rMultiple).toFixed(1)}R` : '-'}
                            </td>
                            <td className={`p-2.5 text-right font-mono font-bold ${
                              isWin ? theme.winText : isBE ? theme.textMuted : theme.lossText
                            }`}>
                              {isWin ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-3 border-t flex justify-end ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-[#232733]'
            }`}>
              <button
                onClick={() => setSelectedMonthDetail(null)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer btn-press ${
                  isLight ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#FF8533] hover:bg-[#EA580C] text-black'
                }`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
