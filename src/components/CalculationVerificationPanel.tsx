import React from 'react';
import { BarChart3, Calculator, TrendingUp, Target, Zap } from 'lucide-react';
import { Trade } from '../types/trade';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { formatCurrency, formatPercent, formatDecimal } from '../lib/formatting';
import { UserSettings } from '../types/settings';

interface Props { trades?: Trade[]; settings?: UserSettings; }

export const CalculationVerificationPanel: React.FC<Props> = ({ trades = [], settings }) => {
  const safeTrades = trades || [];
  const currency = settings?.currency || 'EUR';
  const metrics = calculateComprehensiveMetrics(safeTrades, settings?.initialAccountBalance || 10000);
  const cards = [
    { label: 'TOTAL P&L', value: formatCurrency(metrics.netPnLSum, currency), tone: metrics.netPnLSum >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: TrendingUp },
    { label: 'WIN RATE', value: formatPercent(metrics.winRate.winRate, 1), tone: 'text-white', icon: Target },
    { label: 'PROFIT FACTOR', value: metrics.profitFactor.profitFactor === Infinity ? '∞' : formatDecimal(metrics.profitFactor.profitFactor, 2), tone: metrics.profitFactor.profitFactor !== null && metrics.profitFactor.profitFactor >= 1 ? 'text-emerald-400' : 'text-rose-400', icon: Zap },
    { label: 'TOTAL TRADES', value: String(metrics.totalTrades), tone: 'text-white', icon: BarChart3 },
  ];
  return <section id="dashboard-key-metrics" className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-5 shadow-sm">
    <div className="flex items-center gap-2.5 pb-3 border-b border-[#ECE7FC] dark:border-[#292E38] mb-4">
      <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400"><Calculator className="w-4 h-4" /></div>
      <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Métriques clés</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Calculées localement à partir de vos données</p></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(({ label, value, tone, icon: Icon }) => <div key={label} className="bg-slate-50/80 dark:bg-[#181C25] border border-slate-200/80 dark:border-[#292E38] rounded-2xl p-4"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span><Icon className="w-4 h-4 text-violet-400" /></div><p className={`text-xl font-black tabular-nums mt-2 ${tone}`}>{value}</p></div>)}</div>
  </section>;
};
