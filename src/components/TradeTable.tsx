import React, { useState } from 'react';
import { Trade } from '../types/trade';
import { DataQualityBadge } from './DataQualityBadge';
import { formatCurrency, formatRMultiple } from '../lib/formatting';
import {
  Trash2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Layers,
  Sparkles,
  Upload,
} from 'lucide-react';

interface Props {
  trades?: Trade[];
  onDelete: (id: string) => void;
  onSelect: (trade: Trade) => void;
  onSeed: () => void;
  onOpenCreate: () => void;
  onOpenImport?: () => void;
}

export const TradeTable: React.FC<Props> = ({
  trades = [],
  onDelete,
  onSelect,
  onSeed,
  onOpenCreate,
  onOpenImport,
}) => {
  const safeTrades = trades || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTrades = safeTrades.filter((trade) => {
    if (!trade) return false;
    if (filterStatus !== 'ALL' && trade.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSymbol = trade.symbol ? trade.symbol.toLowerCase().includes(q) : false;
      const matchTicket = trade.ticket ? trade.ticket.toLowerCase().includes(q) : false;
      const matchSetup = trade.setup ? trade.setup.toLowerCase().includes(q) : false;
      const matchTags = trade.tags && Array.isArray(trade.tags)
        ? trade.tags.some((t) => t && t.toLowerCase().includes(q))
        : false;
      if (!matchSymbol && !matchTicket && !matchSetup && !matchTags) return false;
    }
    return true;
  });

  if (safeTrades.length === 0) {
    return (
      <div
        id="empty-database-state"
        className="bg-white dark:bg-[#12151D] border border-dashed border-[#DDD5FA] dark:border-[#292E38] rounded-3xl p-12 text-center shadow-sm"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 border border-[#DDD5FA] dark:border-[#FF8A00]/30 flex items-center justify-center mx-auto text-[#6D19E8] dark:text-[#FF8A00] mb-4 shadow-xs">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Journal de Trading Vide</h3>
        <p className="text-xs text-[#6B668D] dark:text-[#9299A8] max-w-md mx-auto mt-1.5 font-medium">
          Aucun trade enregistré dans votre base locale. Importez vos trades depuis un fichier CSV, Excel, PDF ou Word, ou chargez les données de démonstration.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {onOpenImport && (
            <button
              id="btn-empty-import-trades"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] text-white transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer btn-press btn-icon-animate group"
            >
              <Upload className="w-4 h-4 btn-icon-bounce" />
              <span>Importer Fichier (CSV, Excel, PDF, Word)</span>
            </button>
          )}
          <button
            id="btn-empty-load-seed"
            onClick={onSeed}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#202531] text-[#0F0E26] dark:text-[#F5F5F5] border border-[#ECE7FC] dark:border-[#292E38] transition-all duration-200 cursor-pointer shadow-xs btn-press btn-icon-animate group"
          >
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 btn-icon" />
            <span>Charger 15 Trades de Démonstration</span>
          </button>
          <button
            id="btn-empty-create-trade"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#202531] text-[#0F0E26] dark:text-[#F5F5F5] border border-[#ECE7FC] dark:border-[#292E38] transition-all duration-200 cursor-pointer shadow-xs btn-press"
          >
            <span>Enregistrer un Trade</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="trade-table-container"
      className="bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow font-sans"
    >
      {/* Table toolbar */}
      <div className="p-4 border-b border-[#ECE7FC] dark:border-[#292E38] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#FAF8FF] dark:bg-[#181C25]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#8E89AF] dark:text-[#9299A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par symbole, ticket, setup, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#0B0D12] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl pl-10 pr-3 py-2 text-xs text-[#0F0E26] dark:text-[#F5F5F5] placeholder-[#8E89AF] dark:placeholder-[#9299A8] focus:outline-none focus:ring-2 focus:ring-[#6D19E8] dark:focus:ring-[#FF8A00] transition font-medium shadow-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30 hover:bg-[#EBDDFF] dark:hover:bg-[#FF8A00]/20 font-bold transition cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer Fichier</span>
            </button>
          )}

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-[#0B0D12] border border-[#ECE7FC] dark:border-[#292E38] text-[#0F0E26] dark:text-[#F5F5F5] rounded-2xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#6D19E8] dark:focus:ring-[#FF8A00] font-bold shadow-xs cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="CLOSED">Clôturés (Closed)</option>
            <option value="OPEN">En cours (Open)</option>
          </select>

          <span className="text-[11px] text-[#8E89AF] dark:text-[#9299A8] tabular-nums pl-2 font-bold">
            {filteredTrades.length} sur {trades.length} trades
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8FF] dark:bg-[#0B0D12] border-b border-[#ECE7FC] dark:border-[#292E38] text-[#8E89AF] dark:text-[#9299A8] uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="py-3 px-4 font-bold">Ticket / Ref</th>
              <th className="py-3 px-4 font-bold">Symbole / Dir</th>
              <th className="py-3 px-4 font-bold">Date Ouverture</th>
              <th className="py-3 px-4 font-bold">Entrée / Sortie</th>
              <th className="py-3 px-4 font-bold">P&amp;L Net</th>
              <th className="py-3 px-4 font-bold">R-Multiple</th>
              <th className="py-3 px-4 font-bold">Risque / Solde</th>
              <th className="py-3 px-4 font-bold">Setup / Killzone</th>
              <th className="py-3 px-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE7FC] dark:divide-[#292E38] font-sans">
            {filteredTrades.map((trade) => {
              const isBuy = trade.direction === 'BUY';
              const pnl = trade.netPnL;

              return (
                <tr
                  key={trade.id}
                  id={`trade-row-${trade.id}`}
                  className="hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition group"
                >
                  {/* Ticket & Fingerprint */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold tabular-nums">
                      {trade.ticket ? `#${trade.ticket}` : '—'}
                    </div>
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] truncate max-w-[90px] font-medium" title={trade.sourceId}>
                      {trade.sourceId}
                    </div>
                  </td>

                  {/* Symbol & Direction */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">{trade.symbol}</span>
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          isBuy
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-3 h-3 mr-0.5 inline stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-0.5 inline stroke-[2.5]" />
                        )}
                        {trade.direction}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-medium">
                      {trade.status}
                    </span>
                  </td>

                  {/* Open Date */}
                  <td className="py-3 px-4 whitespace-nowrap tabular-nums text-[#6B668D] dark:text-[#9299A8] font-medium">
                    <div className="text-[#0F0E26] dark:text-[#F5F5F5] font-semibold">{new Date(trade.openedAt).toISOString().slice(0, 10)}</div>
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8]">
                      {new Date(trade.openedAt).toISOString().slice(11, 19)} UTC
                    </div>
                  </td>

                  {/* Entry & Exit Prices */}
                  <td className="py-3 px-4 whitespace-nowrap tabular-nums font-medium">
                    <div className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold">
                      {trade.entryPrice !== null ? trade.entryPrice.toFixed(trade.entryPrice < 10 ? 4 : 2) : '—'}
                    </div>
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8]">
                      Sortie: {trade.exitPrice !== null ? trade.exitPrice.toFixed(trade.exitPrice < 10 ? 4 : 2) : '—'}
                    </div>
                  </td>

                  {/* Net P&L */}
                  <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                    {pnl !== null ? (
                      <span
                        className={`font-bold ${
                          pnl > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : pnl < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[#6B668D] dark:text-[#9299A8]'
                        }`}
                      >
                        {formatCurrency(pnl, 'EUR')}
                      </span>
                    ) : (
                      <span className="text-[#8E89AF] dark:text-[#9299A8] font-medium">—</span>
                    )}
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-medium">
                      Frais: {trade.commission !== null ? formatCurrency(trade.commission, 'EUR') : '—'}
                    </div>
                  </td>

                  {/* R-Multiple */}
                  <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                    {trade.rMultiple !== null ? (
                      <span
                        className={`font-bold ${
                          trade.rMultiple > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : trade.rMultiple < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[#6B668D] dark:text-[#9299A8]'
                        }`}
                      >
                        {formatRMultiple(trade.rMultiple)}
                      </span>
                    ) : (
                      <span className="text-[#8E89AF] dark:text-[#9299A8] font-medium" title="Unknown risk amount -> R is null">
                        —
                      </span>
                    )}
                  </td>

                  {/* Risk / Balance */}
                  <td className="py-3 px-4 whitespace-nowrap tabular-nums text-[11px] text-[#6B668D] dark:text-[#9299A8] font-medium">
                    <div>
                      Risque: {trade.initialRiskAmount !== null ? formatCurrency(trade.initialRiskAmount, 'EUR', { showSign: false }) : '—'}
                    </div>
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8]">
                      Solde: {trade.balanceBefore !== null ? formatCurrency(trade.balanceBefore, 'EUR', { showSign: false }) : '—'}
                    </div>
                  </td>

                  {/* Setup & Killzone */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-[#0F0E26] dark:text-[#F5F5F5] font-bold truncate max-w-[130px]" title={trade.setup ?? ''}>
                      {trade.setup || '—'}
                    </div>
                    <div className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-medium">
                      {trade.session || 'NO_SESSION'} • {trade.timeframe || '—'}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelect(trade)}
                        className="p-2 rounded-xl bg-[#FAF8FF] dark:bg-[#0B0D12] hover:bg-[#F3EEFF] dark:hover:bg-[#202531] text-[#0F0E26] dark:text-[#F5F5F5] hover:text-[#6D19E8] dark:hover:text-[#FF8A00] transition-all duration-200 cursor-pointer border border-[#ECE7FC] dark:border-[#292E38] shadow-xs btn-press group/btn"
                        title="Inspecter le trade"
                      >
                        <Eye className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-115" />
                      </button>
                      <button
                        onClick={() => onDelete(trade.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-all duration-200 cursor-pointer border border-rose-200/60 dark:border-rose-500/20 shadow-xs btn-press group/del"
                        title="Supprimer le trade"
                      >
                        <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/del:scale-115 group-hover/del:rotate-6" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

