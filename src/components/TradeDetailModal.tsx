import React from 'react';
import { Trade, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { X, Calendar, Clock, Tag, ArrowUpRight, ArrowDownRight, Compass, Sparkles } from 'lucide-react';
import { getTradeRMultiple } from '../calculations';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  settings: UserAppSettings;
  onDeleteTrade?: (tradeId: string) => void;
  onOpenAiReview?: (trade: Trade) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  settings,
  onDeleteTrade,
  onOpenAiReview,
}) => {
  if (!trade) return null;

  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);
  const isWin = trade.netPnL > 0;
  const isLoss = trade.netPnL < 0;
  const rVal = getTradeRMultiple(trade);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
      <div className={`rounded-t-2xl md:rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative max-h-[88vh] md:max-h-[90vh] overflow-y-auto font-sans border ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
      }`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${theme.badgeNeutral}`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base border ${
            trade.side === 'BUY' ? theme.winBadge : theme.lossBadge
          }`}>
            {trade.side === 'BUY' ? <ArrowUpRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-xl font-bold tracking-tight ${theme.textPrimary}`}>{trade.symbol}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                trade.side === 'BUY' ? theme.winBadge : theme.lossBadge
              }`}>
                {trade.side}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${theme.badgeNeutral}`}>
                {trade.source}
              </span>
            </div>
            <div className={`flex items-center gap-3 text-xs mt-0.5 font-mono ${theme.textMuted}`}>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {trade.date}
              </span>
              {trade.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {trade.time}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* PnL Highlight Banner */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isWin
            ? (isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#0D261E]/70 border-[#10B981]/30')
            : isLoss
            ? (isLight ? 'bg-rose-50/70 border-rose-200' : 'bg-[#2A1518]/70 border-[#EF4444]/30')
            : theme.innerBg
        }`}>
          <div>
            <span className={theme.label}>PnL Net</span>
            <div className={`text-xl font-bold font-mono ${isWin ? theme.winText : isLoss ? theme.lossText : theme.textPrimary}`}>
              {isWin ? '+' : ''}{settings.currencySymbol}{trade.netPnL.toFixed(2)}
            </div>
          </div>

          <div className="text-right">
            <span className={theme.label}>Multiple R</span>
            <div className={`text-lg font-bold font-mono ${theme.textPrimary}`}>
              {rVal !== null ? `${rVal >= 0 ? '+' : ''}${rVal.toFixed(2)}R` : '-'}
            </div>
          </div>
        </div>

        {/* Price & Execution Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Prix Entrée', val: trade.entry !== undefined ? trade.entry : '-', mono: true },
            { label: 'Prix Sortie', val: trade.exit !== undefined ? trade.exit : '-', mono: true },
            { label: 'Stop Loss', val: trade.stopLoss !== undefined ? trade.stopLoss : '-', mono: true, color: theme.lossText },
            { label: 'Take Profit', val: trade.takeProfit !== undefined ? trade.takeProfit : '-', mono: true, color: theme.winText },
            { label: 'Lots', val: trade.lotSize !== undefined ? trade.lotSize : '-', mono: true },
            { label: 'Commission', val: trade.commission !== undefined && trade.commission !== null ? `-${settings.currencySymbol}${Math.abs(Number(trade.commission)).toFixed(2)}` : '-', mono: true },
            { label: 'Swap', val: trade.swap !== undefined && trade.swap !== null ? `${settings.currencySymbol}${Number(trade.swap).toFixed(2)}` : '-', mono: true },
            { label: 'Killzone / Session', val: trade.killzone || '-' },
          ].map((item, idx) => (
            <div key={idx} className={`p-2.5 rounded-xl border ${theme.innerBg}`}>
              <span className={theme.label}>{item.label}</span>
              <span className={`text-xs font-bold mt-0.5 block ${item.mono ? 'font-mono' : ''} ${
                item.color ? item.color : theme.textPrimary
              }`}>
                {item.val}
              </span>
            </div>
          ))}
        </div>

        {/* Setup, Tags & Confluence DXY */}
        <div className="space-y-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
            <Tag className="w-3 h-3 text-slate-400" />
            Setup & Confluence
          </span>
          <div className="flex flex-wrap gap-1.5">
            {trade.setup && (
              <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${theme.badgeNeutral}`}>
                Setup: {trade.setup}
              </span>
            )}
            
            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
              trade.confluenceDxy ? theme.winBadge : theme.badgeNeutral
            }`}>
              <Compass className="w-3 h-3" />
              DXY: {trade.confluenceDxy ? 'Aligné' : 'Non aligné'}
            </span>

            {trade.tags && trade.tags.length > 0 ? (
              trade.tags.map((tag, idx) => (
                <span key={idx} className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${theme.badgeNeutral}`}>
                  #{tag}
                </span>
              ))
            ) : null}
          </div>
        </div>

        {/* Pre/Post Trade Notes */}
        {(trade.preTradePlan || trade.postTradeReview || trade.notes) && (
          <div className={`space-y-2 pt-2 border-t ${theme.tableBorder}`}>
            {trade.preTradePlan && (
              <div>
                <span className={theme.label}>Plan Avant Trade</span>
                <p className={`p-2.5 rounded-xl text-xs leading-relaxed border ${theme.innerBg} ${theme.textPrimary}`}>
                  {trade.preTradePlan}
                </p>
              </div>
            )}
            {trade.postTradeReview && (
              <div>
                <span className={theme.label}>Analyse Post-Trade</span>
                <p className={`p-2.5 rounded-xl text-xs leading-relaxed border ${theme.innerBg} ${theme.textPrimary}`}>
                  {trade.postTradeReview}
                </p>
              </div>
            )}
            {trade.notes && (
              <div>
                <span className={theme.label}>Notes</span>
                <p className={`p-2.5 rounded-xl text-xs leading-relaxed border ${theme.innerBg} ${theme.textPrimary}`}>
                  {trade.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 ${theme.tableBorder}`}>
          {onDeleteTrade ? (
            <button
              onClick={() => {
                if (confirm('Êtes-vous sûr de vouloir supprimer ce trade ?')) {
                  onDeleteTrade(trade.id);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-rose-500 hover:bg-rose-500/10 font-medium text-xs rounded-xl border border-rose-200 dark:border-rose-500/30 transition-colors cursor-pointer"
            >
              Supprimer le Trade
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {onOpenAiReview && (
              <button
                onClick={() => {
                  onOpenAiReview(trade);
                }}
                className={`px-3 py-1.5 font-bold text-xs rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-orange-50 hover:bg-orange-100 text-[#f75605] border-orange-200 shadow-xs'
                    : 'bg-[#2A1D13] hover:bg-[#382618] text-[#f75605] border-[#f75605]/40 shadow-xs'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Review</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`px-4 py-1.5 font-medium text-xs rounded-xl border transition-colors cursor-pointer ${theme.badgeNeutral}`}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
