import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, FileText, FileType, FileCode, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Sparkles, Check, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Trade } from '../types/trade';
import { ParsedTradePreview } from '../types/import';
import { defaultImportPipeline, ImportPreviewResult } from '../lib/import-pipeline/pipeline';
import { TradeRepository } from '../lib/database/repositories/tradeRepository';
import { formatCurrency, formatRMultiple } from '../lib/formatting';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedCount: number, duplicatesSkipped: number) => void;
  existingTrades: Trade[];
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete, existingTrades }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [previews, setPreviews] = useState<ParsedTradePreview[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'DUPLICATES'>('ALL');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setErrorMessage(null);
    setImportDone(false);
    try {
      const binary = /\.(xlsx|xls|xlsm|pdf|docx|doc)$/i.test(uploadedFile.name);
      const content = binary ? await uploadedFile.arrayBuffer() : await uploadedFile.text();
      const result = await defaultImportPipeline.parseAndPreview({ name: uploadedFile.name, content, mimeType: uploadedFile.type }, existingTrades);
      setPreviewResult(result);
      setPreviews(result.previews);
      if (!result.totalParsed) setErrorMessage('Aucune ligne de trade valide n\'a pu être extraite de ce document.');
    } catch (err) {
      console.error('Import processing error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Erreur inattendue lors de l’analyse du fichier.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectAll = (checked: boolean) => setPreviews((prev) => prev.map((p) => ({ ...p, selectedForImport: checked ? (skipDuplicates ? !p.isDuplicate : true) : false })));
  const toggle = (id: string) => setPreviews((prev) => prev.map((p) => p.tempId === id ? { ...p, selectedForImport: !p.selectedForImport } : p));

  const executeImport = async () => {
    if (!previewResult) return;
    const selected = previews.filter((p) => p.selectedForImport);
    if (!selected.length) { setErrorMessage('Aucun trade sélectionné pour l’importation.'); return; }
    setIsSaving(true);
    setErrorMessage(null);
    let imported = 0;
    let duplicates = previews.filter((p) => p.isDuplicate && !p.selectedForImport).length;
    let invalid = previewResult.report.invalid;
    try {
      for (const preview of selected) {
        const normalized = previewResult.normalizedTrades[preview.rowNumber - 1];
        if (!normalized) { invalid++; continue; }
        try {
          await TradeRepository.create(normalized, false);
          imported++;
        } catch (err) {
          if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'DUPLICATE_TRADE_ERROR') duplicates++;
          else invalid++;
        }
      }
      const report = previewResult.report;
      const dateRange = report.dateFrom && report.dateTo
        ? `${new Date(report.dateFrom).toLocaleDateString('fr-FR')} → ${new Date(report.dateTo).toLocaleDateString('fr-FR')}`
        : 'Aucune date valide';
      setPreviewResult((prev) => prev ? {
        ...prev,
        report: { ...prev.report, imported, duplicates, invalid, calculatedPnl: report.calculatedPnl, pnlDifference: report.pnlDifference, pnlMismatchWarning: report.pnlMismatchWarning },
      } : prev);
      setImportDone(true);
      if (report.pnlMismatchWarning) setErrorMessage('Attention : le total calculé ne correspond pas exactement au total du relevé, vérifiez l’import');
      onImportComplete(imported, duplicates);
      console.info(`[Import] ${imported} trades importés, ${duplicates} doublons ignorés, ${invalid} lignes invalides, période ${dateRange}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement dans la base de données.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null); setPreviewResult(null); setPreviews([]); setErrorMessage(null); setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = previews.filter((p) => {
    if (filter === 'NEW' && p.isDuplicate) return false;
    if (filter === 'DUPLICATES' && !p.isDuplicate) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.symbol.toLowerCase().includes(q) || !!p.ticket?.toLowerCase().includes(q) || !!p.setup?.toLowerCase().includes(q);
  });

  const selectedCount = previews.filter((p) => p.selectedForImport).length;
  const duplicateCount = previews.filter((p) => p.isDuplicate).length;
  const newCount = previews.length - duplicateCount;
  const report = previewResult?.report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"><Upload className="w-5 h-5" /></div><div><h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Importation Universelle de Trades</h2><p className="text-xs text-slate-500 dark:text-slate-400">CSV, Excel, Word, PDF & JSON avec parsing robuste et anti-doublon.</p></div></div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${errorMessage.startsWith('Attention') ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}><AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMessage}</span></div>}

          {report && (
            <div className={`p-4 rounded-xl border text-xs ${report.pnlMismatchWarning ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-3"><CheckCircle2 className="w-4 h-4" /> Rapport d’import — {importDone ? 'import terminé' : 'vérification avant import'}</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div><div className="text-slate-500">Trades importés</div><strong className="text-base">{report.imported}</strong></div>
                <div><div className="text-slate-500">Doublons ignorés</div><strong className="text-base">{report.duplicates}</strong></div>
                <div><div className="text-slate-500">Lignes invalides</div><strong className="text-base">{report.invalid}</strong></div>
                <div><div className="text-slate-500">Plage de dates</div><strong>{report.dateFrom && report.dateTo ? `${new Date(report.dateFrom).toLocaleDateString('fr-FR')} → ${new Date(report.dateTo).toLocaleDateString('fr-FR')}` : '—'}</strong></div>
                <div><div className="text-slate-500">PnL calculé</div><strong className="text-base">{formatCurrency(report.calculatedPnl, 'EUR')}</strong></div>
              </div>
              {report.sourceTotalPnl !== null && <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">Total relevé : <strong>{formatCurrency(report.sourceTotalPnl, 'EUR')}</strong> · Écart : <strong>{formatCurrency(report.pnlDifference ?? 0, 'EUR')}</strong></div>}
              {report.pnlMismatchWarning && <div className="mt-2 font-semibold text-amber-800 dark:text-amber-300">Attention : le total calculé ne correspond pas exactement au total du relevé, vérifiez l’import</div>}
            </div>
          )}

          {!previewResult && (
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'}`}>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.pdf,.docx,.doc,.json" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" />
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">{isProcessing ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}</div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">{isProcessing ? 'Analyse intelligente du document...' : 'Glissez-déposez votre fichier de trades ici'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Le moteur détecte automatiquement le tableau Trades, le format broker/Notion et ignore les sections résumé.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-5 text-[11px]"><span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40"><FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />CSV/TSV</span><span className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/40"><FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />Excel</span><span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40"><FileText className="w-3.5 h-3.5 inline mr-1" />PDF</span><span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40"><FileType className="w-3.5 h-3.5 inline mr-1" />Word</span><span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40"><FileCode className="w-3.5 h-3.5 inline mr-1" />JSON</span></div>
            </div>
          )}

          {previewResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><div className="text-[11px] text-slate-500">Total détecté</div><strong className="text-lg">{previewResult.totalParsed}</strong></div><div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"><div className="text-[11px] text-emerald-700">Nouveaux</div><strong className="text-lg text-emerald-600">{newCount}</strong></div><div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"><div className="text-[11px] text-amber-700">Doublons</div><strong className="text-lg text-amber-600">{duplicateCount}</strong></div><div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"><div className="text-[11px] text-indigo-700">Sélectionnés</div><strong className="text-lg text-indigo-600">{selectedCount}/{previews.length}</strong></div></div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"><div className="flex flex-wrap gap-2"><button onClick={() => selectAll(true)} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Tout cocher</button><button onClick={() => selectAll(false)} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Tout décocher</button><button onClick={() => setFilter('ALL')} className="px-2.5 py-1 rounded-lg">Tous</button><button onClick={() => setFilter('NEW')} className="px-2.5 py-1 rounded-lg text-emerald-600">Nouveaux</button><button onClick={() => setFilter('DUPLICATES')} className="px-2.5 py-1 rounded-lg text-amber-600">Doublons</button></div><div className="flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none" /><label className="flex items-center gap-1.5"><input type="checkbox" checked={skipDuplicates} onChange={(e) => { setSkipDuplicates(e.target.checked); if (e.target.checked) setPreviews((prev) => prev.map((p) => p.isDuplicate ? { ...p, selectedForImport: false } : p)); }} /> Ignorer les doublons</label></div></div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10"><tr><th className="py-2 px-3">✓</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Symbole</th><th className="py-2 px-3">Entrée/Sortie</th><th className="py-2 px-3">P&L Net</th><th className="py-2 px-3">R</th><th className="py-2 px-3">Statut</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((p) => <tr key={p.tempId} className={p.isDuplicate ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}><td className="py-2 px-3"><input type="checkbox" checked={p.selectedForImport} onChange={() => toggle(p.tempId)} /></td><td className="py-2 px-3 whitespace-nowrap">{new Date(p.openedAt).toLocaleString('fr-FR')}</td><td className="py-2 px-3 font-semibold"><span>{p.symbol}</span><span className="ml-1 text-[10px]">{p.direction === 'BUY' ? <ArrowUpRight className="w-3 h-3 inline text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 inline text-rose-500" />}</span></td><td className="py-2 px-3 tabular-nums">{p.entryPrice ?? '—'} / {p.exitPrice ?? '—'}</td><td className="py-2 px-3 font-semibold">{p.netPnL !== null ? formatCurrency(p.netPnL, 'EUR') : '—'}</td><td className="py-2 px-3">{p.rMultiple !== null ? formatRMultiple(p.rMultiple) : p.plannedRR ? `1:${p.plannedRR.toFixed(1)}` : '—'}</td><td className="py-2 px-3">{p.isDuplicate ? <span className="text-amber-600"><AlertTriangle className="w-3 h-3 inline mr-1" />Doublon</span> : <span className="text-emerald-600"><Check className="w-3 h-3 inline mr-1" />Nouveau</span>}</td></tr>)}</tbody></table></div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40"><button onClick={onClose} className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700">Fermer</button>{previewResult && !importDone && <div className="flex gap-2"><button onClick={reset} className="px-3.5 py-2 text-xs rounded-xl">Réinitialiser</button><button onClick={executeImport} disabled={isSaving || !selectedCount} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">{isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {isSaving ? 'Enregistrement…' : `Importer ${selectedCount} trade(s)`}</button></div>}</div>
      </motion.div>
    </div>
  );
};
