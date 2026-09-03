import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import type { UserSettings } from '../../types/settings';
import { getTradeKillzone } from '../../lib/tradingKillzone';
import { formatCurrency } from '../../lib/formatting';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock3, Flame, Settings2, TrendingDown, TrendingUp, Trophy, Plus, Target } from 'lucide-react';
import type { MobilePageProps } from './types';

interface Props extends MobilePageProps { onLogTrade: () => void; }

type ClosedTrade = Trade & { netPnL: number };

const isClosed = (t: Trade): t is ClosedTrade => t.status === 'CLOSED' && typeof t.netPnL === 'number';
const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const monthLabel = (date: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

function money(value: number, currency: string) { return formatCurrency(value, currency, { showSign: true }); }
function signedPct(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }

function getCurrentKillzone() {
  const now = new Date();
  const minute = ((now.getUTCHours() * 60 + now.getUTCMinutes() - 300) % 1440 + 1440) % 1440;
  if (minute >= 120 && minute <= 301) return 'Killzone Londres';
  if (minute >= 600 && minute <= 721) return 'Killzone London Close';
  if (minute >= 420 && minute <= 601) return 'Killzone New York';
  return null;
}

export function DashboardMobile({ data, onLogTrade }: Props) {
  const trades = data.trades || [];
  const settings = data.settings as UserSettings;
  const currency = settings?.currency || 'USD';
  const initialBalance = settings?.initialAccountBalance || 10000;
  const closed = useMemo(() => trades.filter(isClosed).sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()), [trades]);
  const [selectedMonth, setSelectedMonth] = useState(() => closed.length ? new Date(closed[closed.length - 1].closedAt || closed[closed.length - 1].openedAt) : new Date());

  const metrics = useMemo(() => {
    const totalPnL = closed.reduce((sum, t) => sum + t.netPnL, 0);
    const wins = closed.filter(t => t.netPnL > 0).length;
    const grossProfit = closed.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0);
    const grossLoss = Math.abs(closed.filter(t => t.netPnL < 0).reduce((s, t) => s + t.netPnL, 0));
    let equity = initialBalance;
    let peak = initialBalance;
    let maxDrawdown = 0;
    let currentStreak = 0;
    let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
    for (const t of closed) {
      equity += t.netPnL;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
    for (let i = closed.length - 1; i >= 0; i--) {
      const type = closed[i].netPnL > 0 ? 'WIN' : closed[i].netPnL < 0 ? 'LOSS' : 'NONE';
      if (streakType === 'NONE') streakType = type;
      if (type !== streakType) break;
      if (type !== 'NONE') currentStreak++;
    }
    return { totalPnL, winRate: closed.length ? wins / closed.length * 100 : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, totalTrades: closed.length, maxDrawdown, currentStreak, streakType };
  }, [closed, initialBalance]);

  const equityPoints = useMemo(() => {
    let running = 0;
    return closed.map((t, index) => { running += t.netPnL; return { x: index, value: running }; });
  }, [closed]);

  const chart = useMemo(() => {
    if (!equityPoints.length) return null;
    const width = Math.max(520, equityPoints.length * 46);
    const height = 190;
    const pad = { left: 34, right: 16, top: 14, bottom: 24 };
    const values = [0, ...equityPoints.map(p => p.value)];
    const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
    const x = (i: number) => pad.left + (i / Math.max(1, equityPoints.length - 1)) * (width - pad.left - pad.right);
    const y = (v: number) => pad.top + (1 - (v - min) / range) * (height - pad.top - pad.bottom);
    const line = equityPoints.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ');
    return { width, height, pad, min, max, x, y, line };
  }, [equityPoints]);

  const selectedMonthData = useMemo(() => {
    const key = monthKey(selectedMonth);
    const monthTrades = closed.filter(t => monthKey(new Date(t.closedAt || t.openedAt)) === key);
    const pnl = monthTrades.reduce((s, t) => s + t.netPnL, 0);
    const wins = monthTrades.filter(t => t.netPnL > 0).length;
    return { trades: monthTrades, pnl, winRate: monthTrades.length ? wins / monthTrades.length * 100 : 0 };
  }, [closed, selectedMonth]);

  const monthStep = (delta: number) => setSelectedMonth(prev => new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + delta, 1)));
  const activeKillzone = getCurrentKillzone();

  const summaryItems = useMemo(() => {
    const best = (key: (t: ClosedTrade) => string) => {
      const groups = new Map<string, { pnl: number; count: number }>();
      closed.forEach(t => { const name = key(t); if (!name) return; const current = groups.get(name) || { pnl: 0, count: 0 }; current.pnl += t.netPnL; current.count++; groups.set(name, current); });
      return [...groups.entries()].sort((a, b) => b[1].pnl - a[1].pnl || b[1].count - a[1].count)[0];
    };
    const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const pair = best(t => t.symbol.toUpperCase().trim());
    const killzone = best(t => String(getTradeKillzone(t) || ''));
    const day = best(t => { const d = new Date(t.closedAt || t.openedAt); return Number.isNaN(d.getTime()) ? '' : weekdays[d.getUTCDay()]; });
    return [
      { label: 'Meilleure paire', value: pair ? `${pair[0]} · ${money(pair[1].pnl, currency)}` : '—', icon: Trophy },
      { label: 'Meilleure Killzone', value: killzone ? `${killzone[0]} · ${money(killzone[1].pnl, currency)}` : '—', icon: Clock3 },
      { label: 'Meilleur jour', value: day ? `${day[0]} · ${money(day[1].pnl, currency)}` : '—', icon: CalendarDays },
      { label: 'Série actuelle', value: metrics.currentStreak ? `${metrics.currentStreak} ${metrics.streakType === 'WIN' ? 'gagnante' : 'perdante'}` : 'Aucune', icon: Flame },
      { label: 'Drawdown actuel', value: `${money(metrics.maxDrawdown, currency)} · ${signedPct(initialBalance ? metrics.maxDrawdown / initialBalance * 100 : 0)}`, icon: TrendingDown },
    ];
  }, [closed, currency, metrics, initialBalance]);

  return (
    <div data-mobile-ui className="mobile-dashboard min-h-full overflow-x-hidden bg-slate-50 dark:bg-[#0B0D12] text-slate-900 dark:text-white pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-[#292E38] bg-slate-50/95 dark:bg-[#0B0D12]/95 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0"><div className="w-7 h-7 rounded-lg bg-violet-600 text-white grid place-items-center text-[10px] font-black shrink-0">ME</div><span className="font-extrabold text-sm truncate">My Edge</span></div>
          <div className="flex items-center gap-2 shrink-0">
            {activeKillzone && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 max-w-[145px] truncate"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />{activeKillzone}</span>}
            <button aria-label="Paramètres" className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#292E38] grid place-items-center bg-white dark:bg-[#12151D] shrink-0"><Settings2 className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-xl mx-auto min-w-0">
        <section className="rounded-3xl border border-violet-200/70 dark:border-violet-500/20 bg-white dark:bg-[#12151D] p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-500">Performance globale</p><p className="text-xs text-slate-400 mt-1">Capital · {currency}</p></div><Target className="w-4 h-4 text-violet-500 shrink-0" /></div>
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="min-w-0"><p className="text-[11px] text-slate-500">Total P&amp;L</p><p className={`mt-1 text-3xl font-black tracking-tight tabular-nums truncate ${metrics.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{money(metrics.totalPnL, currency)}</p></div>
            <div className="min-w-0"><p className="text-[11px] text-slate-500">Win Rate</p><p className="mt-1 text-3xl font-black tracking-tight tabular-nums truncate">{metrics.winRate.toFixed(1)}%</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#181C25] p-3 min-w-0"><p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Profit Factor</p><p className="mt-1 text-base font-bold tabular-nums truncate">{Number.isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}</p></div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#181C25] p-3 min-w-0"><p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Trades</p><p className="mt-1 text-base font-bold tabular-nums truncate">{metrics.totalTrades}</p></div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3"><div className="flex items-center gap-2 min-w-0"><TrendingUp className="w-4 h-4 text-violet-500 shrink-0" /><div className="min-w-0"><h2 className="text-sm font-bold truncate">Equity Curve</h2><p className="text-[10px] text-slate-500">Historique · glissez horizontalement</p></div></div><span className="text-[9px] font-bold text-slate-400 shrink-0">{closed.length} trades</span></div>
          {chart ? <div className="overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain rounded-2xl" onTouchStart={e => e.stopPropagation()}><svg width={chart.width} height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} className="block max-w-none" role="img" aria-label="Courbe d'équité"><line x1={chart.pad.left} y1={chart.y(0)} x2={chart.width - chart.pad.right} y2={chart.y(0)} stroke="currentColor" className="text-slate-200 dark:text-[#292E38]" /><path d={chart.line} fill="none" stroke="currentColor" className="text-violet-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><text x={4} y={chart.y(chart.max) + 4} className="fill-slate-400 text-[9px]">{Math.round(chart.max)}</text><text x={4} y={chart.y(chart.min) + 4} className="fill-slate-400 text-[9px]">{Math.round(chart.min)}</text></svg></div> : <div className="h-44 grid place-items-center text-xs text-slate-400 text-center px-6">Aucun trade clôturé pour tracer la courbe.</div>}
        </section>

        <section className="rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mois de trading</p><h2 className="text-base font-bold capitalize truncate mt-1">{monthLabel(selectedMonth)}</h2></div><div className="flex gap-1 shrink-0"><button onClick={() => monthStep(-1)} aria-label="Mois précédent" className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#292E38] grid place-items-center"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => monthStep(1)} aria-label="Mois suivant" className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#292E38] grid place-items-center"><ChevronRight className="w-4 h-4" /></button></div></div>
          <div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-2xl bg-slate-50 dark:bg-[#181C25] p-3 min-w-0"><p className="text-[9px] text-slate-500 uppercase font-bold">P&amp;L</p><p className={`mt-1 text-sm font-black truncate ${selectedMonthData.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{money(selectedMonthData.pnl, currency)}</p></div><div className="rounded-2xl bg-slate-50 dark:bg-[#181C25] p-3 min-w-0"><p className="text-[9px] text-slate-500 uppercase font-bold">Win Rate</p><p className="mt-1 text-sm font-black truncate">{selectedMonthData.winRate.toFixed(1)}%</p></div><div className="rounded-2xl bg-slate-50 dark:bg-[#181C25] p-3 min-w-0"><p className="text-[9px] text-slate-500 uppercase font-bold">Trades</p><p className="mt-1 text-sm font-black truncate">{selectedMonthData.trades.length}</p></div></div>
        </section>

        <section className="rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] p-4 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-violet-500" /><div><h2 className="text-sm font-bold">Résumé de la statistique</h2><p className="text-[10px] text-slate-500">Les tendances les plus utiles</p></div></div>
          <div className="divide-y divide-slate-100 dark:divide-[#292E38]">{summaryItems.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 py-3 min-w-0"><div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></div><div className="min-w-0 flex-1"><p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold truncate">{label}</p><p className="text-sm font-bold mt-0.5 truncate" title={value}>{value}</p></div></div>)}</div>
        </section>
      </main>

      <button onClick={onLogTrade} className="fixed z-30 bottom-[calc(74px+env(safe-area-inset-bottom))] right-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-3.5 shadow-xl shadow-violet-900/20 flex items-center gap-2 font-bold text-xs active:scale-[.98] transition-transform" aria-label="Log New Trade"><Plus className="w-4 h-4" /> Log New Trade</button>
    </div>
  );
}
