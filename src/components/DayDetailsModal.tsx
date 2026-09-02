import React from 'react';
import { Trade } from '../types/trade';
import { DayTradeStats } from '../lib/calendar';
import { formatCurrency, formatPercent } from '../lib/formatting';
import { X, ArrowUpRight, ArrowDownRight, Eye, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  dayStats: DayTradeStats | null;
  currency?: string;
  onClose: () => void;
  onSelectTrade: (trade: Trade) => void;
}

export const DayDetailsModal: React.FC<Props> = ({
  dayStats,
  currency = 'EUR',
  onClose,
  onSelectTrade,
}) => {
  if (!dayStats) return null;

  // Format date header e.g. "Journée du 20 août 2026"
  const formattedDateHeader = (() => {
    try {
      const parts = dayStats.dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = [
          'janvier',
          'février',
          'mars',
          'avril',
          'mai',
          'juin',
          'juillet',
          'août',
          'septembre',
          'octobre',
          'novembre',
          'décembre',
        ];
        return `Journée du ${day} ${months[monthIndex]} ${year}`;
      }
    } catch {
      // Fallback
    }
    return `Journée du ${dayStats.dateStr}`;
  })();

  const {
    netPnL,
    tradeCount,
    winRate,
    avgPnL,
    winningTrades,
    breakEvenTrades,
    losingTrades,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade,
    worstTrade,
    trades,
  } = dayStats;

  const winPct = tradeCount > 0 ? Math.round((winningTrades / tradeCount) * 100) : 0;
  const bePct = tradeCount > 0 ? Math.round((breakEvenTrades / tradeCount) * 100) : 0;
  const lossPct = tradeCount > 0 ? Math.round((losingTrades / tradeCount) * 100) : 0;

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const winStroke = (winPct / 100) * circumference;
  const beStroke = (bePct / 100) * circumference;
  const lossStroke = (lossPct / 100) * circumference;

  return (
    <AnimatePresence>
      <div
        id="day-details-backdrop"
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
          id="day-details-modal"
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
                  {formattedDateHeader}
                </h2>
                <p className="text-xs text-[#6B668D] dark:text-[#9299A8] font-normal">
                  Rapport d'exécution quotidien &amp; répartition statistique
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-white hover:bg-[#F3EEFF] dark:hover:bg-[#181C25] transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-90px)]">
            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total PnL */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">Total</span>
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

              {/* Trades count */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">Trades</span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5] block">
                  {tradeCount}
                </span>
              </div>

              {/* Win Rate */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">Win Rate</span>
                <span className="text-lg sm:text-xl font-bold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5] block">
                  {formatPercent(winRate, 1)}
                </span>
              </div>

              {/* Moyenne par trade */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#8E89AF] dark:text-[#9299A8] block mb-1 uppercase tracking-wider">
                  Moyenne / trade
                </span>
                <span
                  className={`text-lg sm:text-xl font-bold tabular-nums block ${
                    avgPnL > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : avgPnL < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                  }`}
                >
                  {formatCurrency(avgPnL, currency, { showSign: true })}
                </span>
              </div>
            </div>

            {/* Middle 2 Cards: Répartition des trades & Métriques avancées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Left: Répartition des trades */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Répartition des trades</h3>
                  <p className="text-[11px] text-[#6B668D] dark:text-[#9299A8] font-normal mb-4">
                    Gagnants / Perdants / Break-even
                  </p>
                </div>

                <div className="flex items-center justify-between gap-6 py-2">
                  {/* Legend */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Gagnants</span>
                      <span className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold ml-auto tabular-nums pl-4">
                        {winningTrades} ({winPct}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                      <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Break-even</span>
                      <span className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold ml-auto tabular-nums pl-4">
                        {breakEvenTrades} ({bePct}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Perdants</span>
                      <span className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold ml-auto tabular-nums pl-4">
                        {losingTrades} ({lossPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Circular Donut Gauge */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-[#ECE7FC] dark:stroke-[#292E38] fill-none"
                        strokeWidth="10"
                      />
                      {/* Win segment */}
                      {winStroke > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className="stroke-emerald-500 fill-none transition-all duration-500"
                          strokeWidth="10"
                          strokeDasharray={`${winStroke} ${circumference}`}
                          strokeDashoffset="0"
                        />
                      )}
                      {/* BE segment */}
                      {beStroke > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className="stroke-amber-400 fill-none transition-all duration-500"
                          strokeWidth="10"
                          strokeDasharray={`${beStroke} ${circumference}`}
                          strokeDashoffset={String(-winStroke)}
                        />
                      )}
                      {/* Loss segment */}
                      {lossStroke > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className="stroke-rose-500 fill-none transition-all duration-500"
                          strokeWidth="10"
                          strokeDasharray={`${lossStroke} ${circumference}`}
                          strokeDashoffset={String(-(winStroke + beStroke))}
                        />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] uppercase tracking-wider font-bold">
                        Trades
                      </span>
                      <span className="text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5] tabular-nums">
                        {tradeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Right: Métriques avancées */}
              <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Métriques avancées</h3>
                  <p className="text-[11px] text-[#6B668D] dark:text-[#9299A8] font-normal mb-3">
                    Espérance &amp; ratios de performance
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#ECE7FC] dark:border-[#292E38]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Profit moyen</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      {formatCurrency(avgWin, currency, { showSign: true })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-[#ECE7FC] dark:border-[#292E38]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Perte moyenne</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                      {avgLoss > 0 ? `-${formatCurrency(avgLoss, currency, { showSign: false })}` : '0 EUR'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-[#ECE7FC] dark:border-[#292E38]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Ratio Profit/Perte</span>
                    <span className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold tabular-nums">
                      {profitFactor !== null ? profitFactor.toFixed(2) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-[#ECE7FC] dark:border-[#292E38]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Meilleur trade</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      {bestTrade ? formatCurrency(bestTrade.netPnL, currency, { showSign: true }) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Pire trade</span>
                    <span
                      className={`font-bold tabular-nums ${
                        worstTrade && (worstTrade.netPnL ?? 0) < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : worstTrade
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[#6B668D] dark:text-[#9299A8]'
                      }`}
                    >
                      {worstTrade
                        ? formatCurrency(worstTrade.netPnL, currency, { showSign: true })
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Trades de la journée Table */}
            <div className="bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#ECE7FC] dark:border-[#292E38] bg-[#F5EEFF]/40 dark:bg-[#0B0D12] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Trades de la journée</h3>
                <span className="text-xs text-[#6B668D] dark:text-[#9299A8] tabular-nums font-medium">
                  {trades.length} {trades.length > 1 ? 'positions clôturées' : 'position clôturée'}
                </span>
              </div>

              {trades.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E89AF] dark:text-[#9299A8]">
                  Aucun trade clôturé pour cette date.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8FF] dark:bg-[#0B0D12] border-b border-[#ECE7FC] dark:border-[#292E38] text-[#8E89AF] dark:text-[#9299A8] uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">TYPE</th>
                        <th className="py-3 px-4">PAIRE</th>
                        <th className="py-3 px-4">ENTRÉE</th>
                        <th className="py-3 px-4">SORTIE</th>
                        <th className="py-3 px-4">LOTS</th>
                        <th className="py-3 px-4">P&amp;L</th>
                        <th className="py-3 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE7FC] dark:divide-[#292E38] font-sans">
                      {trades.map((trade) => {
                        const isBuy = trade.direction === 'BUY';
                        const pnl = trade.netPnL ?? 0;

                        return (
                          <tr
                            key={trade.id}
                            className="hover:bg-[#F3EEFF]/50 dark:hover:bg-[#1F2430] transition group"
                          >
                            {/* TYPE */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                  isBuy
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                }`}
                              >
                                {isBuy ? 'LONG' : 'SHORT'}
                              </span>
                            </td>

                            {/* PAIRE */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                              {trade.symbol}
                            </td>

                            {/* ENTRÉE */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#6B668D] dark:text-[#9299A8] tabular-nums">
                              {trade.entryPrice !== null && trade.entryPrice !== undefined
                                ? trade.entryPrice
                                : '—'}
                            </td>

                            {/* SORTIE */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#6B668D] dark:text-[#9299A8] tabular-nums">
                              {trade.exitPrice !== null && trade.exitPrice !== undefined
                                ? trade.exitPrice
                                : '—'}
                            </td>

                            {/* LOTS */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#6B668D] dark:text-[#9299A8] tabular-nums">
                              {trade.lotSize ?? trade.quantity ?? '—'}
                            </td>

                            {/* P&L */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold tabular-nums">
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

                            {/* ACTIONS */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => {
                                  onSelectTrade(trade);
                                }}
                                className="p-1.5 rounded-xl text-[#8E89AF] dark:text-[#9299A8] hover:text-[#6D19E8] dark:hover:text-[#FF8A00] hover:bg-[#F3EEFF] dark:hover:bg-[#292E38] transition cursor-pointer"
                                title="Voir les détails complets du trade"
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
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
