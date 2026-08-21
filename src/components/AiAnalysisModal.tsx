import React, { useState } from 'react';
import { Brain, Bot, X, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Send, Trophy, Sparkles } from 'lucide-react';
import { PerformanceStats, Trade, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PerformanceStats;
  trades: Trade[];
  settings: UserAppSettings;
}

export interface AiAnalysisResult {
  score: number;
  overallRating: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  riskAssessment: string;
  actionableRecommendations: string[];
  detailedAnswer?: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  stats,
  trades,
  settings,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAnalysis = async (customQ?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const symbolCounts: Record<string, number> = {};
    trades.forEach(t => {
      if (t.symbol) symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
    });

    try {
      const res = await fetch('/api/analyze-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          tradesSummary: {
            topSymbols: Object.entries(symbolCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
            recentTradesCount: trades.length
          },
          userQuestion: customQ || userQuestion
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setErrorMsg(data.error || 'Impossible d\'analyser le journal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau lors de l\'analyse.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-2xl rounded-t-2xl md:rounded-2xl border shadow-2xl overflow-hidden z-10 max-h-[88vh] md:max-h-[90vh] flex flex-col my-0 md:my-6 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${theme.tableBorder}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border ${theme.badgeNeutral}`}>
              <Brain className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>
                Analyse IA & Coaching Trader
              </h2>
              <p className={`text-[11px] ${theme.textMuted}`}>
                Évaluation algorithmique de votre discipline et gestion des risques
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Run Trigger Section */}
          {!analysis && !isLoading && (
            <div className="text-center py-6 space-y-3">
              <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center border ${theme.badgeNeutral}`}>
                <Sparkles className="w-5 h-5 opacity-70" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme.textPrimary}`}>Lancer une analyse IA sur {trades.length} trades</h3>
                <p className={`text-xs max-w-sm mx-auto mt-0.5 ${theme.textMuted}`}>
                  Analyse de la rentabilité, drawdown, gestion du risque et régularité.
                </p>
              </div>

              <button
                onClick={() => handleRunAnalysis()}
                className={`px-4 py-2 font-semibold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 btn-press ${
                  theme.btnPrimary
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Générer le Rapport IA</span>
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-8 text-center space-y-3">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin mx-auto ${
                isLight ? 'border-violet-200 border-t-violet-600' : 'border-[#f75605]/20 border-t-[#f75605]'
              }`}></div>
              <div>
                <h4 className={`text-xs font-bold ${theme.textPrimary}`}>L'IA analyse votre journal...</h4>
                <p className={`text-[11px] ${theme.textMuted}`}>Calcul des patterns statistiques et du R Multiple</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysis && !isLoading && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Score & Rating Banner */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${theme.innerBg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl text-white font-bold text-xl flex items-center justify-center font-mono ${
                    isLight ? 'bg-violet-600' : 'bg-[#f75605] text-white'
                  }`}>
                    {analysis.score}<span className="text-[10px] opacity-80">/10</span>
                  </div>
                  <div>
                    <span className={theme.label}>Diagnostic IA</span>
                    <h3 className={`text-sm font-bold ${theme.textPrimary}`}>{analysis.overallRating}</h3>
                    <p className={`text-xs mt-0.5 leading-snug ${theme.textMuted}`}>{analysis.summary}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRunAnalysis()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${theme.badgeNeutral}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Ré-analyser</span>
                </button>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Strengths */}
                <div className={`p-3 rounded-xl border space-y-1.5 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#0D261E]/50 border-[#10B981]/30'
                }`}>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Points Forts</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {analysis.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className={`p-3 rounded-xl border space-y-1.5 ${
                  isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#261E10]/50 border-amber-500/30'
                }`}>
                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Axes d'Amélioration</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {analysis.weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className={`p-3 rounded-xl border space-y-1 ${theme.innerBg}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gestion du Risque</span>
                </h4>
                <p className={`text-xs leading-relaxed ${theme.textPrimary}`}>
                  {analysis.riskAssessment}
                </p>
              </div>

              {/* Recommendations */}
              <div className={`p-3 rounded-xl border space-y-2 ${theme.innerBg}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Plan d'Action Recommandé</span>
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {analysis.actionableRecommendations.map((rec, idx) => (
                    <div key={idx} className={`p-2 rounded-lg border flex items-center gap-2 text-xs ${theme.cardBg}`}>
                      <div className={`w-5 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${theme.badgeNeutral}`}>
                        {idx + 1}
                      </div>
                      <span className={`font-medium ${theme.textPrimary}`}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Answer if prompt asked */}
              {analysis.detailedAnswer && (
                <div className={`p-3 rounded-xl border space-y-1 ${theme.innerBg}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
                    <Bot className="w-3.5 h-3.5 text-slate-400" />
                    <span>Réponse</span>
                  </h4>
                  <p className={`text-xs leading-relaxed ${theme.textPrimary}`}>
                    {analysis.detailedAnswer}
                  </p>
                </div>
              )}

              {/* Prompt Question Bar */}
              <div className={`pt-2 border-t ${theme.tableBorder}`}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (userQuestion.trim()) {
                      handleRunAnalysis(userQuestion);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder="Poser une question spécifique à l'IA..."
                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900 placeholder-slate-400' 
                        : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2] placeholder-[#8B96A3]'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !userQuestion.trim()}
                    className={`px-3 py-1.5 disabled:opacity-40 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 btn-press ${
                      theme.btnPrimary
                    }`}
                  >
                    <Send className="w-3 h-3" />
                    <span>Envoyer</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
