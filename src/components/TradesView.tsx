import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trade, UserAppSettings, TradeFilterState } from '../types';
import { getThemeClasses } from '../utils/theme';
import { 
  Search, 
  Trash2, 
  Eye, 
  ArrowUpDown, 
  Plus,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface TradesViewProps {
  trades: Trade[];
  settings: UserAppSettings;
  onSelectTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onOpenAddModal: () => void;
  onOpenAiReview?: (trade: Trade) => void;
  onRestoreSampleData?: () => void;
}

export const TradesView: React.FC<TradesViewProps> = ({
  trades,
  settings,
  onSelectTrade,
  onDeleteTrade,
  onOpenAddModal,
  onOpenAiReview,
  onRestoreSampleData,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [filterState, setFilterState] = useState<TradeFilterState>({
    startDate: '',
    endDate: '',
    symbol: 'ALL',
    side: 'ALL',
    killzone: 'ALL',
    setup: 'ALL',
    tag: 'ALL',
    outcome: 'ALL',
    searchQuery: '',
  });

  const [sortField, setSortField] = useState<'date' | 'netPnL' | 'symbol'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Unique dropdown options extracted from trades
  const symbolsList = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => set.add(t.symbol));
    return Array.from(set).sort();
  }, [trades]);

  const killzonesList = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => t.killzone && set.add(t.killzone));
    return Array.from(set).sort();
  }, [trades]);

  // Filtered & Sorted Trades
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        if (filterState.symbol !== 'ALL' && t.symbol !== filterState.symbol) return false;
        if (filterState.side !== 'ALL' && t.side !== filterState.side) return false;
        if (filterState.killzone !== 'ALL' && t.killzone !== filterState.killzone) return false;
        if (filterState.setup !== 'ALL' && t.setup !== filterState.setup) return false;

        if (filterState.outcome === 'WIN' && t.netPnL <= 0) return false;
        if (filterState.outcome === 'LOSS' && t.netPnL >= 0) return false;
        if (filterState.outcome === 'BE' && Math.abs(t.netPnL) > 0.0001) return false;

        if (filterState.startDate && t.date < filterState.startDate) return false;
        if (filterState.endDate && t.date > filterState.endDate) return false;

        if (filterState.searchQuery) {
          const q = filterState.searchQuery.toLowerCase();
          const matchSym = t.symbol.toLowerCase().includes(q);
          const matchSetup = t.setup?.toLowerCase().includes(q);
          const matchNotes = t.notes?.toLowerCase().includes(q);
          const matchTags = t.tags?.some((tg) => tg.toLowerCase().includes(q));
          if (!matchSym && !matchSetup && !matchNotes && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') {
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'netPnL') {
          cmp = a.netPnL - b.netPnL;
        } else if (sortField === 'symbol') {
          cmp = a.symbol.localeCompare(b.symbol);
        }
        return sortDirection === 'desc' ? -cmp : cmp;
      });
  }, [trades, filterState, sortField, sortDirection]);

  const toggleSort = (field: 'date' | 'netPnL' | 'symbol') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredPnLTotal = useMemo(() => {
    return filteredTrades.reduce((acc, t) => acc + t.netPnL, 0);
  }, [filteredTrades]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-5 max-w-7xl mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b ${theme.tableBorder}`}>
        <div>
          <h2 className={theme.sectionTitle}>Historique des Trades Fermés</h2>
          <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
            {filteredTrades.length} sur {trades.length} trades affichés • PnL filtré : {' '}
            <strong className={`font-mono ${filteredPnLTotal >= 0 ? theme.winText : theme.lossText}`}>
              {filteredPnLTotal >= 0 ? '+' : ''}{settings.currencySymbol}{filteredPnLTotal.toFixed(2)}
            </strong>
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer btn-press self-start md:self-auto ${
            theme.btnPrimary
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nouveau Trade</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className={`p-3.5 rounded-2xl space-y-3 border ${theme.cardBg}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search text */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher paire, tag..."
              value={filterState.searchQuery}
              onChange={(e) => setFilterState({ ...filterState, searchQuery: e.target.value })}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none border transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:bg-white' 
                  : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] placeholder-[#8B96A3] focus:border-[#f75605]'
              }`}
            />
          </div>

          {/* Instrument / Symbol */}
          <div>
            <select
              value={filterState.symbol}
              onChange={(e) => setFilterState({ ...filterState, symbol: e.target.value })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs outline-none font-medium border transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500' 
                  : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605]'
              }`}
            >
              <option value="ALL">Tous les Instruments</option>
              {symbolsList.map((sym) => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <select
              value={filterState.side}
              onChange={(e) => setFilterState({ ...filterState, side: e.target.value })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs outline-none font-medium border transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500' 
                  : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605]'
              }`}
            >
              <option value="ALL">Toutes Directions</option>
              <option value="BUY">BUY (Long)</option>
              <option value="SELL">SELL (Short)</option>
            </select>
          </div>

          {/* Session / Killzone */}
          <div>
            <select
              value={filterState.killzone}
              onChange={(e) => setFilterState({ ...filterState, killzone: e.target.value })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs outline-none font-medium border transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500' 
                  : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605]'
              }`}
            >
              <option value="ALL">Toutes les Sessions</option>
              {killzonesList.map((kz) => (
                <option key={kz} value={kz}>{kz}</option>
              ))}
            </select>
          </div>

          {/* Outcome */}
          <div>
            <select
              value={filterState.outcome}
              onChange={(e) => setFilterState({ ...filterState, outcome: e.target.value })}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs outline-none font-medium border transition-colors ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500' 
                  : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605]'
              }`}
            >
              <option value="ALL">Tous les Résultats</option>
              <option value="WIN">Gagnants (+)</option>
              <option value="LOSS">Perdants (-)</option>
              <option value="BE">Break Even ($0)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => setFilterState({
              startDate: '',
              endDate: '',
              symbol: 'ALL',
              side: 'ALL',
              killzone: 'ALL',
              setup: 'ALL',
              tag: 'ALL',
              outcome: 'ALL',
              searchQuery: '',
            })}
            className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer btn-press ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                : 'bg-[#171E27] hover:bg-[#1C2430] text-[#8B96A3] border-[#252E38]'
            }`}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Mobile Card List View (Visible on Mobile Only) */}
      <div className="block md:hidden space-y-2.5">
        {filteredTrades.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-[#161922] border-[#232733] text-slate-500'
          }`}>
            Aucun trade ne correspond à vos filtres.
          </div>
        ) : (
          filteredTrades.map((t) => {
            const isWin = t.netPnL > 0;
            const isLoss = t.netPnL < 0;

            return (
              <div
                key={`mobile-${t.id}`}
                onClick={() => onSelectTrade(t)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all card-hover-lift btn-press ${theme.cardBg}`}
              >
                {/* Card Top Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${theme.textPrimary}`}>
                      {t.symbol}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                    }`}>
                      {t.side}
                    </span>
                    {t.setup && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${theme.badgeNeutral}`}>
                        {t.setup}
                      </span>
                    )}
                  </div>

                  {/* Net PnL Badge */}
                  <div className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
                    isWin ? theme.winBadge : isLoss ? theme.lossBadge : theme.badgeNeutral
                  }`}>
                    {isWin ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                  </div>
                </div>

                {/* Card Body Stats */}
                <div className={`grid grid-cols-3 gap-2 py-1.5 my-1.5 border-y text-[11px] font-mono ${theme.tableBorder}`}>
                  <div>
                    <span className={`block text-[9px] font-sans ${theme.textMuted}`}>Prix</span>
                    <strong className={theme.textPrimary}>{t.entry ?? '-'} → {t.exit ?? '-'}</strong>
                  </div>
                  <div>
                    <span className={`block text-[9px] font-sans ${theme.textMuted}`}>Lots</span>
                    <strong className={theme.textPrimary}>{t.lotSize ?? '1'}</strong>
                  </div>
                  <div>
                    <span className={`block text-[9px] font-sans ${theme.textMuted}`}>Multiple</span>
                    <strong className={theme.textPrimary}>{t.rMultiple !== undefined && t.rMultiple !== null ? `${Number(t.rMultiple) >= 0 ? '+' : ''}${Number(t.rMultiple).toFixed(2)}R` : '-'}</strong>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-mono ${theme.textMuted}`}>
                    {t.date} {t.time ? `• ${t.time}` : ''}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {onOpenAiReview && (
                      <button
                        onClick={() => onOpenAiReview(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 transition-all ${
                          isLight 
                            ? 'bg-orange-50 text-[#f75605] border-orange-200' 
                            : 'bg-[#2A1D13] text-[#f75605] border-[#f75605]/40'
                        }`}
                        title="AI Review"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>AI Review</span>
                      </button>
                    )}
                    <button
                      onClick={() => onSelectTrade(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${theme.badgeNeutral}`}
                    >
                      Détails
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Supprimer ce trade de l\'historique ?')) {
                          onDeleteTrade(t.id);
                        }
                      }}
                      className={`p-1 rounded border transition-all ${theme.lossBadge}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trades Table (Visible on Desktop Only) */}
      <div className={`hidden md:block rounded-2xl overflow-hidden border ${theme.cardBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead className={`border-b select-none text-[11px] uppercase tracking-wider ${theme.tableHeaderBg}`}>
              <tr>
                <th className={`p-3 cursor-pointer ${theme.tableRowHover}`} onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">
                    <span>Date & Heure</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className={`p-3 cursor-pointer ${theme.tableRowHover}`} onClick={() => toggleSort('symbol')}>
                  <div className="flex items-center gap-1">
                    <span>Symbole</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">Sens</th>
                <th className="p-3">Entry / Exit</th>
                <th className="p-3">SL / TP</th>
                <th className="p-3">Lots</th>
                <th className={`p-3 cursor-pointer text-right ${theme.tableRowHover}`} onClick={() => toggleSort('netPnL')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>PnL Net</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center">R Multiple</th>
                <th className="p-3">Setup</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.divideBorder}`}>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`p-10 text-center text-xs ${theme.textMuted}`}>
                    {trades.length === 0 ? (
                      <div className="space-y-3 max-w-sm mx-auto py-4">
                        <p className="font-medium">Aucun trade n'est actuellement enregistré.</p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={onOpenAddModal}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-xs cursor-pointer btn-press text-white ${
                              isLight ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#f75605] hover:bg-[#ea580c]'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5 inline mr-1" />
                            <span>Ajouter un Trade</span>
                          </button>
                          {onRestoreSampleData && (
                            <button
                              type="button"
                              onClick={onRestoreSampleData}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs border cursor-pointer btn-press ${
                                isLight 
                                  ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100' 
                                  : 'border-[#f75605]/40 text-[#f75605] bg-[#f75605]/10 hover:bg-[#f75605]/20'
                              }`}
                            >
                              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                              <span>Restaurer Démo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      'Aucun trade ne correspond à vos critères de filtrage.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWin = t.netPnL > 0;
                  const isLoss = t.netPnL < 0;

                  return (
                    <tr 
                      key={t.id} 
                      className={`transition-colors ${theme.tableRowHover}`}
                    >
                      <td className={`p-3 font-mono ${theme.textSecondary}`}>
                        <div>{t.date}</div>
                        {t.time && <div className={`text-[10px] ${theme.textMuted}`}>{t.time}</div>}
                      </td>

                      <td className={`p-3 font-bold ${theme.textPrimary}`}>
                        {t.symbol}
                      </td>

                      <td className="p-3">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                        }`}>
                          {t.side}
                        </span>
                      </td>

                      <td className={`p-3 font-mono ${theme.textMuted}`}>
                        {t.entry !== undefined ? t.entry : '-'} / {t.exit !== undefined ? t.exit : '-'}
                      </td>

                      <td className={`p-3 font-mono ${theme.textMuted}`}>
                        {t.stopLoss !== undefined ? <span className={theme.lossText}>{t.stopLoss}</span> : '-'} / {' '}
                        {t.takeProfit !== undefined ? <span className={theme.winText}>{t.takeProfit}</span> : '-'}
                      </td>

                      <td className={`p-3 font-mono ${theme.textSecondary}`}>
                        {t.lotSize !== undefined ? t.lotSize : '1'}
                      </td>

                      <td className={`p-3 text-right font-bold font-mono ${
                        isWin ? theme.winText : isLoss ? theme.lossText : theme.textMuted
                      }`}>
                        {isWin ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                      </td>

                      <td className={`p-3 text-center font-mono font-medium ${theme.textPrimary}`}>
                        {t.rMultiple !== undefined && t.rMultiple !== null ? `${Number(t.rMultiple) >= 0 ? '+' : ''}${Number(t.rMultiple).toFixed(2)}R` : '-'}
                      </td>

                      <td className="p-3">
                        {t.setup && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium border ${theme.badgeNeutral}`}>
                            {t.setup}
                          </span>
                        )}
                        <div className={`text-[10px] ${theme.textMuted}`}>{t.source}</div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onOpenAiReview && (
                            <button
                              onClick={() => onOpenAiReview(t)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer text-[#f75605] hover:bg-[#f75605]/10`}
                              title="AI Review du Trade"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectTrade(t)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-900 dark:hover:text-white`}
                            title="Voir détails"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Supprimer ce trade de l\'historique ?')) {
                                onDeleteTrade(t.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-rose-500`}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
