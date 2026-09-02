import React, { useState, useMemo } from 'react';
import { Trade } from '../types/trade';
import {
  buildMonthCalendar,
  getAllTradingMonths,
  MonthTradeStats,
  DayTradeStats,
} from '../lib/calendar';
import { formatCurrency, formatPercent } from '../lib/formatting';
import { DayDetailsModal } from './DayDetailsModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  trades: Trade[];
  currency?: string;
  onSelectTrade: (trade: Trade) => void;
  onSeed?: () => void;
  initialYear?: number;
  initialMonth?: number; // 0-11
}

export const CalendarView: React.FC<Props> = ({
  trades = [],
  currency = 'EUR',
  onSelectTrade,
  onSeed,
  initialYear,
  initialMonth,
}) => {
  // Determine initial date: either passed props, or latest trade date, or current date
  const defaultDate = useMemo(() => {
    if (initialYear !== undefined && initialMonth !== undefined) {
      return { year: initialYear, month: initialMonth };
    }
    if (trades.length > 0) {
      // Find the most recent trade's year and month
      for (const t of trades) {
        const dStr = t.closedAt || t.openedAt;
        if (dStr) {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
          }
        }
      }
    }
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }, [trades, initialYear, initialMonth]);

  const [currentYear, setCurrentYear] = useState<number>(defaultDate.year);
  const [currentMonth, setCurrentMonth] = useState<number>(defaultDate.month);
  const [selectedDayStats, setSelectedDayStats] = useState<DayTradeStats | null>(null);

  // Available trading months list for quick jump
  const allTradingMonths = useMemo(() => getAllTradingMonths(trades), [trades]);

  // Build calendar matrix for currently viewed month
  const monthData: MonthTradeStats = useMemo(
    () => buildMonthCalendar(currentYear, currentMonth, trades),
    [currentYear, currentMonth, trades]
  );

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getUTCFullYear());
    setCurrentMonth(now.getUTCMonth());
  };

  const dayHeaders = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  return (
    <div id="trading-calendar-view" className="space-y-6 font-sans">
      {/* Month Navigation & Summary Toolbar */}
      <div className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Month selector controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] transition cursor-pointer"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3.5 text-xs sm:text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5] min-w-[130px] text-center capitalize">
              {monthData.monthLabel}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] transition cursor-pointer"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 text-xs font-bold rounded-2xl bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] text-[#0F0E26] dark:text-[#F5F5F5] border border-[#ECE7FC] dark:border-[#292E38] transition cursor-pointer shadow-xs"
          >
            Aujourd'hui
          </button>

          {/* Jump to active month dropdown */}
          {allTradingMonths.length > 1 && (
            <select
              value={`${currentYear}-${currentMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setCurrentYear(y);
                setCurrentMonth(m);
              }}
              className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] text-[#0F0E26] dark:text-[#F5F5F5] rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#6D19E8] dark:focus:ring-[#FF8A00] cursor-pointer hidden sm:block shadow-xs"
            >
              {allTradingMonths.map((m) => (
                <option key={m.monthKey} value={`${m.year}-${m.month}`}>
                  {m.monthLabel} ({m.totalTrades} trades)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Key Month KPI Summary Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Monthly PnL */}
          <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl px-4 py-2 shadow-xs">
            <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block font-bold uppercase tracking-wider">
              P&amp;L Mois
            </span>
            <span
              className={`text-sm sm:text-base font-bold tabular-nums ${
                monthData.netPnL > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : monthData.netPnL < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#0F0E26] dark:text-[#F5F5F5]'
              }`}
            >
              {formatCurrency(monthData.netPnL, currency, { showSign: true })}
            </span>
          </div>

          {/* Total Trades */}
          <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl px-4 py-2 shadow-xs">
            <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block font-bold uppercase tracking-wider">
              Trades
            </span>
            <span className="text-sm sm:text-base font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5]">
              {monthData.totalTrades}
            </span>
          </div>

          {/* Win Rate */}
          <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl px-4 py-2 shadow-xs">
            <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block font-bold uppercase tracking-wider">
              Win Rate
            </span>
            <span className="text-sm sm:text-base font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5]">
              {formatPercent(monthData.winRate, 1)}
            </span>
          </div>

          {/* Days breakdown */}
          <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl px-4 py-2 hidden lg:block shadow-xs">
            <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block font-bold uppercase tracking-wider">
              Jours W / L
            </span>
            <span className="text-sm sm:text-base font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{monthData.winningDaysCount}W</span>
              <span className="text-[#8E89AF] dark:text-[#9299A8] mx-1">-</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">{monthData.losingDaysCount}L</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Structure (7 Days Columns + 8th Weekly Summary Column) */}
      <div className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Table / Grid Headers */}
        <div className="grid grid-cols-8 bg-[#FAF8FF] dark:bg-[#0B0D12] border-b border-[#ECE7FC] dark:border-[#292E38] text-center py-3.5 text-[11px] font-bold tracking-wider text-[#6B668D] dark:text-[#9299A8]">
          {dayHeaders.map((dh) => (
            <div key={dh} className="py-1">
              {dh}
            </div>
          ))}
          <div className="py-1 text-[#6D19E8] dark:text-[#FF8A00] font-bold border-l border-[#ECE7FC] dark:border-[#292E38]">
            SEMAINE
          </div>
        </div>

        {/* Weekly Rows */}
        <div className="divide-y divide-[#ECE7FC] dark:divide-[#292E38]">
          {monthData.weeks.map((week, wIdx) => {
            return (
              <div key={wIdx} className="grid grid-cols-8 min-h-[110px] sm:min-h-[125px]">
                {/* 7 Days of the Week */}
                {week.days.map((day, dIdx) => {
                  const hasTrades = day.tradeCount > 0;
                  const isPositive = day.netPnL > 0;
                  const isNegative = day.netPnL < 0;

                  return (
                    <div
                      key={dIdx}
                      onClick={() => {
                        if (hasTrades) {
                          setSelectedDayStats(day);
                        }
                      }}
                      className={`relative p-2.5 sm:p-3 flex flex-col justify-between border-r border-[#ECE7FC] dark:border-[#292E38] transition-all duration-150 select-none ${
                        !day.isCurrentMonth
                          ? 'opacity-30 bg-[#FAF8FF]/40 dark:bg-[#0B0D12]/40'
                          : hasTrades
                          ? isPositive
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/25 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/40 cursor-pointer group shadow-inner'
                            : isNegative
                            ? 'bg-rose-50/70 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40 cursor-pointer group shadow-inner'
                            : 'bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] cursor-pointer group'
                          : 'bg-transparent hover:bg-[#FAF8FF]/70 dark:hover:bg-[#181C25]/40'
                      }`}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            day.isCurrentMonth
                              ? 'text-[#0F0E26] dark:text-[#F5F5F5]'
                              : 'text-[#8E89AF] dark:text-[#9299A8]/40'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {hasTrades && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isPositive
                                ? 'bg-emerald-500'
                                : isNegative
                                ? 'bg-rose-500'
                                : 'bg-[#6D19E8] dark:bg-[#FF8A00]'
                            }`}
                          />
                        )}
                      </div>

                      {/* Day P&L & Trades count */}
                      {hasTrades ? (
                        <div className="my-auto py-1 text-center">
                          <div
                            className={`text-xs sm:text-sm lg:text-base font-bold tabular-nums tracking-tight leading-tight ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isNegative
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[#6B668D] dark:text-[#9299A8]'
                            }`}
                          >
                            {formatCurrency(day.netPnL, currency, { showSign: true })}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-medium text-[#6B668D] dark:text-[#9299A8] mt-0.5">
                            {day.tradeCount} {day.tradeCount > 1 ? 'trades' : 'trade'}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1" />
                      )}

                      {/* Bottom indicator spacer */}
                      <div className="h-1" />
                    </div>
                  );
                })}

                {/* 8th Column: Weekly Recap */}
                <div className="p-3 bg-[#FAF8FF]/90 dark:bg-[#181C25]/80 border-l border-[#ECE7FC] dark:border-[#292E38] flex flex-col justify-center text-center">
                  {week.totalTrades > 0 ? (
                    <div className="space-y-1.5">
                      {/* Weekly Net PnL */}
                      <div
                        className={`text-xs sm:text-sm font-bold tabular-nums tracking-tight ${
                          week.netPnL > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : week.netPnL < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[#6B668D] dark:text-[#9299A8]'
                        }`}
                      >
                        {formatCurrency(week.netPnL, currency, { showSign: true })}
                      </div>

                      {/* Trade count */}
                      <div className="text-[10px] text-[#6B668D] dark:text-[#9299A8] font-medium">
                        {week.totalTrades} {week.totalTrades > 1 ? 'trades' : 'trade'}
                      </div>

                      {/* Winrate bar */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[9px] text-[#8E89AF] dark:text-[#9299A8] mb-0.5 font-bold">
                          <span>Winrate</span>
                          <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">{week.winRate}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#ECE7FC] dark:bg-[#292E38] rounded-full overflow-hidden flex">
                          <div
                            className="bg-[#6D19E8] dark:bg-[#FF8A00] h-full transition-all duration-300"
                            style={{ width: `${week.winRate}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full transition-all duration-300"
                            style={{ width: `${100 - week.winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#8E89AF] dark:text-[#9299A8] font-mono">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State when zero trades in this month */}
      {monthData.totalTrades === 0 && (
        <div className="bg-white dark:bg-[#12151D] border border-dashed border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#FAF8FF] dark:bg-[#181C25] flex items-center justify-center mx-auto text-[#8E89AF] dark:text-[#9299A8] mb-3">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#0F0E26] dark:text-[#F5F5F5]">
            Aucun trade enregistré en {monthData.monthLabel}
          </h3>
          <p className="text-xs text-[#6B668D] dark:text-[#9299A8] max-w-sm mx-auto mt-1">
            Naviguez vers les mois précédents/suivants ou chargez les données de démonstration pour visualiser les performances journalières.
          </p>
          {onSeed && trades.length === 0 && (
            <button
              onClick={onSeed}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-2xl bg-[#6D19E8] dark:bg-[#FF8A00] hover:bg-[#5A14C4] dark:hover:bg-[#E67600] text-white transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Charger les données de test</span>
            </button>
          )}
        </div>
      )}

      {/* Day Details Modal */}
      <DayDetailsModal
        dayStats={selectedDayStats}
        currency={currency}
        onClose={() => setSelectedDayStats(null)}
        onSelectTrade={onSelectTrade}
      />
    </div>
  );
};
