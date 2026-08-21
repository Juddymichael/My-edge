import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trade, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  X, 
  Pencil
} from 'lucide-react';

interface CalendarViewProps {
  trades: Trade[];
  settings: UserAppSettings;
  onSelectTrade: (trade: Trade) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  trades,
  settings,
  onSelectTrade,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (trades.length > 0) {
      const sorted = [...trades]
        .filter(t => t.date && !isNaN(new Date(t.date).getTime()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted.length > 0) {
        const [y, m, d] = sorted[0].date.split('-').map(Number);
        if (y && m && d) return new Date(y, m - 1, d);
      }
    }
    return new Date();
  });

  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Semaine'];

  // Helper for YYYY-MM-DD in local time
  const formatLocalYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map trades by YYYY-MM-DD
  const tradesByDateMap = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      if (!t.date) return;
      const list = map.get(t.date) || [];
      list.push(t);
      map.set(t.date, list);
    });
    return map;
  }, [trades]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1; // Mon = 0
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sun = 6

    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      trades: Trade[];
      netPnL: number;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, pDay);
      const ds = formatLocalYYYYMMDD(prevDate);
      days.push({
        dateString: ds,
        dayNumber: pDay,
        isCurrentMonth: false,
        trades: [],
        netPnL: 0,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const ds = `${year}-${monthStr}-${dayStr}`;

      const dayTrades = tradesByDateMap.get(ds) || [];
      const netPnL = dayTrades.reduce((acc, t) => acc + (t.netPnL || 0), 0);

      days.push({
        dateString: ds,
        dayNumber: d,
        isCurrentMonth: true,
        trades: dayTrades,
        netPnL: Number(netPnL.toFixed(2)),
      });
    }

    // Next month padding days to complete grid
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let n = 1; n <= remainingSlots; n++) {
      const nextDate = new Date(year, month + 1, n);
      const ds = formatLocalYYYYMMDD(nextDate);
      days.push({
        dateString: ds,
        dayNumber: n,
        isCurrentMonth: false,
        trades: [],
        netPnL: 0,
      });
    }

    return days;
  }, [year, month, tradesByDateMap]);

  // Group days into weeks of 7
  const weeks = useMemo(() => {
    const result: Array<{
      days: typeof calendarDays;
      totalPnL: number;
      totalTrades: number;
      winrate: number;
      winningTrades: number;
    }> = [];

    for (let i = 0; i < calendarDays.length; i += 7) {
      const weekDays = calendarDays.slice(i, i + 7);

      let totalPnL = 0;
      let totalTrades = 0;
      let winningTrades = 0;

      weekDays.forEach((d) => {
        if (d.isCurrentMonth && d.trades.length > 0) {
          totalPnL += d.netPnL;
          totalTrades += d.trades.length;
          winningTrades += d.trades.filter((t) => t.netPnL > 0).length;
        }
      });

      const winrate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

      result.push({
        days: weekDays,
        totalPnL: Number(totalPnL.toFixed(2)),
        totalTrades,
        winrate,
        winningTrades,
      });
    }

    return result;
  }, [calendarDays]);

  // Monthly summary metrics
  const monthlySummary = useMemo(() => {
    let winDays = 0;
    let lossDays = 0;
    let beDays = 0;
    let totalPnL = 0;
    let totalTrades = 0;
    let winningTradesCount = 0;

    calendarDays.forEach((d) => {
      if (d.isCurrentMonth && d.trades.length > 0) {
        totalTrades += d.trades.length;
        totalPnL += d.netPnL;
        winningTradesCount += d.trades.filter((t) => t.netPnL > 0).length;

        if (d.netPnL > 0) winDays++;
        else if (d.netPnL < 0) lossDays++;
        else beDays++;
      }
    });

    const monthWinrate = totalTrades > 0 ? Math.round((winningTradesCount / totalTrades) * 100) : 0;

    return { winDays, lossDays, beDays, totalPnL, totalTrades, monthWinrate };
  }, [calendarDays]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDayString) return null;
    return calendarDays.find((d) => d.dateString === selectedDayString);
  }, [selectedDayString, calendarDays]);

  // Calculate stats for the selected day modal/drawer
  const dayStats = useMemo(() => {
    if (!selectedDayData || selectedDayData.trades.length === 0) return null;

    const dayTrades = selectedDayData.trades;
    const totalPnL = selectedDayData.netPnL;
    const tradesCount = dayTrades.length;

    const winningTrades = dayTrades.filter((t) => t.netPnL > 0);
    const losingTrades = dayTrades.filter((t) => t.netPnL < 0);
    const beTrades = dayTrades.filter((t) => t.netPnL === 0);

    const winRate = tradesCount > 0 ? (winningTrades.length / tradesCount) * 100 : 0;
    const avgPnL = tradesCount > 0 ? totalPnL / tradesCount : 0;

    const grossProfit = winningTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.netPnL, 0));

    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

    const profitLossRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A';

    const bestTrade = Math.max(...dayTrades.map((t) => t.netPnL));
    const worstTrade = Math.min(...dayTrades.map((t) => t.netPnL));

    const [yStr, mStr, dStr] = selectedDayData.dateString.split('-');
    const dNum = parseInt(dStr, 10);
    const mIndex = parseInt(mStr, 10) - 1;
    const dateFormatted = `Journée du ${dNum} ${monthNames[mIndex].toLowerCase()} ${yStr}`;

    return {
      dateFormatted,
      totalPnL,
      tradesCount,
      winRate: winRate.toFixed(1),
      avgPnL,
      winningCount: winningTrades.length,
      losingCount: losingTrades.length,
      beCount: beTrades.length,
      winningPercent: Math.round((winningTrades.length / tradesCount) * 100),
      losingPercent: Math.round((losingTrades.length / tradesCount) * 100),
      bePercent: Math.round((beTrades.length / tradesCount) * 100),
      avgWin,
      avgLoss,
      profitLossRatio,
      bestTrade,
      worstTrade,
      dayTrades,
    };
  }, [selectedDayData, monthNames]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-5 max-w-[1600px] mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      {/* 1. Top Header Toolbar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b ${theme.tableBorder}`}>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${theme.textPrimary}`}>
            <CalendarIcon className="w-5 h-5 text-slate-400" />
            <span>Calendrier PnL</span>
          </h1>
          <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
            Performances journalières et hebdomadaires
          </p>
        </div>

        {/* Monthly Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border ${theme.cardBg}`}>
            <span className={`text-[11px] font-sans ${theme.textMuted}`}>PnL Mois:</span>
            <strong className={`font-bold ${monthlySummary.totalPnL >= 0 ? theme.winText : theme.lossText}`}>
              {monthlySummary.totalPnL >= 0 ? '+' : ''}{settings.currencySymbol}{monthlySummary.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${theme.winBadge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{monthlySummary.winDays} Gains</span>
          </div>

          <div className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${theme.lossBadge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>{monthlySummary.lossDays} Pertes</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border ${theme.cardBg}`}>
            <span className={`text-[11px] font-sans ${theme.textMuted}`}>Winrate:</span>
            <span className={`font-bold ${theme.textPrimary}`}>{monthlySummary.monthWinrate}%</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border ${theme.badgeNeutral}`}>
            {monthlySummary.totalTrades} Trades
          </div>
        </div>
      </div>

      {/* 2. Month Selector Controls */}
      <div className={`rounded-2xl p-3 flex items-center justify-between border ${theme.cardBg}`}>
        <button
          onClick={handlePrevMonth}
          className={`p-2 rounded-xl transition-all cursor-pointer border btn-press ${theme.badgeNeutral}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className={`text-base sm:text-lg font-bold uppercase font-mono tracking-wider ${theme.textPrimary}`}>
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={handleToday}
            className={`px-2.5 py-0.8 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer btn-press ${theme.badgeNeutral}`}
          >
            Aujourd'hui
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className={`p-2 rounded-xl transition-all cursor-pointer border btn-press ${theme.badgeNeutral}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. MOBILE CALENDAR VIEW (Visible on Mobile Only) */}
      <div className="block md:hidden space-y-3">
        <div className={`rounded-2xl p-3 border ${theme.cardBg}`}>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className={`text-[10px] font-semibold uppercase py-1 ${theme.textMuted}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const hasTrades = day.trades.length > 0;
              const isWin = day.netPnL > 0;
              const isLoss = day.netPnL < 0;
              const isSelected = selectedDayString === day.dateString;

              return (
                <button
                  key={`m-day-${idx}`}
                  disabled={!day.isCurrentMonth}
                  onClick={() => {
                    if (hasTrades) {
                      setSelectedDayString(isSelected ? null : day.dateString);
                    }
                  }}
                  className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-between text-[11px] font-medium border transition-all btn-press ${
                    !day.isCurrentMonth
                      ? 'opacity-20 border-transparent cursor-default'
                      : isSelected
                      ? (isLight ? 'bg-violet-50 border-violet-600 ring-2 ring-violet-500' : 'bg-[#2A1E14] border-[#f75605] ring-2 ring-[#f75605]')
                      : isWin
                      ? theme.winBadge
                      : isLoss
                      ? theme.lossBadge
                      : hasTrades
                      ? theme.badgeNeutral
                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#121820] border-[#252E38] text-slate-300')
                  }`}
                >
                  <span>{day.dayNumber}</span>
                  {hasTrades ? (
                    <span className={`text-[8px] font-mono font-bold ${
                      isWin ? theme.winText : isLoss ? theme.lossText : theme.textMuted
                    }`}>
                      {isWin ? '+' : ''}{Math.round(day.netPnL)}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Active Days Card List */}
        <div className="space-y-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme.textSecondary}`}>
            Journées de Trading ({calendarDays.filter(d => d.isCurrentMonth && d.trades.length > 0).length})
          </h3>

          {calendarDays.filter(d => d.isCurrentMonth && d.trades.length > 0).length === 0 ? (
            <div className={`p-4 rounded-xl text-center text-xs border ${theme.cardBg} ${theme.textMuted}`}>
              Aucun trade enregistré ce mois-ci.
            </div>
          ) : (
            calendarDays
              .filter(d => d.isCurrentMonth && d.trades.length > 0)
              .map((day) => {
                const isWin = day.netPnL > 0;
                const isLoss = day.netPnL < 0;
                return (
                  <div
                    key={`m-list-${day.dateString}`}
                    onClick={() => setSelectedDayString(day.dateString)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer card-hover-lift btn-press ${theme.cardBg}`}
                  >
                    <div>
                      <div className={`text-xs font-bold ${theme.textPrimary}`}>
                        {day.dateString}
                      </div>
                      <div className={`text-[10px] ${theme.textMuted}`}>
                        {day.trades.length} trade{day.trades.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                        isWin ? theme.winBadge : isLoss ? theme.lossBadge : theme.badgeNeutral
                      }`}>
                        {isWin ? '+' : ''}{settings.currencySymbol}{day.netPnL.toFixed(2)}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* 4. DESKTOP CALENDAR VIEW (Visible on Desktop Only) */}
      <div className={`hidden md:block rounded-2xl p-4 shadow-sm border overflow-x-auto ${theme.cardBg}`}>
        <div className="min-w-[900px]">
          {/* Days of Week & Semaine Header */}
          <div className="grid grid-cols-8 gap-2 mb-2.5 text-center">
            {daysOfWeek.map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-semibold uppercase tracking-wider py-1 rounded-lg border ${
                  idx === 7 
                    ? theme.badgeNeutral
                    : (isLight ? 'text-slate-600 bg-slate-50 border-slate-200' : 'text-slate-400 bg-[#12151D] border-[#232733]')
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Rows */}
          <div className="space-y-2">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-8 gap-2">
                {/* 7 Days of the Week */}
                {week.days.map((day, dIdx) => {
                  const hasTrades = day.trades.length > 0;
                  const isWinDay = day.netPnL > 0;
                  const isLossDay = day.netPnL < 0;
                  const isBeDay = hasTrades && day.netPnL === 0;
                  const isSelected = selectedDayString === day.dateString;

                  return (
                    <div
                      key={dIdx}
                      onClick={() => {
                        if (hasTrades) {
                          setSelectedDayString(isSelected ? null : day.dateString);
                        }
                      }}
                      className={`min-h-[105px] p-2.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        !day.isCurrentMonth
                          ? 'opacity-25 bg-slate-100 dark:bg-[#10131A] border-transparent pointer-events-none'
                          : isSelected
                          ? (isLight ? 'border-violet-600 ring-2 ring-violet-500/30 bg-violet-50/50' : 'border-[#f75605] ring-2 ring-[#f75605]/30 bg-[#f75605]/10')
                          : isWinDay
                          ? (isLight ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 cursor-pointer' : 'bg-[#0D261E]/80 border-[#3FB88A]/30 hover:border-[#3FB88A] cursor-pointer')
                          : isLossDay
                          ? (isLight ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400 cursor-pointer' : 'bg-[#2A1518]/80 border-[#D96C6C]/30 hover:border-[#D96C6C] cursor-pointer')
                          : isBeDay
                          ? (isLight ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400 cursor-pointer' : 'bg-[#231E0C]/80 border-amber-500/30 hover:border-amber-400 cursor-pointer')
                          : (isLight ? 'bg-slate-50/50 border-slate-200/80 hover:border-slate-300' : 'bg-[#121820] border-[#252E38] hover:border-[#3A4654]')
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-semibold ${
                          day.isCurrentMonth ? theme.textPrimary : theme.textMuted
                        }`}>
                          {day.dayNumber}
                        </span>
                      </div>

                      {/* Day PnL & Trade Count */}
                      {hasTrades ? (
                        <div className="my-auto py-0.5 text-center">
                          <div className={`text-sm font-bold font-mono tracking-tight ${
                            isWinDay ? theme.winText : isLossDay ? theme.lossText : theme.textPrimary
                          }`}>
                            {isWinDay ? '+ ' : isLossDay ? '- ' : ''}{settings.currencySymbol}{Math.abs(day.netPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[9px] font-medium mt-0.5 ${theme.textMuted}`}>
                            {day.trades.length} trade{day.trades.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="my-auto text-center">
                          <span className={`text-[10px] font-mono opacity-30`}>-</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 8th Column: Weekly Total Card ("Semaine") */}
                <div
                  className={`min-h-[105px] p-2.5 rounded-xl border flex flex-col justify-between ${
                    week.totalPnL > 0
                      ? (isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#0D261E]/50 border-[#10B981]/20')
                      : week.totalPnL < 0
                      ? (isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-[#2A1518]/50 border-[#EF4444]/20')
                      : theme.innerBg
                  }`}
                >
                  <div className="my-auto text-center">
                    <div className={`text-sm font-bold font-mono tracking-tight ${
                      week.totalPnL > 0 ? theme.winText : week.totalPnL < 0 ? theme.lossText : theme.textMuted
                    }`}>
                      {week.totalPnL > 0 ? '+' : ''}{settings.currencySymbol}{week.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[9px] font-medium mt-0.5 ${theme.textMuted}`}>
                      {week.totalTrades} trade{week.totalTrades > 1 ? 's' : ''}
                    </div>
                  </div>

                  {week.totalTrades > 0 ? (
                    <div className={`mt-1 pt-1 border-t ${theme.tableBorder}`}>
                      <div className={`flex items-center justify-between text-[8px] font-semibold mb-0.5 ${theme.textMuted}`}>
                        <span>Winrate</span>
                        <span className={`font-mono ${theme.winText}`}>{week.winrate}%</span>
                      </div>
                      <div className={`h-1 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-300 bg-emerald-500`}
                          style={{ width: `${week.winrate}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Selected Day Detailed Modal */}
      {selectedDayData && selectedDayData.trades.length > 0 && dayStats && (
        <div 
          onClick={() => setSelectedDayString(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 relative my-auto overflow-hidden border ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#161922] border-[#232733] text-slate-100'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-4 flex-shrink-0 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#161922] border-[#232733]'
            }`}>
              <h2 className={`text-lg font-bold tracking-tight ${theme.textPrimary}`}>
                {dayStats.dateFormatted}
              </h2>

              <button
                onClick={() => setSelectedDayString(null)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#1D212C] hover:bg-[#252B39] text-slate-400 hover:text-white'
                }`}
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Top 4 Stat Cards in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`rounded-xl p-3.5 border ${theme.innerBg}`}>
                  <span className={theme.label}>Total</span>
                  <div className={`text-base font-bold font-mono ${dayStats.totalPnL >= 0 ? theme.winText : theme.lossText}`}>
                    {dayStats.totalPnL.toFixed(2)} {settings.currencySymbol}
                  </div>
                </div>

                <div className={`rounded-xl p-3.5 border ${theme.innerBg}`}>
                  <span className={theme.label}>Trades</span>
                  <div className={`text-base font-bold font-mono ${theme.textPrimary}`}>
                    {dayStats.tradesCount}
                  </div>
                </div>

                <div className={`rounded-xl p-3.5 border ${theme.innerBg}`}>
                  <span className={theme.label}>Win Rate</span>
                  <div className={`text-base font-bold font-mono ${theme.textPrimary}`}>
                    {dayStats.winRate}%
                  </div>
                </div>

                <div className={`rounded-xl p-3.5 border ${theme.innerBg}`}>
                  <span className={theme.label}>Moyenne / trade</span>
                  <div className={`text-base font-bold font-mono ${dayStats.avgPnL >= 0 ? theme.winText : theme.lossText}`}>
                    {dayStats.avgPnL.toFixed(2)} {settings.currencySymbol}
                  </div>
                </div>
              </div>

              {/* Middle Row: Répartition des trades & Métriques avancées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Left Card: Répartition des trades */}
                <div className={`rounded-xl p-4 flex flex-col justify-between border ${theme.innerBg}`}>
                  <div>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Répartition des trades</h3>
                    <p className={`text-[11px] ${theme.textMuted}`}>Gagnants / Perdants / Break-even</p>
                  </div>

                  <div className="my-3 flex items-center justify-between gap-4">
                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className={theme.textSecondary}>Gagnants</span>
                        <span className={`font-mono font-bold ml-2 ${theme.textPrimary}`}>{dayStats.winningCount} ({dayStats.winningPercent}%)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className={theme.textSecondary}>Break-even</span>
                        <span className={`font-mono font-bold ml-2 ${theme.textPrimary}`}>{dayStats.beCount}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className={theme.textSecondary}>Perdants</span>
                        <span className={`font-mono font-bold ml-2 ${theme.textPrimary}`}>{dayStats.losingCount} ({dayStats.losingPercent}%)</span>
                      </div>
                    </div>

                    <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={isLight ? '#E2E8F0' : '#232733'}
                          strokeWidth="4"
                        />
                        {dayStats.losingPercent > 0 && (
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F43F5E"
                            strokeWidth="4"
                            strokeDasharray={`${dayStats.losingPercent}, 100`}
                          />
                        )}
                        {dayStats.winningPercent > 0 && (
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="4"
                            strokeDasharray={`${dayStats.winningPercent}, 100`}
                            strokeDashoffset={-dayStats.losingPercent}
                          />
                        )}
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-[8px] font-sans ${theme.textMuted}`}>Trades</span>
                        <span className={`text-xs font-bold font-mono ${theme.textPrimary}`}>{dayStats.tradesCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Métriques avancées */}
                <div className={`rounded-xl p-4 flex flex-col justify-between border ${theme.innerBg}`}>
                  <div>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 ${theme.textSecondary}`}>Métriques avancées</h3>

                    <div className="space-y-2 text-xs">
                      <div className={`flex items-center justify-between pb-1.5 border-b ${theme.tableBorder}`}>
                        <span className={theme.textMuted}>Profit moyen</span>
                        <span className={`font-mono font-bold ${theme.winText}`}>
                          +{dayStats.avgWin.toFixed(2)} {settings.currencySymbol}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between pb-1.5 border-b ${theme.tableBorder}`}>
                        <span className={theme.textMuted}>Perte moyenne</span>
                        <span className={`font-mono font-bold ${theme.lossText}`}>
                          {-Math.abs(dayStats.avgLoss).toFixed(2)} {settings.currencySymbol}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between pb-1.5 border-b ${theme.tableBorder}`}>
                        <span className={theme.textMuted}>Ratio Profit/Perte</span>
                        <span className={`font-mono font-bold ${theme.textPrimary}`}>
                          {dayStats.profitLossRatio}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between pb-1.5 border-b ${theme.tableBorder}`}>
                        <span className={theme.textMuted}>Meilleur trade</span>
                        <span className={`font-mono font-bold ${theme.winText}`}>
                          +{dayStats.bestTrade.toFixed(2)} {settings.currencySymbol}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={theme.textMuted}>Pire trade</span>
                        <span className={`font-mono font-bold ${theme.lossText}`}>
                          {dayStats.worstTrade.toFixed(2)} {settings.currencySymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Trades Table */}
              <div className="space-y-2.5 pt-1">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme.textSecondary}`}>Trades de la journée</h3>

                <div className={`rounded-xl overflow-hidden border ${theme.cardBg}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] font-semibold uppercase tracking-wider border-b ${theme.tableHeaderBg}`}>
                        <tr>
                          <th className="py-2.5 px-3">Sens</th>
                          <th className="py-2.5 px-3">Paire</th>
                          <th className="py-2.5 px-3">Entrée</th>
                          <th className="py-2.5 px-3">Sortie</th>
                          <th className="py-2.5 px-3">Lots</th>
                          <th className="py-2.5 px-3">PnL</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className={`divide-y font-mono ${theme.divideBorder}`}>
                        {dayStats.dayTrades.map((t) => {
                          const isWin = t.netPnL > 0;
                          const isLoss = t.netPnL < 0;

                          return (
                            <tr key={t.id} className={`transition-colors ${theme.tableRowHover}`}>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                  t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                                }`}>
                                  {t.side}
                                </span>
                              </td>

                              <td className={`py-2.5 px-3 font-bold font-sans ${theme.textPrimary}`}>
                                {t.symbol}
                              </td>

                              <td className={`py-2.5 px-3 ${theme.textMuted}`}>
                                {t.entry !== undefined ? t.entry : '-'}
                              </td>

                              <td className={`py-2.5 px-3 ${theme.textMuted}`}>
                                {t.exit !== undefined ? t.exit : '-'}
                              </td>

                              <td className={`py-2.5 px-3 ${theme.textSecondary}`}>
                                {t.lotSize || 1}
                              </td>

                              <td className="py-2.5 px-3">
                                <span className={`font-bold ${isWin ? theme.winText : isLoss ? theme.lossText : theme.textMuted}`}>
                                  {isWin ? '+' : ''}{t.netPnL.toFixed(2)}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedDayString(null);
                                    onSelectTrade(t);
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                  title="Voir / Éditer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
