import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  buildMonthCalendar,
  getAllTradingMonths,
} from '../../lib/calendar';
import { formatCurrency, formatPercent } from '../../lib/formatting';
import type { MobilePageProps } from './types';

const months = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const card = 'rounded-3xl border border-slate-800 bg-[#111118]';

const tone = (pnl: number, tradeCount: number) => {
  if (tradeCount === 0) return 'border-slate-800 bg-slate-900/30';
  if (pnl > 0) return 'border-emerald-500/40 bg-emerald-950/30';
  if (pnl < 0) return 'border-rose-500/40 bg-rose-950/30';
  return 'border-slate-600 bg-slate-900/50';
};

export function CalendarMobile({ data }: MobilePageProps) {
  const { trades = [], settings, onSelectTrade } = data as any;
  const currency = settings?.currency || 'EUR';

  const defaultMonth = useMemo(() => {
    const trade = trades.find((item: any) => item.closedAt || item.openedAt);

    if (trade) {
      const date = new Date(trade.closedAt || trade.openedAt);
      if (!Number.isNaN(date.getTime())) {
        return {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth(),
        };
      }
    }

    const now = new Date();
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
    };
  }, [trades]);

  const [year, setYear] = useState(defaultMonth.year);
  const [monthIndex, setMonthIndex] = useState(defaultMonth.month);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const month = useMemo(
    () => buildMonthCalendar(year, monthIndex, trades),
    [year, monthIndex, trades],
  );

  const availableMonths = useMemo(
    () => getAllTradingMonths(trades),
    [trades],
  );

  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, monthIndex + delta, 1));
    setYear(next.getUTCFullYear());
    setMonthIndex(next.getUTCMonth());
  };

  const days = month.weeks.flatMap((week: any) => week.days);

  return (
    <div className="mobile-page-frame space-y-4 text-slate-100">
      <header className="mobile-page-header">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900"
            aria-label="Mois précédent"
          >
            <ChevronLeft />
          </button>

          <button
            type="button"
            onClick={() => setMonthPickerOpen(true)}
            className="min-h-11 min-w-0 max-w-[65%] truncate rounded-xl px-4 font-black"
            aria-label="Choisir le mois"
          >
            {months[monthIndex]} {year}
          </button>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900"
            aria-label="Mois suivant"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className={`${card} min-w-0 p-3`}>
            <span className="text-[9px] text-slate-500">P&amp;L</span>
            <b
              className={`mt-1 block truncate ${
                month.netPnL >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {formatCurrency(month.netPnL, currency, { showSign: true })}
            </b>
          </div>

          <div className={`${card} p-3`}>
            <span className="text-[9px] text-slate-500">TRADES</span>
            <b className="mt-1 block">{month.totalTrades}</b>
          </div>

          <div className={`${card} p-3`}>
            <span className="text-[9px] text-slate-500">WIN RATE</span>
            <b className="mt-1 block">
              {formatPercent(month.winRate, 1)}
            </b>
          </div>
        </div>
      </header>

      <section className={`${card} overflow-hidden`}>
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dayName, index) => (
            <div
              key={`${dayName}-${index}`}
              className="flex min-h-10 items-center justify-center text-[10px] font-black text-slate-500"
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day: any, index: number) => {
            const active = day.isCurrentMonth && day.tradeCount > 0;

            return (
              <button
                key={`${day.dateStr}-${index}`}
                type="button"
                disabled={!active}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[58px] min-w-0 gap-1 border-b border-r p-1 focus:outline-none focus:ring-2 focus:ring-violet-500 ${tone(
                  day.netPnL,
                  day.tradeCount,
                )} ${!day.isCurrentMonth ? 'opacity-25' : ''} flex flex-col items-center justify-center`}
              >
                <span className="text-xs font-black">{day.dayNumber}</span>

                {active && (
                  <>
                    <span
                      className={`max-w-full truncate text-[9px] font-bold ${
                        day.netPnL > 0
                          ? 'text-emerald-300'
                          : day.netPnL < 0
                            ? 'text-rose-300'
                            : 'text-slate-300'
                      }`}
                    >
                      {day.netPnL > 0 ? '+' : ''}
                      {Math.round(day.netPnL)}
                    </span>
                    <span className="text-[8px] text-slate-500">
                      {day.tradeCount} tr.
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div
        className={`${card} flex justify-center gap-4 p-3 text-[10px] text-slate-400`}
      >
        <span>● Gagnant</span>
        <span>● Perdant</span>
        <span>● Neutre</span>
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/75"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className={`${card} max-h-[82dvh] w-full overflow-y-auto rounded-b-none p-5`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black">
                  Jour {selectedDay.dayNumber}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedDay.dateStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="min-h-11 min-w-11 rounded-xl bg-slate-800"
                aria-label="Fermer"
              >
                <X />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-2xl bg-slate-900 p-4">
                <span className="text-[9px] text-slate-500">P&amp;L total</span>
                <b
                  className={`mt-1 block truncate text-lg ${
                    selectedDay.netPnL >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(selectedDay.netPnL, currency, {
                    showSign: true,
                  })}
                </b>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <span className="text-[9px] text-slate-500">Trades</span>
                <b className="mt-1 block text-lg">
                  {selectedDay.tradeCount}
                </b>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-500">
                Trades du jour
              </h3>

              {selectedDay.trades.map((trade: any) => (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => onSelectTrade?.(trade)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 text-left"
                >
                  <span className="truncate">{trade.symbol || '—'}</span>
                  <span
                    className={`shrink-0 font-bold ${
                      (trade.netPnL || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(trade.netPnL || 0, currency, {
                      showSign: true,
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {monthPickerOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setMonthPickerOpen(false)}
        >
          <div
            className={`${card} w-full max-w-md p-5`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black">Choisir une période</h2>
              <button
                type="button"
                onClick={() => setMonthPickerOpen(false)}
                className="min-h-11 min-w-11 rounded-xl bg-slate-800"
                aria-label="Fermer"
              >
                <X />
              </button>
            </div>

            <select
              value={`${year}-${monthIndex}`}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value
                  .split('-')
                  .map(Number);
                setYear(nextYear);
                setMonthIndex(nextMonth);
                setMonthPickerOpen(false);
              }}
              className="mt-4 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
            >
              {availableMonths.map((item: any) => (
                <option
                  key={item.monthKey}
                  value={`${item.year}-${item.month}`}
                >
                  {item.monthLabel} ({item.totalTrades})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
