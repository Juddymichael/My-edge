import React from 'react';
import { MonthTradeStats } from '../lib/calendar';
import { Trade } from '../types/trade';
import { formatCurrency, formatPercent } from '../lib/formatting';
import {
  X,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  monthStats: MonthTradeStats | null;
  currency?: string;
  onClose: () => void;
  onSelectTrade: (trade: Trade) => void;
  onOpenCalendarMonth?: (year: number, month: number) => void;
}

export const MonthDetailsModal: React.FC<Props> = ({
  monthStats,
  currency = 'EUR',
  onClose,
  onSelectTrade,
  onOpenCalendarMonth,
}) => {
  if (!monthStats) return null;

  const {
    monthLabel,
    year,
    month,
    netPnL,
    totalTrades,
    winRate,
    profitFactor,
    avgTradePnL,
    tradingDaysCount,
    winningDaysCount,
    losingDaysCount,
    bestDay,
    worstDay,
    weeks,
    trades,
  } = monthStats;

  return (
    <AnimatePresence>
      <div
        id="month-details-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          id="month-details-modal"
          className="bg-white dark:bg-[#12151D] text-[#0F0E26] dark:text-[#F5F5F5] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#ECE7FC] dark:border-[#292E38] flex items-center justify-between bg-[#FAF8FF] dark:bg-[#0B0D12]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 border border-[#DDD5FA] dark:border-[#FF8A00]/30 flex items-center justify-center text-[#6D19E8] dark:text-[#FF8A00]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0F0E26] dark:text-[#F5F5F5] capitalize">
                  Bilan du {monthLabel}
                </h2>
                <p className="text-xs text-[#6B668D] dark:text-[#9299A8] font-normal">
                  Synthèse mensuelle des performances, semaines &amp; exécutions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenCalendarMonth && (
                <button
                  onClick={() => {
                    onOpenCalendarMonth(year, month);
                    onClose();
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-[#6D19E8] dark:bg-[#FF8A00] hover:bg-[#5A14C4] dark:hover:bg-[#E67600] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <span>Vue Calendrier</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-2xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-white hover:bg-[#F3EEFF] dark:hover:bg-[#181C25] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-90px)]">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total P&L */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  P&amp;L Net Total
                </span>
                <span
                  className={`text-lg sm:text-xl font-bold tabular-nums block ${
                    netPnL > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : netPnL < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                  }`}
                >
                  {formatCurrency(netPnL, currency, { showSign: true })}
                </span>
              </div>

              {/* Total Trades & Winrate */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">Trades &amp; Win Rate</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg sm:text-xl font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5]">
                    {totalTrades}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ({formatPercent(winRate, 1)})
                  </span>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Profit Factor
                </span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5] block">
                  {profitFactor !== null ? profitFactor.toFixed(2) : 'N/A'}
                </span>
              </div>

              {/* Moyenne / Trade */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Espérance / Trade
                </span>
                <span
                  className={`text-lg sm:text-xl font-bold tabular-nums block ${
                    avgTradePnL > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : avgTradePnL < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                  }`}
                >
                  {formatCurrency(avgTradePnL, currency, { showSign: true })}
                </span>
              </div>
            </div>

            {/* Middle Section: Synthèse par Semaine */}
            <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5] mb-3">Synthèse par Semaine</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {weeks
                  .filter((w) => w.totalTrades > 0)
                  .map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#0B0D12] border border-[#ECE7FC] dark:border-[#292E38] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Semaine {w.weekIndex}</span>
                        <span className="text-[#6B668D] dark:text-[#9299A8] tabular-nums font-medium">{w.totalTrades} trades</span>
                      </div>
                      <div
                        className={`text-base font-bold tabular-nums ${
                          w.netPnL > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : w.netPnL < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                        }`}
                      >
                        {formatCurrency(w.netPnL, currency, { showSign: true })}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8E89AF] dark:text-[#9299A8] pt-1 border-t border-[#ECE7FC] dark:border-[#292E38]">
                        <span>Win Rate:</span>
                        <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">{w.winRate}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Additional stats: Jours de trading & Extrêmes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Jours de Trading
                </span>
                <span className="text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5] tabular-nums block">
                  {tradingDaysCount} jours ({winningDaysCount}G / {losingDaysCount}P)
                </span>
              </div>

              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Meilleure Journée
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
                  {bestDay ? formatCurrency(bestDay.netPnL, currency, { showSign: true }) : '—'}
                </span>
                {bestDay && (
                  <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-mono">{bestDay.dateStr}</span>
                )}
              </div>

              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Pire Journée
                </span>
                <span
                  className={`text-base font-bold tabular-nums block ${
                    worstDay && worstDay.netPnL < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                  }`}
                >
                  {worstDay ? formatCurrency(worstDay.netPnL, currency, { showSign: true }) : '—'}
                </span>
                {worstDay && (
                  <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-mono">{worstDay.dateStr}</span>
                )}
              </div>
            </div>

            {/* Trades du mois Table */}
            <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#ECE7FC] dark:border-[#292E38] bg-[#F5EEFF]/40 dark:bg-[#0B0D12] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Trades du Mois</h3>
                <span className="text-xs text-[#6B668D] dark:text-[#9299A8] tabular-nums font-medium">
                  {trades.length} positions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8FF] dark:bg-[#0B0D12] border-b border-[#ECE7FC] dark:border-[#292E38] text-[#8E89AF] dark:text-[#9299A8] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-3 px-4">DATE</th>
                      <th className="py-3 px-4">TYPE</th>
                      <th className="py-3 px-4">PAIRE</th>
                      <th className="py-3 px-4">SETUP</th>
                      <th className="py-3 px-4">P&amp;L</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE7FC] dark:divide-[#292E38] font-sans">
                    {trades.map((trade) => {
                      const isBuy = trade.direction === 'BUY';
                      const pnl = trade.netPnL ?? 0;
                      const dateFormatted = trade.closedAt || trade.openedAt || '';

                      return (
                        <tr key={trade.id} className="hover:bg-[#F3EEFF]/50 dark:hover:bg-[#1F2430] transition">
                          <td className="py-3 px-4 whitespace-nowrap text-[#6B668D] dark:text-[#9299A8] font-mono text-[11px]">
                            {dateFormatted.slice(0, 10)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                isBuy
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              }`}
                            >
                              {isBuy ? 'LONG' : 'SHORT'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                            {trade.symbol}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-[#6B668D] dark:text-[#9299A8]">
                            {trade.setup || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-bold tabular-nums">
                            <span
                              className={
                                pnl > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : pnl < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                              }
                            >
                              {formatCurrency(pnl, currency, { showSign: true })}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => onSelectTrade(trade)}
                              className="p-1.5 rounded-xl text-[#8E89AF] dark:text-[#9299A8] hover:text-[#6D19E8] dark:hover:text-[#FF8A00] hover:bg-[#F3EEFF] dark:hover:bg-[#292E38] transition cursor-pointer"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
