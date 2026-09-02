import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  FileType,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, NewTradeInput } from '../types/trade';
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

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingTrades,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [previews, setPreviews] = useState<ParsedTradePreview[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [filterDuplicateOnly, setFilterDuplicateOnly] = useState<'ALL' | 'NEW' | 'DUPLICATES'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ imported: number; duplicates: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setErrorMessage(null);
    setImportSummary(null);

    try {
      let content: string | ArrayBuffer;
      const lowerName = uploadedFile.name.toLowerCase();

      if (
        lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.pdf') ||
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.doc')
      ) {
        content = await uploadedFile.arrayBuffer();
      } else {
        content = await uploadedFile.text();
      }

      const result = await defaultImportPipeline.parseAndPreview(
        {
          name: uploadedFile.name,
          content,
          mimeType: uploadedFile.type,
        },
        existingTrades
      );

      if (result.totalParsed === 0) {
        setErrorMessage(
          'Aucune ligne de trade valide n\'a pu être extraite de ce document. Vérifiez le format du fichier.'
        );
      }

      setPreviewResult(result);
      setPreviews(result.previews);
    } catch (err: unknown) {
      console.error('Import processing error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur inattendue lors de l\'analyse du fichier.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection for a single trade
  const toggleSelectTrade = (tempId: string) => {
    setPreviews((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, selectedForImport: !p.selectedForImport } : p))
    );
  };

  // Select all / Deselect all
  const selectAll = (select: boolean) => {
    setPreviews((prev) =>
      prev.map((p) => ({
        ...p,
        selectedForImport: select ? (skipDuplicates ? !p.isDuplicate : true) : false,
      }))
    );
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!previewResult || previews.length === 0) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const selectedPreviews = previews.filter((p) => p.selectedForImport);
      if (selectedPreviews.length === 0) {
        setErrorMessage('Aucun trade sélectionné pour l\'importation.');
        setIsSaving(false);
        return;
      }

      let savedCount = 0;
      let duplicatesSkipped = 0;

      for (const preview of selectedPreviews) {
        const matchingNorm = previewResult.normalizedTrades[preview.rowNumber - 1];
        if (!matchingNorm) continue;

        try {
          await TradeRepository.create(matchingNorm, false);
          savedCount++;
        } catch (err: unknown) {
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: string }).code === 'DUPLICATE_TRADE_ERROR'
          ) {
            duplicatesSkipped++;
          } else {
            console.warn(`Trade creation error on row ${preview.rowNumber}:`, err);
          }
        }
      }

      // Also count unselected duplicates as skipped
      const ignoredDuplicates = previews.filter((p) => p.isDuplicate && !p.selectedForImport).length;
      const totalDuplicatesHandled = duplicatesSkipped + ignoredDuplicates;

      setImportSummary({
        imported: savedCount,
        duplicates: totalDuplicatesHandled,
      });

      onImportComplete(savedCount, totalDuplicatesHandled);
    } catch (err: unknown) {
      console.error('Execution error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement dans la base de données.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewResult(null);
    setPreviews([]);
    setErrorMessage(null);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sample data generator for quick test
  const handleLoadSampleCsv = () => {
    const sampleCsv = `Ticket,Open Time,Close Time,Type,Size,Item,Price,S / L,T / P,Price,Commission,Swap,Profit,Comment
10884210,2026.08.18 09:30:00,2026.08.18 10:45:00,buy,1.50,EURUSD,1.08500,1.08250,1.09250,1.09100,-4.50,0.00,900.00,London Golden FVG
10884211,2026.08.19 14:00:00,2026.08.19 15:30:00,sell,2.00,GBPUSD,1.29500,1.29800,1.28600,1.28850,-6.00,-1.20,1300.00,NY CISD Sweep
10884212,2026.08.20 10:15:00,2026.08.20 11:00:00,buy,0.50,XAUUSD,2450.00,2442.00,2475.00,2442.00,-3.00,0.00,-400.00,OB Mitigation SL
10884213,2026.08.21 15:00:00,2026.08.21 16:30:00,sell,1.00,SPX500,5620.00,5635.00,5570.00,5585.00,-2.00,0.00,1750.00,PM Killzone FVG`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const sampleFile = new File([blob], 'mt5_statement_sample.csv', { type: 'text/csv' });
    processFile(sampleFile);
  };

  // Filter previews
  const filteredPreviews = previews.filter((p) => {
    if (filterDuplicateOnly === 'NEW' && p.isDuplicate) return false;
    if (filterDuplicateOnly === 'DUPLICATES' && !p.isDuplicate) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSymbol = p.symbol.toLowerCase().includes(q);
      const matchTicket = p.ticket ? p.ticket.toLowerCase().includes(q) : false;
      const matchSetup = p.setup ? p.setup.toLowerCase().includes(q) : false;
      if (!matchSymbol && !matchTicket && !matchSetup) return false;
    }
    return true;
  });

  const selectedCount = previews.filter((p) => p.selectedForImport).length;
  const duplicateCount = previews.filter((p) => p.isDuplicate).length;
  const newCount = previews.filter((p) => !p.isDuplicate).length;

  return (
    <div
      id="import-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                Importation Universelle de Trades
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supporte CSV, Excel (.xlsx/.xls), Word (.docx), PDF & JSON avec calcul automatique du R:R et détection anti-doublon.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Summary Banner */}
          {importSummary && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Importation terminée avec succès !</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                • <strong>{importSummary.imported}</strong> nouveau(x) trade(s) enregistré(s) dans le journal.<br />
                • <strong>{importSummary.duplicates}</strong> doublon(s) détecté(s) et ignoré(s) automatiquement.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs transition cursor-pointer"
                >
                  Fermer et consulter le Journal
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Upload Zone (If no preview yet) */}
          {!previewResult && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.pdf,.docx,.doc,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {isProcessing ? 'Analyse intelligente du document...' : 'Glissez-déposez votre fichier de trades ici'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  Cliquez ou déposez votre relevé de compte, rapport broker, export MT4/MT5, cTrader, PDF ou tableau Excel/Word.
                </p>

                {/* Formats Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV / TSV
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60 text-green-700 dark:text-green-300 text-[11px] font-medium">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx, .xls)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[11px] font-medium">
                    <FileText className="w-3.5 h-3.5" /> PDF (.pdf)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-medium">
                    <FileType className="w-3.5 h-3.5" /> Word (.docx)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                    <FileCode className="w-3.5 h-3.5" /> JSON
                  </span>
                </div>
              </div>

              {/* Sample test button */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Envie de tester immédiatement ? Chargez un exemple de relevé MT5.</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleCsv}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition cursor-pointer"
                >
                  Charger Relevé Démo
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Trade Preview & Selection Table */}
          {previewResult && (
            <div className="space-y-4">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Détecté</div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                    {previewResult.totalParsed} trades
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Nouveaux Trades</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {newCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Doublons Détectés</div>
                  <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {duplicateCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">Sélectionnés</div>
                  <div className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {selectedCount} / {previews.length}
                  </div>
                </div>
              </div>

              {/* Table Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => selectAll(true)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Tout Cocher
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Tout Décocher
                  </button>

                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

                  {/* Filter duplicate tab buttons */}
                  <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setFilterDuplicateOnly('ALL')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        filterDuplicateOnly === 'ALL'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Tous ({previews.length})
                    </button>
                    <button
                      onClick={() => setFilterDuplicateOnly('NEW')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        filterDuplicateOnly === 'NEW'
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Nouveaux ({newCount})
                    </button>
                    {duplicateCount > 0 && (
                      <button
                        onClick={() => setFilterDuplicateOnly('DUPLICATES')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          filterDuplicateOnly === 'DUPLICATES'
                            ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Doublons ({duplicateCount})
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => {
                        setSkipDuplicates(e.target.checked);
                        if (e.target.checked) {
                          // Uncheck all duplicates automatically
                          setPreviews((prev) =>
                            prev.map((p) => (p.isDuplicate ? { ...p, selectedForImport: false } : p))
                          );
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Ignorer les doublons</span>
                  </label>
                  <button
                    onClick={handleReset}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Changer de fichier"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedCount > 0 && selectedCount === previews.length}
                          onChange={(e) => selectAll(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="py-2.5 px-3">Date / Ticket</th>
                      <th className="py-2.5 px-3">Symbole</th>
                      <th className="py-2.5 px-3">Entrée / Sortie</th>
                      <th className="py-2.5 px-3">SL / TP</th>
                      <th className="py-2.5 px-3">P&L Net</th>
                      <th className="py-2.5 px-3">Ratio R:R (R-Multiple)</th>
                      <th className="py-2.5 px-3">Statut Doublon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {filteredPreviews.map((p) => {
                      const isBuy = p.direction === 'BUY';
                      return (
                        <tr
                          key={p.tempId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            p.isDuplicate
                              ? 'bg-amber-50/20 dark:bg-amber-950/10 opacity-75'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={p.selectedForImport}
                              onChange={() => toggleSelectTrade(p.tempId)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Date / Ticket */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                              {new Date(p.openedAt).toISOString().slice(0, 10)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {p.ticket ? `#${p.ticket}` : `Ligne ${p.rowNumber}`}
                            </div>
                          </td>

                          {/* Symbol & Direction */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{p.symbol}</span>
                              <span
                                className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                  isBuy
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                }`}
                              >
                                {isBuy ? (
                                  <ArrowUpRight className="w-3 h-3 mr-0.5 inline" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 mr-0.5 inline" />
                                )}
                                {p.direction}
                              </span>
                            </div>
                            {p.setup && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                                {p.setup}
                              </div>
                            )}
                          </td>

                          {/* Entry / Exit */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              In: {p.entryPrice !== null ? p.entryPrice.toFixed(p.entryPrice < 10 ? 4 : 2) : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              Out: {p.exitPrice !== null ? p.exitPrice.toFixed(p.exitPrice < 10 ? 4 : 2) : '—'}
                            </div>
                          </td>

                          {/* SL / TP */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                            <div className="text-slate-600 dark:text-slate-300">
                              SL: {p.stopLoss !== null ? p.stopLoss.toFixed(p.stopLoss < 10 ? 4 : 2) : '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              TP: {p.takeProfit !== null ? p.takeProfit.toFixed(p.takeProfit < 10 ? 4 : 2) : '—'}
                            </div>
                          </td>

                          {/* P&L */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                            {p.netPnL !== null ? (
                              <span
                                className={`font-semibold ${
                                  p.netPnL > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : p.netPnL < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {formatCurrency(p.netPnL, 'EUR')}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </td>

                          {/* Calculated RR (R-Multiple) */}
                          <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                            {p.rMultiple !== null ? (
                              <span
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                  p.rMultiple > 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : p.rMultiple < 0
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {formatRMultiple(p.rMultiple)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {p.plannedRR ? `Plan: 1:${p.plannedRR.toFixed(1)}` : 'Non calculable'}
                              </span>
                            )}
                          </td>

                          {/* Duplicate Status */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {p.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                {p.duplicateReason === 'EXISTING_IN_DB' ? 'En BDD (Doublon)' : 'Doublon Fichier'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Nouveau
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            Annuler
          </button>

          {previewResult && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3.5 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isSaving || selectedCount === 0}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importer {selectedCount} Trade(s)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
