import React, { useMemo } from 'react';
import { BarChart3, Calculator, TrendingUp, Target, Zap } from 'lucide-react';
import { Trade } from '../types/trade';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { formatCurrency, formatPercent, formatDecimal } from '../lib/formatting';
import { UserSettings } from '../types/settings';
import { getTradeSession } from '../lib/tradingSession';

interface Props { trades?: Trade[]; onSelectTrade?: (trade: Trade) => void; settings?: UserSettings; }

function bestDimension(trades: Trade[], getKey: (trade: Trade) => string) {
  const groups = new Map<string, { pnl: number; count: number }>();
  trades.filter(t => t.status === 'CLOSED' && typeof t.netPnL === 'number').forEach(t => {
    const key = getKey(t);
    if (!key) return;
    const current = groups.get(key) || { pnl: 0, count: 0 };
    current.pnl += t.netPnL || 0;
    current.count += 1;
    groups.set(key, current);
  });
  return [...groups.entries()].sort((a, b) => b[1].pnl - a[1].pnl || b[1].count - a[1].count)[0] || null;
}

function bestWeekday(trades: Trade[]) {
  const labels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return bestDimension(trades, t => {
    const date = new Date(t.closedAt || t.openedAt);
    return Number.isNaN(date.getTime()) ? '' : labels[date.getUTCDay()];
  });
}

export const CalculationVerificationPanel: React.FC<Props> = ({ trades = [], settings }) => {
  const safeTrades = trades || [];
  const currency = settings?.currency || 'EUR';
  const initialBalance = settings?.initialAccountBalance || 10000;
  const metrics = calculateComprehensiveMetrics(safeTrades, initialBalance);

  const summary = useMemo(() => {
    const closed = safeTrades.filter(t => t.status === 'CLOSED' && typeof t.netPnL === 'number');
    const pair = bestDimension(closed, t => (t.symbol || '').toUpperCase().trim());
    const session = bestDimension(closed, t => getTradeSession(t));
    const weekday = bestWeekday(closed);
    const dd = metrics.drawdown;
    return { pair, session, weekday, currentDrawdown: dd.currentDrawdown, currentDrawdownPercent: dd.currentDrawdownPercent };
  }, [safeTrades, metrics.drawdown]);

  const metricCards = [
    { label: 'TOTAL P&L', value: formatCurrency(metrics.netPnLSum, currency), tone: metrics.netPnLSum >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: TrendingUp },
    { label: 'WIN RATE', value: formatPercent(metrics.winRate.winRate, 1), tone: 'text-white', icon: Target },
    { label: 'PROFIT FACTOR', value: metrics.profitFactor.profitFactor === Infinity ? '∞' : formatDecimal(metrics.profitFactor.profitFactor, 2), tone: metrics.profitFactor.profitFactor !== null && metrics.profitFactor.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400', icon: Zap },
    { label: 'TOTAL TRADES', value: String(metrics.totalTrades), tone: 'text-white', icon: BarChart3 },
  ];

  return <>
    <section id="dashboard-key-metrics" className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#ECE7FC] dark:border-[#292E38] mb-4">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400"><Calculator className="w-4 h-4" /></div>
        <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Métriques clés</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Calculées localement à partir de vos trades clôturés</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metricCards.map(({ label, value, tone, icon: Icon }) => <div key={label} className="bg-slate-50/80 dark:bg-[#181C25] border border-slate-200/80 dark:border-[#292E38] rounded-2xl p-4"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span><Icon className="w-4 h-4 text-violet-400" /></div><p className={`text-xl font-black tabular-nums mt-2 ${tone}`}>{value}</p></div>)}</div>
    </section>
    <section id="dashboard-statistics-summary" className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Résumé de la statistique</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Synthèse locale — aucun appel Gemini</p></div><BarChart3 className="w-4 h-4 text-violet-400" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Meilleure paire', summary.pair ? `${summary.pair[0]} · ${formatCurrency(summary.pair[1].pnl, currency)}` : '—'],
          ['Meilleure session', summary.session ? `${summary.session[0]} · ${formatCurrency(summary.session[1].pnl, currency)}` : '—'],
          ['Meilleur jour', summary.weekday ? `${summary.weekday[0]} · ${formatCurrency(summary.weekday[1].pnl, currency)}` : '—'],
          ['Série actuelle', `${metrics.streaks.currentStreakCount} ${metrics.streaks.currentStreakType === 'WIN' ? 'gagnante' : metrics.streaks.currentStreakType === 'LOSS' ? 'perdante' : metrics.streaks.currentStreakType === 'BREAKEVEN' ? 'neutre' : '—'}`],
          ['Drawdown actuel', `${formatCurrency(metrics.drawdown.currentDrawdown, currency, { showSign: false })} · ${metrics.drawdown.currentDrawdownPercent.toFixed(1)}%`],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200/80 dark:border-[#292E38] bg-slate-50/60 dark:bg-[#181C25]/70 p-3.5"><div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</div><div className="text-sm font-bold text-slate-900 dark:text-white mt-2 tabular-nums">{value}</div></div>)}
      </div>
    </section>
  </>;
};
