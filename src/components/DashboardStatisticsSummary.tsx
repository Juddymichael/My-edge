import React, { useMemo } from 'react';
import { BarChart3, Trophy, Clock3, CalendarDays, TrendingDown, Flame } from 'lucide-react';
import { Trade } from '../types/trade';
import { UserSettings } from '../types/settings';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { formatCurrency } from '../lib/formatting';
import { getTradeKillzone } from '../lib/tradingKillzone';

interface Props { trades?: Trade[]; settings: UserSettings; }

function bestDimension(trades: Trade[], key: (trade: Trade) => string) {
  const groups = new Map<string, { pnl: number; count: number }>();
  trades.filter(t => t.status === 'CLOSED' && typeof t.netPnL === 'number').forEach(t => {
    const name = key(t); if (!name) return;
    const item = groups.get(name) || { pnl: 0, count: 0 }; item.pnl += t.netPnL || 0; item.count += 1; groups.set(name, item);
  });
  return [...groups.entries()].sort((a, b) => b[1].pnl - a[1].pnl || b[1].count - a[1].count)[0] || null;
}

export const DashboardStatisticsSummary: React.FC<Props> = ({ trades = [], settings }) => {
  const safeTrades = trades || [];
  const currency = settings.currency || 'EUR';
  const metrics = calculateComprehensiveMetrics(safeTrades, settings.initialAccountBalance || 10000);
  const data = useMemo(() => {
    const closed = safeTrades.filter(t => t.status === 'CLOSED' && typeof t.netPnL === 'number');
    const pair = bestDimension(closed, t => (t.symbol || '').toUpperCase().trim());
    const killzone = bestDimension(closed, t => getTradeKillzone(t));
    const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const day = bestDimension(closed, t => { const d = new Date(t.closedAt || t.openedAt); return Number.isNaN(d.getTime()) ? '' : weekdays[d.getUTCDay()]; });
    return { pair, session, day };
  }, [safeTrades]);

  const items = [
    { label: 'Meilleure paire', value: data.pair ? `${data.pair[0]} · ${formatCurrency(data.pair[1].pnl, currency)}` : '—', icon: Trophy },
    { label: 'Meilleure session', value: data.session ? `${data.session[0]} · ${formatCurrency(data.session[1].pnl, currency)}` : '—', icon: Clock3 },
    { label: 'Meilleur jour', value: data.day ? `${data.day[0]} · ${formatCurrency(data.day[1].pnl, currency)}` : '—', icon: CalendarDays },
    { label: 'Série actuelle', value: metrics.streaks.currentStreakCount > 0 ? `${metrics.streaks.currentStreakCount} ${metrics.streaks.currentStreakType === 'WIN' ? 'gagnante' : metrics.streaks.currentStreakType === 'LOSS' ? 'perdante' : 'neutre'}` : 'Aucune', icon: Flame },
    { label: 'Drawdown actuel', value: `${formatCurrency(metrics.drawdown.currentDrawdown, currency, { showSign: false })} · ${metrics.drawdown.currentDrawdownPercent.toFixed(1)}%`, icon: TrendingDown },
  ];

  return <section id="dashboard-statistics-summary" className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Résumé de la statistique</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Synthèse locale — aucun appel Gemini</p></div><BarChart3 className="w-4 h-4 text-violet-400" /></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{items.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-slate-200/80 dark:border-[#292E38] bg-slate-50/60 dark:bg-[#181C25]/70 p-3.5"><div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-violet-400"/><div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</div></div><div className="text-sm font-bold text-slate-900 dark:text-white mt-2 tabular-nums">{value}</div></div>)}</div>
  </section>;
};
