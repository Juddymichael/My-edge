import React from 'react';
import { Trade } from '../types/trade';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { formatCurrency, formatRMultiple, formatPercent, formatDecimal } from '../lib/formatting';
import { Calculator } from 'lucide-react';

interface Props {
  trades?: Trade[];
}

export const CalculationVerificationPanel: React.FC<Props> = ({ trades = [] }) => {
  const safeTrades = trades || [];
  const metrics = calculateComprehensiveMetrics(safeTrades, 10000);

  return (
    <div
      id="calculation-verification-panel"
      className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Calculation Engine Verification
            </h2>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              Live mathematical evaluation on current records • Strict null safety • Zero floating-point drift
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Net P&L */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium block">
            TOTAL NET P&L
          </span>
          <p
            className={`text-lg font-semibold tabular-nums mt-1 ${
              metrics.netPnLSum > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : metrics.netPnLSum < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {formatCurrency(metrics.netPnLSum, 'EUR')}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            Gross: {formatCurrency(metrics.grossPnLSum, 'EUR', { showSign: false })}
          </span>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500">
            <span className="uppercase tracking-wider">WIN RATE</span>
            <span className="text-[10px] font-normal text-slate-400">(Closed)</span>
          </div>
          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
            {formatPercent(metrics.winRate.winRate, 1)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            {metrics.winRate.wins}W • {metrics.winRate.losses}L • {metrics.winRate.breakeven}BE
          </span>
        </div>

        {/* Profit Factor */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium block">
            PROFIT FACTOR
          </span>
          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.profitFactor.profitFactor === Infinity
              ? '∞ (No Loss)'
              : formatDecimal(metrics.profitFactor.profitFactor, 2)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            {formatCurrency(metrics.profitFactor.grossProfit, 'EUR', { showSign: false })} / {formatCurrency(metrics.profitFactor.grossLoss, 'EUR', { showSign: false })}
          </span>
        </div>

        {/* Expectancy */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium block">
            R EXPECTANCY
          </span>
          <p
            className={`text-lg font-semibold tabular-nums mt-1 ${
              metrics.expectancy.rExpectancy && metrics.expectancy.rExpectancy > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : metrics.expectancy.rExpectancy && metrics.expectancy.rExpectancy < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {formatRMultiple(metrics.expectancy.rExpectancy)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            {metrics.expectancy.validRTradesCount} trades with R
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium block">
            MAX DRAWDOWN
          </span>
          <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(metrics.drawdown.maxDrawdown, 'EUR', { showSign: false })}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            {metrics.drawdown.maxDrawdownPercent.toFixed(1)}% peak drop
          </span>
        </div>

        {/* Streaks */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium block">
            STREAKS (WIN/LOSS)
          </span>
          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics.streaks.maxConsecutiveWins}W</span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{metrics.streaks.maxConsecutiveLosses}L</span>
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
            Current: {metrics.streaks.currentStreakCount} {metrics.streaks.currentStreakType}
          </span>
        </div>
      </div>
    </div>
  );
};

