import React, { useState } from 'react';
import { Trade, UserAppSettings, TradeAiReviewResult } from '../types';
import { evaluateTradeAiReview } from '../calculations/coachEngine';
import { getThemeClasses } from '../utils/theme';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Scale, 
  HelpCircle,
  Loader2,
  Calendar,
  Clock,
  Compass
} from 'lucide-react';

interface TradeAiReviewModalProps {
  trade: Trade | null;
  allTrades: Trade[];
  onClose: () => void;
  settings: UserAppSettings;
  onAskCoachAboutTrade?: (trade: Trade) => void;
}

export const TradeAiReviewModal: React.FC<TradeAiReviewModalProps> = ({
  trade,
  allTrades,
  onClose,
  settings,
  onAskCoachAboutTrade,
}) => {
  if (!trade) return null;

  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);
  const isWin = trade.netPnL > 0;
  const isLoss = trade.netPnL < 0;

  const [loadingAi, setLoadingAi] = useState(false);
  const [review, setReview] = useState<TradeAiReviewResult>(() => {
    return evaluateTradeAiReview(trade, allTrades);
  });

  const handleDeepAiReview = async () => {
    try {
      setLoadingAi(true);
      const res = await fetch('/api/coach/review-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade,
          deterministicReview: review,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.review) {
          setReview(data.review);
        }
      }
    } catch (e) {
      console.error('Deep AI trade review failed:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const getVerdictStyle = (tag: string) => {
    if (tag.startsWith('A')) {
      return isLight 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
        : 'bg-[#0D261E] text-[#3FA77D] border-[#3FA77D]/40';
    }
    if (tag.startsWith('B')) {
      return isLight 
        ? 'bg-orange-50 text-orange-700 border-orange-300' 
        : 'bg-[#2A1D13] text-[#f75605] border-[#f75605]/40';
    }
    return isLight 
      ? 'bg-rose-50 text-rose-700 border-rose-300' 
      : 'bg-[#2A1518] text-[#C85C5C] border-[#C85C5C]/40';
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150">
      <div className={`rounded-t-2xl md:rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans border ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
      }`}>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              isLight ? 'bg-orange-100 border-orange-200 text-[#f75605]' : 'bg-[#2A1D13] border-[#f75605]/40 text-[#f75605]'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${theme.textPrimary}`}>
                AI Trade Review
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  trade.side === 'BUY' ? theme.winBadge : theme.lossBadge
                }`}>
                  {trade.symbol} • {trade.side}
                </span>
              </h3>
              <p className={`text-xs ${theme.textMuted}`}>
                Évaluation méthodologique & rigueur d'exécution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${theme.badgeNeutral}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Snapshot Summary Box */}
        <div className={`p-3.5 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 ${theme.innerBg}`}>
          <div>
            <span className={theme.label}>Résultat Net</span>
            <div className={`text-sm font-bold font-mono ${isWin ? theme.winText : isLoss ? theme.lossText : theme.textPrimary}`}>
              {isWin ? '+' : ''}{settings.currencySymbol}{trade.netPnL.toFixed(2)}
            </div>
          </div>
          <div>
            <span className={theme.label}>Multiple R</span>
            <div className={`text-sm font-bold font-mono ${theme.textPrimary}`}>
              {review.rMultiple !== null ? `${review.rMultiple >= 0 ? '+' : ''}${review.rMultiple.toFixed(2)}R` : '-'}
            </div>
          </div>
          <div>
            <span className={theme.label}>Setup</span>
            <div className={`text-xs font-semibold truncate ${theme.textPrimary}`}>
              {trade.setup || 'Non spécifié'}
            </div>
          </div>
          <div>
            <span className={theme.label}>Session / Killzone</span>
            <div className={`text-xs font-semibold truncate ${theme.textPrimary}`}>
              {trade.killzone || 'London / NY'}
            </div>
          </div>
        </div>

        {/* Coach Verdict Card */}
        <div className={`p-4 rounded-xl border space-y-2 ${getVerdictStyle(review.verdictTag)}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Verdict du Coach
            </span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/20">
              {review.verdictTag}
            </span>
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {review.coachVerdict}
          </p>
        </div>

        {/* Core Mental Principle: Trade Quality != Trade Result */}
        <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171E27] border-[#252E38]'
        }`}>
          <Scale className="w-4 h-4 text-[#f75605] shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-[#f75605]">Règle d'or : Qualité du Trade ≠ Résultat Financier</span>
            <p className={`text-[11px] leading-relaxed ${theme.textMuted}`}>
              Une perte prise dans le respect strict du plan est un <strong>excellent trade</strong>. Un gain pris sans Stop Loss ou par impulsion reste un <strong>mauvais trade à haut risque</strong>.
            </p>
          </div>
        </div>

        {/* What was good & What could be improved */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Positive points */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${theme.innerBg}`}>
            <span className="text-[11px] font-bold text-[#3FA77D] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Points Forts Validés
            </span>
            <ul className="space-y-1.5 text-xs">
              {review.whatWasGood.map((item, idx) => (
                <li key={idx} className={`flex items-start gap-1.5 ${theme.textPrimary}`}>
                  <span className="text-[#3FA77D] font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvement points */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${theme.innerBg}`}>
            <span className="text-[11px] font-bold text-[#f75605] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Axes d'Amélioration
            </span>
            <ul className="space-y-1.5 text-xs">
              {review.whatCouldBeImproved.map((item, idx) => (
                <li key={idx} className={`flex items-start gap-1.5 ${theme.textPrimary}`}>
                  <span className="text-[#f75605] font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Coach Analysis */}
        <div className={`p-3.5 rounded-xl border space-y-1.5 ${theme.innerBg}`}>
          <span className={theme.label}>Analyse Détaillée du Coach</span>
          <p className={`text-xs leading-relaxed ${theme.textPrimary}`}>
            {review.detailedAnalysis}
          </p>
        </div>

        {/* Modal Actions */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 ${theme.tableBorder}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeepAiReview}
              disabled={loadingAi}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer btn-press border transition-all ${
                isLight 
                  ? 'bg-orange-50 hover:bg-orange-100 text-[#f75605] border-orange-200' 
                  : 'bg-[#2A1D13] hover:bg-[#382618] text-[#f75605] border-[#f75605]/40'
              }`}
            >
              {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{loadingAi ? 'Analyse Gemini en cours...' : 'Approfondir avec Gemini'}</span>
            </button>

            {onAskCoachAboutTrade && (
              <button
                onClick={() => {
                  onAskCoachAboutTrade(trade);
                  onClose();
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${theme.badgeNeutral}`}
              >
                Poser une question au Coach
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-medium text-xs rounded-xl border transition-colors cursor-pointer ${theme.badgeNeutral}`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
