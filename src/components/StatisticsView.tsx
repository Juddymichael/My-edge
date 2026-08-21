import React from 'react';
import { motion } from 'motion/react';
import { Trade, PerformanceStats, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { AnimatedNumber } from './AnimatedNumber';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Flame, 
  Target, 
  Award, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieIcon
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface StatisticsViewProps {
  stats: PerformanceStats;
  trades: Trade[];
  settings: UserAppSettings;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  stats,
  trades,
  settings,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  // Win / Loss / BE Pie Distribution Data
  const pieData = React.useMemo(() => {
    return [
      { name: 'Gagnants', value: stats.winningTrades, color: '#10B981' },
      { name: 'Perdants', value: stats.losingTrades, color: '#F43F5E' },
      { name: 'Break Even', value: stats.beTrades, color: '#64748B' },
    ].filter((item) => item.value > 0);
  }, [stats.winningTrades, stats.losingTrades, stats.beTrades]);

  // Cumulative PnL Curve Data
  const cumulativeData = React.useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0;
    return sorted.map((t, i) => {
      cum += t.netPnL;
      return {
        index: i + 1,
        date: t.date,
        pnl: Number(cum.toFixed(2)),
      };
    });
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div 
        className={`p-8 max-w-3xl mx-auto text-center py-20 font-sans ${isLight ? 'text-slate-900' : 'text-slate-100'}`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${theme.badgeNeutral}`}>
          <BarChart3 className="w-8 h-8 opacity-60" />
        </div>
        <h2 className={`text-xl font-bold mb-2 tracking-tight ${theme.textPrimary}`}>Aucune statistique disponible</h2>
        <p className={`text-xs max-w-sm mx-auto ${theme.textMuted}`}>
          Ajoutez vos premiers trades pour débloquer votre analyse de performance financière détaillée.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b ${theme.tableBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${theme.badgeNeutral}`}>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className={theme.sectionTitle}>
              Statistiques de Performance Avancées
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
            Analyse détaillée sur {stats.totalTrades} transaction{stats.totalTrades > 1 ? 's' : ''} exécutée{stats.totalTrades > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${theme.badgeNeutral}`}>
            Devise: {settings.currencySymbol}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono ${
            (stats.winrate ?? 0) >= 50 ? theme.winBadge : theme.lossBadge
          }`}>
            {stats.winrate !== null ? `${stats.winrate.toFixed(1)}% Win Rate` : 'N/A'}
          </span>
        </div>
      </div>

      {/* HERO KPI HIGHLIGHT CARDS (PnL Total, Profit Factor, Win Rate, Drawdown, Expectancy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* HERO 1: PnL Total */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>PnL Total Net</span>
            <div className={`p-1 rounded-md border ${
              stats.totalPnL >= 0 ? theme.winBadge : theme.lossBadge
            }`}>
              {stats.totalPnL >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight block ${
              stats.totalPnL >= 0 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.totalPnL} 
                prefix={settings.currencySymbol} 
                decimals={2} 
              />
            </span>
          </div>
          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] font-mono ${theme.tableBorder}`}>
            <span className={theme.winText}>+{settings.currencySymbol}{(stats.grossProfit || 0).toFixed(0)}</span>
            <span className={theme.lossText}>-{settings.currencySymbol}{(stats.grossLoss || 0).toFixed(0)}</span>
          </div>
        </div>

        {/* HERO 2: Profit Factor */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Profit Factor</span>
            <div className={`p-1 rounded-md border ${theme.badgeNeutral}`}>
              <Activity className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight block ${
              stats.profitFactor && stats.profitFactor >= 1.0 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.profitFactor} 
                decimals={2}
              />
            </span>
          </div>
          <div className={`mt-2.5 pt-2 border-t flex items-center gap-1 text-[10px] font-semibold ${theme.tableBorder}`}>
            <span className={`px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
              stats.profitFactor && stats.profitFactor >= 2.0
                ? theme.winBadge
                : stats.profitFactor && stats.profitFactor >= 1.2
                  ? theme.badgeNeutral
                  : theme.lossBadge
            }`}>
              {stats.profitFactor && stats.profitFactor >= 2.0 ? 'Élite' : stats.profitFactor && stats.profitFactor >= 1.2 ? 'Rentable' : 'À optimiser'}
            </span>
          </div>
        </div>

        {/* HERO 3: Win Rate */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Win Rate</span>
            <div className={`p-1 rounded-md border ${theme.badgeNeutral}`}>
              <Target className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight block ${
              (stats.winrate ?? 0) >= 50 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.winrate} 
                suffix="%" 
                decimals={1}
              />
            </span>
          </div>
          <div className={`mt-2.5 pt-2 border-t text-[11px] flex justify-between ${theme.tableBorder}`}>
            <span className={theme.winText}>{stats.winningTrades} Wins</span>
            <span className={theme.lossText}>{stats.losingTrades} Losses</span>
          </div>
        </div>

        {/* HERO 4: Max Drawdown */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Max Drawdown</span>
            <div className={`p-1 rounded-md border ${theme.lossBadge}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight block ${theme.lossText}`}>
              <AnimatedNumber 
                value={stats.maxDrawdownPercent !== null ? -Math.abs(stats.maxDrawdownPercent) : null} 
                suffix="%" 
                decimals={1}
              />
            </span>
          </div>
          <div className={`mt-2.5 pt-2 border-t text-[11px] font-mono ${theme.tableBorder} ${theme.lossText}`}>
            {stats.maxDrawdownAmount !== null ? `-${settings.currencySymbol}${stats.maxDrawdownAmount.toFixed(2)}` : '0.00'}
          </div>
        </div>

        {/* HERO 5: Expectancy */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Espérance / Trade</span>
            <div className={`p-1 rounded-md border ${theme.badgeNeutral}`}>
              <Award className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="mt-1">
            <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight block ${
              stats.expectancy && stats.expectancy >= 0 ? theme.winText : theme.lossText
            }`}>
              <AnimatedNumber 
                value={stats.expectancy} 
                prefix={settings.currencySymbol} 
                decimals={2}
              />
            </span>
          </div>
          <div className={`mt-2.5 pt-2 border-t text-[11px] ${theme.tableBorder} ${theme.textMuted}`}>
            Moyenne espérée
          </div>
        </div>
      </div>

      {/* SECTION 1: PERFORMANCE FINANCIÈRE DÉTAILLÉE */}
      <div className="space-y-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Performance Financière Détaillée</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Gains Brut</span>
            <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
              +{settings.currencySymbol}{(stats.grossProfit || 0).toFixed(2)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Pertes Brut</span>
            <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
              -{settings.currencySymbol}{(stats.grossLoss || 0).toFixed(2)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Gain Moyen</span>
            <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
              {stats.avgWin !== null ? `+${settings.currencySymbol}${stats.avgWin.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Perte Moyenne</span>
            <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
              {stats.avgLoss !== null ? `-${settings.currencySymbol}${stats.avgLoss.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Plus Grand Gain</span>
            <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
              {stats.largestWin !== null ? `+${settings.currencySymbol}${stats.largestWin.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Plus Grande Perte</span>
            <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
              {stats.largestLoss !== null ? `${settings.currencySymbol}${stats.largestLoss.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Moyenne / Trade</span>
            <span className={`text-xs font-bold mt-1 block font-mono ${
              stats.avgTrade && stats.avgTrade >= 0 ? theme.winText : theme.lossText
            }`}>
              {stats.avgTrade !== null ? `${stats.avgTrade >= 0 ? '+' : ''}${settings.currencySymbol}${stats.avgTrade.toFixed(2)}` : 'N/A'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${theme.cardBg}`}>
            <span className={theme.label}>Total Trades</span>
            <span className={`text-xs font-bold mt-1 block font-mono ${theme.textPrimary}`}>
              {stats.totalTrades}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: RISQUE ET SÉRIES EN DUAL CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Metrics */}
        <div className={`rounded-2xl p-5 border ${theme.cardBg}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${theme.textSecondary}`}>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Gestion du Risque & Multiples R</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Max Drawdown ($)</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.maxDrawdownAmount !== null ? `-${settings.currencySymbol}${stats.maxDrawdownAmount.toFixed(2)}` : '0.00'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Max Drawdown (%)</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.maxDrawdownPercent !== null ? `-${stats.maxDrawdownPercent.toFixed(2)}%` : '0.0%'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>R Moyen</span>
              <span className={`text-xs font-bold mt-1 block font-mono ${theme.textPrimary}`}>
                {stats.avgR !== null ? `${stats.avgR >= 0 ? '+' : ''}${stats.avgR.toFixed(2)}R` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Meilleur R</span>
              <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
                {stats.bestR !== null ? `+${stats.bestR.toFixed(2)}R` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Pire R</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.worstR !== null ? `${stats.worstR.toFixed(2)}R` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Ratio Risk/Reward</span>
              <span className={`text-xs font-bold mt-1 block font-mono ${theme.textPrimary}`}>
                {stats.riskRewardRatio !== null ? stats.riskRewardRatio.toFixed(2) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Streaks & Period Bests */}
        <div className={`rounded-2xl p-5 border ${theme.cardBg}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${theme.textSecondary}`}>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Séries & Meilleurs Périodes</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Série Victoires</span>
              <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
                {stats.winStreak} trade{stats.winStreak > 1 ? 's' : ''}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Série Pertes</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.lossStreak} trade{stats.lossStreak > 1 ? 's' : ''}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Meilleure Journée</span>
              <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
                {stats.bestDay ? `+${settings.currencySymbol}${stats.bestDay.pnl.toFixed(0)}` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Pire Journée</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.worstDay ? `${settings.currencySymbol}${stats.worstDay.pnl.toFixed(0)}` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Meilleur Mois</span>
              <span className={`text-xs font-bold ${theme.winText} mt-1 block font-mono`}>
                {stats.bestMonth ? `+${settings.currencySymbol}${stats.bestMonth.pnl.toFixed(0)}` : 'N/A'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>Pire Mois</span>
              <span className={`text-xs font-bold ${theme.lossText} mt-1 block font-mono`}>
                {stats.worstMonth ? `${settings.currencySymbol}${stats.worstMonth.pnl.toFixed(0)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: CHARTS & VISUALISATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative PnL Chart */}
        <div className={`lg:col-span-2 rounded-2xl p-5 border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className={theme.sectionTitle}>
                Croissance Cumulée PnL
              </h3>
              <p className={`text-xs ${theme.textMuted}`}>
                Évolution de la courbe de capitaux
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
              stats.totalPnL >= 0 ? theme.winBadge : theme.lossBadge
            }`}>
              {(stats.totalPnL || 0) >= 0 ? '+' : ''}{settings.currencySymbol}{(stats.totalPnL || 0).toFixed(2)}
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="statsPnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accentColorHex} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={theme.accentColorHex} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#E2E8F0' : '#232733'} vertical={false} />
                <XAxis 
                  dataKey="index" 
                  stroke={isLight ? '#94A3B8' : '#64748B'} 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={{ stroke: isLight ? '#E2E8F0' : '#232733' }}
                />
                <YAxis 
                  stroke={isLight ? '#94A3B8' : '#64748B'} 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={{ stroke: isLight ? '#E2E8F0' : '#232733' }}
                  tickFormatter={(v) => `${settings.currencySymbol}${v}`} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#FFFFFF' : '#161922',
                    borderColor: isLight ? '#E2E8F0' : '#232733',
                    borderRadius: '8px',
                    color: isLight ? '#0F172A' : '#F8FAFC',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(val: any) => [`${settings.currencySymbol}${Number(val).toFixed(2)}`, 'PnL Cumulé']}
                  labelFormatter={(label) => `Trade #${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke={theme.accentColorHex} 
                  strokeWidth={2} 
                  fillOpacity={1}
                  fill="url(#statsPnlGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Distribution Pie Chart */}
        <div className={`rounded-2xl p-5 border flex flex-col justify-between ${theme.cardBg}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={theme.sectionTitle}>
                  Distribution des Résultats
                </h3>
                <p className={`text-xs ${theme.textMuted}`}>
                  Répartition des trades terminés
                </p>
              </div>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-48 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={isLight ? '#FFFFFF' : '#161922'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#FFFFFF' : '#161922',
                      borderColor: isLight ? '#E2E8F0' : '#232733',
                      borderRadius: '8px',
                      color: isLight ? '#0F172A' : '#F8FAFC',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className={`text-lg font-bold font-mono ${theme.textPrimary}`}>
                  {stats.totalTrades}
                </span>
                <span className={`text-[9px] uppercase font-semibold text-slate-400`}>
                  Trades
                </span>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-3 gap-2 text-center pt-3 border-t font-mono ${theme.tableBorder}`}>
            <div className={`p-1.5 rounded-lg border ${theme.winBadge}`}>
              <span className="text-[9px] block font-semibold uppercase">Wins</span>
              <span className="text-xs font-bold">{stats.winningTrades}</span>
            </div>
            <div className={`p-1.5 rounded-lg border ${theme.lossBadge}`}>
              <span className="text-[9px] block font-semibold uppercase">Losses</span>
              <span className="text-xs font-bold">{stats.losingTrades}</span>
            </div>
            <div className={`p-1.5 rounded-lg border ${theme.badgeNeutral}`}>
              <span className="text-[9px] block font-semibold uppercase">B.E.</span>
              <span className="text-xs font-bold">{stats.beTrades}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
