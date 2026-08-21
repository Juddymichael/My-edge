import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { AccountTransaction, UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  Search, 
  Wallet, 
  ArrowUpDown,
  X
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: AccountTransaction[];
  settings: UserAppSettings;
  onAddTransaction: (transaction: Omit<AccountTransaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  settings,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Form state for adding manual deposit/withdrawal
  const [newType, setNewType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newDescription, setNewDescription] = useState('');

  const totalDeposits = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalWithdrawals = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const netCashFlow = totalDeposits - totalWithdrawals;

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchDesc = t.description?.toLowerCase().includes(q);
          const matchDate = t.date.includes(q);
          if (!matchDesc && !matchDate) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [transactions, filterType, searchQuery, sortOrder]);

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newAmount);
    if (isNaN(parsed) || parsed <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    onAddTransaction({
      date: newDate,
      type: newType,
      amount: parsed,
      description: newDescription.trim() || (newType === 'DEPOSIT' ? 'Dépôt manuel' : 'Retrait manuel'),
      source: 'Manual Entry',
    });

    setNewAmount('');
    setNewDescription('');
    setShowAddModal(false);
  };

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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b ${theme.tableBorder}`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={theme.sectionTitle}>Transactions de Compte</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${theme.badgeNeutral}`}>
              Dépôts & Retraits
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
            Gérez les flux de trésorerie sans affecter vos statistiques de performance de trading
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer btn-press self-start sm:self-auto ${
            theme.btnPrimary
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nouvelle Transaction</span>
        </button>
      </div>

      {/* 3 Cartes de Synthèse Trésorerie */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Dépôts */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Total Dépôts</span>
            <div className={`p-1 rounded-md border ${theme.winBadge}`}>
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${theme.winText}`}>
            +{settings.currencySymbol}{totalDeposits.toFixed(2)}
          </div>
          <div className={`text-[11px] mt-1 ${theme.textMuted}`}>
            {transactions.filter((t) => t.type === 'DEPOSIT').length} dépôts enregistrés
          </div>
        </div>

        {/* Total Retraits */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Total Retraits</span>
            <div className={`p-1 rounded-md border ${theme.lossBadge}`}>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${theme.lossText}`}>
            -{settings.currencySymbol}{totalWithdrawals.toFixed(2)}
          </div>
          <div className={`text-[11px] mt-1 ${theme.textMuted}`}>
            {transactions.filter((t) => t.type === 'WITHDRAWAL').length} retraits enregistrés
          </div>
        </div>

        {/* Flux Net */}
        <div className={`p-4 rounded-xl border ${theme.cardBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={theme.label}>Flux Net (Dépôts - Retraits)</span>
            <div className={`p-1 rounded-md border ${theme.badgeNeutral}`}>
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${
            netCashFlow >= 0 ? theme.winText : theme.lossText
          }`}>
            {netCashFlow >= 0 ? '+' : ''}{settings.currencySymbol}{netCashFlow.toFixed(2)}
          </div>
          <div className={`text-[11px] mt-1 ${theme.textMuted}`}>
            Impact direct sur le capital disponible
          </div>
        </div>
      </div>

      {/* Barre de Recherche & Filtres */}
      <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.cardBg}`}>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une transaction (description, date)..."
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border transition-colors outline-hidden ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900 placeholder-slate-400' 
                  : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2] placeholder-[#8B96A3]'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs ${theme.innerBg}`}>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'ALL'
                  ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-[#252A38] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('DEPOSIT')}
              className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === 'DEPOSIT'
                  ? theme.winBadge
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>Dépôts</span>
            </button>
            <button
              onClick={() => setFilterType('WITHDRAWAL')}
              className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === 'WITHDRAWAL'
                  ? theme.lossBadge
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Retraits</span>
            </button>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className={`p-1.5 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer btn-press ${theme.badgeNeutral}`}
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>{sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}</span>
          </button>
        </div>
      </div>

      {/* Tableau des Transactions */}
      <div className={`overflow-x-auto border rounded-xl ${theme.cardBg}`}>
        <table className="w-full text-left text-xs border-collapse min-w-[600px]">
          <thead className={`border-b text-[11px] uppercase tracking-wider ${theme.tableHeaderBg}`}>
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Date</th>
              <th className="p-3">Description / Source</th>
              <th className="p-3 text-right">Montant</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme.divideBorder}`}>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className={`p-8 text-center text-xs ${theme.textMuted}`}>
                  Aucune transaction enregistrée.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className={`transition-colors ${theme.tableRowHover}`}
                >
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 w-max ${
                      tx.type === 'DEPOSIT' ? theme.winBadge : theme.lossBadge
                    }`}>
                      {tx.type === 'DEPOSIT' ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Dépôt</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Retrait</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className={`p-3 font-mono ${theme.textPrimary}`}>
                    {tx.date} {tx.time && <span className={`text-[10px] ml-1 ${theme.textMuted}`}>{tx.time}</span>}
                  </td>
                  <td className="p-3">
                    <div className={`font-medium ${theme.textPrimary}`}>{tx.description || (tx.type === 'DEPOSIT' ? 'Dépôt Compte' : 'Retrait Compte')}</div>
                    <div className={`text-[10px] ${theme.textMuted}`}>{tx.source || 'Manuel'}</div>
                  </td>
                  <td className={`p-3 font-mono font-bold text-right text-sm ${
                    tx.type === 'DEPOSIT' ? theme.winText : theme.lossText
                  }`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{settings.currencySymbol}{tx.amount.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer cette transaction de ${tx.amount}${settings.currencySymbol} ?`)) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Supprimer la transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme.tableBorder}`}>
              <h3 className={`text-base font-bold flex items-center gap-2 ${theme.textPrimary}`}>
                <Wallet className="w-4 h-4 text-slate-400" />
                <span>Ajouter une transaction</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${theme.badgeNeutral}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className={theme.label}>
                  Type d'opération
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('DEPOSIT')}
                    className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all btn-press ${
                      newType === 'DEPOSIT'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : theme.badgeNeutral
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Dépôt (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('WITHDRAWAL')}
                    className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all btn-press ${
                      newType === 'WITHDRAWAL'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : theme.badgeNeutral
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Retrait (-)</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={theme.label}>
                  Montant ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ex: 500"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border transition-colors outline-hidden ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900' 
                      : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2]'
                  }`}
                />
              </div>

              {/* Date */}
              <div>
                <label className={theme.label}>
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition-colors outline-hidden ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900' 
                      : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2]'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={theme.label}>
                  Description / Libellé (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Virement bancaire, Retrait bénéfices..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition-colors outline-hidden ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900 placeholder-slate-400' 
                      : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2] placeholder-[#8B96A3]'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border ${theme.badgeNeutral}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 font-semibold text-xs rounded-xl text-white btn-press ${
                    newType === 'DEPOSIT'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
