import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trade, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { BookOpen, Edit3, Check } from 'lucide-react';

interface JournalViewProps {
  trades: Trade[];
  settings: UserAppSettings;
  onUpdateTrade: (updatedTrade: Trade) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  trades,
  settings,
  onUpdateTrade,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(
    trades.length > 0 ? trades[0].id : null
  );

  const selectedTrade = trades.find((t) => t.id === selectedTradeId);

  const [prePlan, setPrePlan] = useState(selectedTrade?.preTradePlan || '');
  const [postReview, setPostReview] = useState(selectedTrade?.postTradeReview || '');
  const [generalNotes, setGeneralNotes] = useState(selectedTrade?.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (selectedTrade) {
      setPrePlan(selectedTrade.preTradePlan || '');
      setPostReview(selectedTrade.postTradeReview || '');
      setGeneralNotes(selectedTrade.notes || '');
    }
  }, [selectedTradeId]);

  const handleSaveNotes = () => {
    if (!selectedTrade) return;

    const updated: Trade = {
      ...selectedTrade,
      preTradePlan: prePlan || undefined,
      postTradeReview: postReview || undefined,
      notes: generalNotes || undefined,
    };

    onUpdateTrade(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (trades.length === 0) {
    return (
      <div className={`p-8 max-w-3xl mx-auto text-center py-20 font-sans ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${theme.badgeNeutral}`}>
          <BookOpen className="w-8 h-8 opacity-60" />
        </div>
        <h2 className={`text-xl font-bold mb-1 ${theme.textPrimary}`}>Journal de Trading</h2>
        <p className={`text-xs ${theme.textMuted}`}>Importez ou ajoutez des trades pour enregistrer vos plans et analyses psychologiques.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-5 max-w-7xl mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      <div className={`pb-3 border-b ${theme.tableBorder}`}>
        <h2 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${theme.textPrimary}`}>
          <BookOpen className="w-5 h-5 text-slate-400" />
          <span>Journal de Trading & Psychologie</span>
        </h2>
        <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
          Consignez vos plans de trade, analyses post-session et notes d'exécution
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trades List Sidebar */}
        <div className={`rounded-2xl p-3.5 space-y-2.5 max-h-[75vh] overflow-y-auto border ${theme.cardBg}`}>
          <h3 className={theme.label}>Sélectionner un Trade</h3>

          <div className="space-y-1.5">
            {trades.map((t) => {
              const isSelected = t.id === selectedTradeId;
              const hasNotes = t.preTradePlan || t.postTradeReview || t.notes;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTradeId(t.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer btn-press ${
                    isSelected
                      ? isLight
                        ? 'bg-violet-50/80 border-violet-500 shadow-xs'
                        : 'bg-[#f75605]/15 border-[#f75605]'
                      : isLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#0E131A] border-[#252E38] hover:bg-[#171E27]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${theme.textPrimary}`}>{t.symbol}</span>
                    <span className={`text-xs font-bold font-mono ${t.netPnL >= 0 ? theme.winText : theme.lossText}`}>
                      {t.netPnL >= 0 ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                    </span>
                  </div>

                  <div className={`flex items-center justify-between text-[10px] mt-1 ${theme.textMuted}`}>
                    <span>{t.date} ({t.side})</span>
                    {hasNotes && <span className={`font-semibold ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`}>• Notes</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Journal Editor Panel */}
        {selectedTrade ? (
          <div className={`lg:col-span-2 rounded-2xl p-5 space-y-4 border ${theme.cardBg}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${theme.tableBorder}`}>
              <div>
                <h3 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>
                  Journal pour {selectedTrade.symbol} ({selectedTrade.side})
                </h3>
                <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
                  Exécuté le {selectedTrade.date} • PnL : {' '}
                  <strong className={`font-mono ${selectedTrade.netPnL >= 0 ? theme.winText : theme.lossText}`}>
                    {selectedTrade.netPnL >= 0 ? '+' : ''}{settings.currencySymbol}{selectedTrade.netPnL.toFixed(2)}
                  </strong>
                </p>
              </div>

              <button
                onClick={handleSaveNotes}
                className={`px-3.5 py-1.5 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer btn-press self-start sm:self-auto ${
                  theme.btnPrimary
                }`}
              >
                {isSaved ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{isSaved ? 'Enregistré !' : 'Sauvegarder'}</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Pre-Trade Plan */}
              <div>
                <label className={theme.label}>
                  Plan Avant Trade (Pre-Trade Plan)
                </label>
                <textarea
                  rows={3}
                  value={prePlan}
                  onChange={(e) => setPrePlan(e.target.value)}
                  placeholder="ex: Sweep de liquidité + MSS + Entrée FVG à 09:45..."
                  className={`w-full rounded-xl p-2.5 text-xs outline-hidden leading-relaxed border transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:bg-white placeholder-slate-400'
                      : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605] placeholder-[#8B96A3]'
                  }`}
                />
              </div>

              {/* Post-Trade Review */}
              <div>
                <label className={theme.label}>
                  Analyse Après Trade (Post-Trade Review)
                </label>
                <textarea
                  rows={3}
                  value={postReview}
                  onChange={(e) => setPostReview(e.target.value)}
                  placeholder="ex: Bonne prise de position, mais sortie prématurée sous le coup de l'émotion..."
                  className={`w-full rounded-xl p-2.5 text-xs outline-hidden leading-relaxed border transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:bg-white placeholder-slate-400'
                      : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605] placeholder-[#8B96A3]'
                  }`}
                />
              </div>

              {/* General Notes */}
              <div>
                <label className={theme.label}>
                  Notes Psychologiques & Exécution
                </label>
                <textarea
                  rows={3}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Émotions ressenties, erreurs d'exécution, discipline..."
                  className={`w-full rounded-xl p-2.5 text-xs outline-hidden leading-relaxed border transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:bg-white placeholder-slate-400'
                      : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605] placeholder-[#8B96A3]'
                  }`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={`lg:col-span-2 rounded-2xl p-10 text-center text-xs border ${theme.cardBg} ${theme.textMuted}`}>
            Sélectionnez un trade dans la liste pour consulter ou éditer son journal.
          </div>
        )}
      </div>
    </motion.div>
  );
};
