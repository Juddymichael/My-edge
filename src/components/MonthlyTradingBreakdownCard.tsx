import React, { useState, useMemo } from 'react';
import { Trade } from '../types/trade';
import { getAllTradingMonths, MonthTradeStats } from '../lib/calendar';
import { formatCurrency, formatPercent } from '../lib/formatting';
import { MonthDetailsModal } from './MonthDetailsModal';
import {
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  trades?: Trade[];
  currency?: string;
  onSelectTrade: (trade: Trade) => void;
  onNavigateToCalendar?: (year: number, month: number) => void;
}

export const MonthlyTradingBreakdownCard: React.FC<Props> = ({
  trades = [],
  currency = 'EUR',
  onSelectTrade,
  onNavigateToCalendar,
}) => {
  const [selectedMonthStats, setSelectedMonthStats] = useState<MonthTradeStats | null>(null);

  const monthsStats = useMemo(() => getAllTradingMonths(trades), [trades]);

  const totalAllTimePnL = useMemo(() => {
    return trades
      .filter((t) => t && t.status === 'CLOSED')
      .reduce((acc, t) => acc + (t.netPnL ?? 0), 0);
  }, [trades]);

  return (
    <div
      id="monthly-trading-breakdown-card"
      className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE7FC] dark:border-[#292E38] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 border border-[#DDD5FA] dark:border-[#FF8A00]/30 flex items-center justify-center text-[#6D19E8] dark:text-[#FF8A00] shadow-xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                Mois de Trading &amp; Performance
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30">
                {monthsStats.length} {monthsStats.length > 1 ? 'MOIS ACTIFS' : 'MOIS ACTIF'}
              </span>
            </div>
            <p className="text-xs font-medium text-[#6B668D] dark:text-[#9299A8] mt-0.5">
              Historique mensuel consolidé • Cliquez sur un mois pour inspecter les statistiques détaillées
            </p>
          </div>
        </div>

        {/* Global P&L summary pill */}
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E89AF] dark:text-[#9299A8] block">
            P&amp;L CUMULÉ
          </span>
          <div className="text-lg sm:text-xl font-bold tabular-nums">
            <AnimatedNumber
              value={totalAllTimePnL}
              format={(val) => formatCurrency(val, currency, { showSign: true })}
              colorizeSigned={true}
              duration={900}
            />
          </div>
        </div>
      </div>

      {/* Months Grid */}
      {trades.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#8E89AF] dark:text-[#9299A8]">
          Aucun trade enregistré pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {monthsStats.map((m) => {
            const isPositive = m.netPnL > 0;
            const isNegative = m.netPnL < 0;

            return (
              <motion.div
                key={m.monthKey}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMonthStats(m)}
                className={`relative rounded-2xl p-4.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between group interactive-card ${
                  isPositive
                    ? 'bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-emerald-50/50 dark:hover:bg-[#1F2430] border-[#ECE7FC] dark:border-[#292E38] hover:border-emerald-500/40 shadow-xs hover:shadow-md hover:shadow-emerald-500/5'
                    : isNegative
                    ? 'bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-rose-50/50 dark:hover:bg-[#1F2430] border-[#ECE7FC] dark:border-[#292E38] hover:border-rose-500/40 shadow-xs hover:shadow-md hover:shadow-rose-500/5'
                    : 'bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] border-[#ECE7FC] dark:border-[#292E38] shadow-xs'
                }`}
              >
                {/* Card Top: Month Name & Net PnL */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5] capitalize">
                        {m.monthLabel}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors duration-300 ${
                          isPositive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : isNegative
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-slate-100 dark:bg-[#292E38] text-slate-500 dark:text-[#9299A8]'
                        }`}
                      >
                        {isPositive ? 'PROFITABLE' : isNegative ? 'DÉFICIT' : 'NEUTRE'}
                      </span>
                    </div>

                    <div className="p-1 rounded-lg text-[#8E89AF] dark:text-[#9299A8] group-hover:text-[#6D19E8] dark:group-hover:text-[#FF8A00] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Large P&L */}
                  <div className="text-xl font-bold tabular-nums">
                    <AnimatedNumber
                      value={m.netPnL}
                      format={(val) => formatCurrency(val, currency, { showSign: true })}
                      colorizeSigned={true}
                      duration={800}
                    />
                  </div>
                </div>

                {/* Card Bottom: Trades & Win Rate */}
                <div className="mt-4 pt-3 border-t border-[#ECE7FC] dark:border-[#292E38] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#6B668D] dark:text-[#9299A8]">
                    <span>Trades exécutés</span>
                    <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5] tabular-nums">
                      <AnimatedNumber value={m.totalTrades} duration={600} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#6B668D] dark:text-[#9299A8]">
                    <span>Win Rate</span>
                    <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5] tabular-nums">
                      <AnimatedNumber
                        value={m.winRate}
                        format={(val) => formatPercent(val, 1)}
                        duration={800}
                      />
                    </span>
                  </div>

                  {/* Mini Win Rate Bar with Animated Fill */}
                  <div className="h-2 w-full bg-[#ECE7FC] dark:bg-[#292E38] rounded-full overflow-hidden flex">
                    <motion.div
                      className="bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, m.winRate))}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  {/* Best / Worst Day hint */}
                  <div className="flex items-center justify-between text-[11px] text-[#8E89AF] dark:text-[#9299A8] pt-1 font-medium">
                    <span>
                      Jours: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{m.winningDaysCount}W</strong> /{' '}
                      <strong className="text-rose-600 dark:text-rose-400 font-bold">{m.losingDaysCount}L</strong>
                    </span>
                    {onNavigateToCalendar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToCalendar(m.year, m.month);
                        }}
                        className="text-[#6D19E8] dark:text-[#FF8A00] font-bold flex items-center gap-1 cursor-pointer animated-underline group/link"
                      >
                        <span>Calendrier</span>
                        <ChevronRight className="w-3 h-3 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Month Details Modal */}
      <MonthDetailsModal
        monthStats={selectedMonthStats}
        currency={currency}
        onClose={() => setSelectedMonthStats(null)}
        onSelectTrade={onSelectTrade}
        onOpenCalendarMonth={onNavigateToCalendar}
      />
    </div>
  );
};
