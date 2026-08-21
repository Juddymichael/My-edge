import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trade, 
  AccountTransaction, 
  PendingImportSummary, 
  UserAppSettings, 
  ImportBatchRecord,
  ImportItemClassification 
} from '../types';
import { getThemeClasses } from '../utils/theme';
import { parseDocumentFile } from '../importers/documentParser';
import { SAMPLE_TRADES } from '../data/sampleTrades';
import { 
  FileUp, 
  RotateCcw, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  Trash2,
  FileCheck,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  Activity,
  AlertTriangle,
  X
} from 'lucide-react';

interface ImportViewProps {
  existingTrades: Trade[];
  existingTransactions?: AccountTransaction[];
  importBatches: ImportBatchRecord[];
  onConfirmImport: (
    tradesToImport: Trade[], 
    transactionsToImport: AccountTransaction[],
    batchRecord: ImportBatchRecord
  ) => void;
  onUndoBatch: (batchId: string) => void;
  settings: UserAppSettings;
}

export const ImportView: React.FC<ImportViewProps> = ({
  existingTrades,
  importBatches,
  onConfirmImport,
  onUndoBatch,
  settings,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [pendingSummary, setPendingSummary] = useState<PendingImportSummary | null>(null);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [ignoreDuplicatesOption, setIgnoreDuplicatesOption] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'ALL' | 'TRADES' | 'DEPOSITS' | 'WITHDRAWALS' | 'AMBIGUOUS'>('ALL');

  // Local state for user decisions on ambiguous rows
  const [ambiguousDecisions, setAmbiguousDecisions] = useState<Record<string, ImportItemClassification>>({});

  // File drop/upload handler
  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisStep(`Analyse du document ${file.name}...`);

    setTimeout(() => setAnalysisStep('Extraction des trades & détection des flux...'), 250);
    setTimeout(() => setAnalysisStep('Vérification des montants, sens & symboles...'), 500);
    setTimeout(() => setAnalysisStep('Contrôle d\'intégrité & doublons...'), 750);

    try {
      const summary = await parseDocumentFile(file, existingTrades);
      
      const initialDecisions: Record<string, ImportItemClassification> = {};
      summary.ambiguousRows.forEach((amb) => {
        initialDecisions[amb.id] = amb.suggestedType || 'DEPOSIT';
      });
      setAmbiguousDecisions(initialDecisions);
      setPendingSummary(summary);
      setActivePreviewTab(summary.ambiguousRows.length > 0 ? 'AMBIGUOUS' : 'ALL');
    } catch (err) {
      alert(`Erreur lors de l'analyse du document ${file.name}`);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Built-in Sample Dataset loader with sample deposits and trades
  const handleLoadSampleData = () => {
    setIsAnalyzing(true);
    setAnalysisStep('Chargement du relevé modèle...');

    setTimeout(() => {
      const batchId = `batch-sample-${Date.now()}`;
      
      const sampleDeposits: AccountTransaction[] = [
        {
          id: `dep-sample-1`,
          date: '2026-08-01',
          time: '08:00',
          type: 'DEPOSIT',
          amount: 5000,
          description: 'Dépôt Initial Capital Trading',
          source: 'Sample Dataset',
          createdAt: new Date().toISOString(),
        },
        {
          id: `dep-sample-2`,
          date: '2026-08-10',
          time: '14:30',
          type: 'DEPOSIT',
          amount: 1500,
          description: 'Recharge Capital Compte',
          source: 'Sample Dataset',
          createdAt: new Date().toISOString(),
        },
      ];

      const sampleWithdrawals: AccountTransaction[] = [
        {
          id: `wth-sample-1`,
          date: '2026-08-15',
          time: '16:00',
          type: 'WITHDRAWAL',
          amount: 400,
          description: 'Retrait de gains partiels',
          source: 'Sample Dataset',
          createdAt: new Date().toISOString(),
        },
      ];

      setAmbiguousDecisions({});
      setPendingSummary({
        batchId,
        fileName: 'Journal_de_Trading_TrackRecord.pdf',
        fileType: 'PDF',
        totalDetected: SAMPLE_TRADES.length + sampleDeposits.length + sampleWithdrawals.length,
        trades: SAMPLE_TRADES,
        deposits: sampleDeposits,
        withdrawals: sampleWithdrawals,
        ambiguousRows: [],
        tradesCount: SAMPLE_TRADES.length,
        depositsCount: sampleDeposits.length,
        withdrawalsCount: sampleWithdrawals.length,
        duplicatesCount: 0,
        validDatesCount: SAMPLE_TRADES.length,
        validSymbolsCount: SAMPLE_TRADES.length,
        validPnLCount: SAMPLE_TRADES.length,
        missingEntryCount: 0,
        missingStopLossCount: 0,
        missingCommissionCount: 0,
        warnings: [],
        duplicates: [],
      });
      setIsAnalyzing(false);
      setActivePreviewTab('ALL');
    }, 450);
  };

  const handleSetAmbiguousDecision = (rowId: string, decision: ImportItemClassification) => {
    setAmbiguousDecisions((prev) => ({
      ...prev,
      [rowId]: decision,
    }));
  };

  const handleExecuteImport = () => {
    if (!pendingSummary) return;

    let finalTrades = [...pendingSummary.trades];
    let finalDeposits = [...pendingSummary.deposits];
    let finalWithdrawals = [...pendingSummary.withdrawals];

    pendingSummary.ambiguousRows.forEach((amb) => {
      const decision = ambiguousDecisions[amb.id] || amb.suggestedType;
      
      if (decision === 'DEPOSIT') {
        finalDeposits.push({
          id: `dep-amb-${Date.now()}-${amb.id}`,
          date: amb.date,
          type: 'DEPOSIT',
          amount: Math.abs(amb.amountOrPnL),
          description: amb.rawText || 'Dépôt validé manuellement',
          source: pendingSummary.fileType as any,
          importBatchId: pendingSummary.batchId,
          createdAt: new Date().toISOString(),
        });
      } else if (decision === 'WITHDRAWAL') {
        finalWithdrawals.push({
          id: `wth-amb-${Date.now()}-${amb.id}`,
          date: amb.date,
          type: 'WITHDRAWAL',
          amount: Math.abs(amb.amountOrPnL),
          description: amb.rawText || 'Retrait validé manuellement',
          source: pendingSummary.fileType as any,
          importBatchId: pendingSummary.batchId,
          createdAt: new Date().toISOString(),
        });
      } else if (decision === 'TRADE') {
        const netPnL = amb.amountOrPnL;
        finalTrades.push({
          id: `trade-amb-${Date.now()}-${amb.id}`,
          date: amb.date,
          symbol: amb.symbol || 'UNKNOWN',
          side: 'BUY',
          netPnL,
          outcome: netPnL > 0 ? 'Win' : netPnL < 0 ? 'Loss' : 'BE',
          source: pendingSummary.fileType as any,
          importBatchId: pendingSummary.batchId,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (ignoreDuplicatesOption && pendingSummary.duplicates.length > 0) {
      const duplicateIds = new Set(pendingSummary.duplicates.map((d) => d.incomingTrade.id));
      finalTrades = finalTrades.filter((t) => !duplicateIds.has(t.id));
    }

    const record: ImportBatchRecord = {
      id: pendingSummary.batchId,
      fileName: pendingSummary.fileName,
      importedAt: new Date().toISOString(),
      tradeCount: finalTrades.length,
      depositsCount: finalDeposits.length,
      withdrawalsCount: finalWithdrawals.length,
      source: pendingSummary.fileType,
    };

    const tradesWithBatch = finalTrades.map((t) => ({ ...t, importBatchId: pendingSummary.batchId }));
    const depositsWithBatch = finalDeposits.map((d) => ({ ...d, importBatchId: pendingSummary.batchId }));
    const withdrawalsWithBatch = finalWithdrawals.map((w) => ({ ...w, importBatchId: pendingSummary.batchId }));
    const allTransactions = [...depositsWithBatch, ...withdrawalsWithBatch];

    onConfirmImport(tradesWithBatch, allTransactions, record);
    setPendingSummary(null);
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
      <div className={`pb-3 border-b ${theme.tableBorder}`}>
        <div className="flex items-center gap-2">
          <h2 className={theme.sectionTitle}>Importer mon Track Record</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${theme.badgeNeutral}`}>
            Trades • Dépôts • Retraits
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
          Analyse automatique : distingue les trades des flux de capitaux pour conserver des statistiques rigoureuses
        </p>
      </div>

      {!pendingSummary && !isAnalyzing && (
        <div className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group relative overflow-hidden ${
              isDraggingOver
                ? isLight
                  ? 'border-violet-500 bg-violet-50/50 ring-2 ring-violet-500/20'
                  : 'border-[#f75605] bg-[#f75605]/10 ring-2 ring-[#f75605]/20'
                : isLight
                  ? 'border-slate-300 hover:border-violet-500 bg-white hover:bg-slate-50/60'
                  : 'border-[#252E38] hover:border-[#f75605]/60 bg-[#121820] hover:bg-[#171E27]'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border ${theme.badgeNeutral}`}>
              <FileUp className="w-5 h-5 opacity-70" />
            </div>

            <h3 className={`text-base font-bold tracking-tight ${theme.textPrimary}`}>
              Glissez-déposez votre relevé de trading
            </h3>
            <p className={`text-xs mt-1 max-w-md mx-auto ${theme.textMuted}`}>
              Formats supportés : PDF, CSV, XLSX, XLS, TXT, JSON (MT4, MT5, cTrader, TradingView, Myfxbook, Broker statements)
            </p>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <label className={`px-4 py-2 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 btn-press ${
                theme.btnPrimary
              }`}>
                <FileCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Parcourir les fichiers</span>
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.txt,.json,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleData}
                className={`px-4 py-2 font-medium text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer btn-press ${theme.badgeNeutral}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Charger le relevé modèle</span>
              </button>
            </div>
          </div>

          {/* Import History & Undo Panel */}
          {importBatches.length > 0 && (
            <div className={`rounded-2xl p-4 space-y-3 border ${theme.cardBg}`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${theme.textSecondary}`}>
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Historique des imports & Rollback</span>
              </h3>

              <div className={`divide-y ${theme.divideBorder}`}>
                {importBatches.map((batch) => (
                  <div key={batch.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className={`font-semibold flex items-center gap-1.5 ${theme.textPrimary}`}>
                        <span>{batch.fileName}</span>
                        <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono border ${theme.badgeNeutral}`}>
                          {batch.source}
                        </span>
                      </div>
                      <div className={`mt-0.5 flex flex-wrap items-center gap-2 ${theme.textMuted}`}>
                        <span>{batch.tradeCount} trades</span>
                        {(batch.depositsCount ?? 0) > 0 && (
                          <span className={theme.winText}>• {batch.depositsCount} dépôts</span>
                        )}
                        {(batch.withdrawalsCount ?? 0) > 0 && (
                          <span className={theme.lossText}>• {batch.withdrawalsCount} retraits</span>
                        )}
                        <span>• Importé le {new Date(batch.importedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Annuler l'import de ${batch.fileName} (${batch.tradeCount} trades) ?`)) {
                          onUndoBatch(batch.id);
                        }
                      }}
                      className="px-2.5 py-1 text-rose-500 hover:bg-rose-500/10 font-medium text-[11px] rounded-lg border border-rose-200 dark:border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Annuler cet import</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Progress Spinner */}
      {isAnalyzing && (
        <div className={`rounded-2xl p-10 text-center space-y-3 max-w-md mx-auto border ${theme.cardBg}`}>
          <div className={`w-8 h-8 border-2 rounded-full animate-spin mx-auto ${
            isLight ? 'border-violet-200 border-t-violet-600' : 'border-[#f75605]/20 border-t-[#f75605]'
          }`}></div>
          <h3 className={`text-sm font-bold ${theme.textPrimary}`}>{analysisStep}</h3>
          <p className={`text-xs ${theme.textMuted}`}>Classification des flux et contrôle d'intégrité...</p>
        </div>
      )}

      {/* Résumé clair avant import */}
      {pendingSummary && !isAnalyzing && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-4 sm:p-5 space-y-4 border ${theme.cardBg}`}>
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b ${theme.tableBorder}`}>
              <div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider block ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`}>
                  Analyse & Classification Terminée
                </span>
                <h3 className={`text-base sm:text-lg font-bold mt-0.5 ${theme.textPrimary}`}>
                  Relevé : {pendingSummary.fileName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPendingSummary(null)}
                  className={`px-3 py-1.5 font-medium text-xs rounded-xl transition-colors cursor-pointer border ${theme.badgeNeutral}`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleExecuteImport}
                  className={`px-4 py-1.5 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 btn-press ${
                    theme.btnPrimary
                  }`}
                >
                  <span>Confirmer l'import</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* 4 Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.innerBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme.label}>Trades</span>
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className={`text-xl font-bold font-mono ${theme.textPrimary}`}>
                  {pendingSummary.tradesCount}
                </div>
                <div className={`text-[10px] ${theme.textMuted}`}>
                  Win Rate & PF
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.innerBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme.label}>Dépôts</span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className={`text-xl font-bold font-mono ${theme.winText}`}>
                  {pendingSummary.depositsCount}
                </div>
                <div className={`text-[10px] ${theme.winText}`}>
                  +{settings.currencySymbol}{pendingSummary.deposits.reduce((acc, d) => acc + d.amount, 0).toFixed(0)} solde
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.innerBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme.label}>Retraits</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className={`text-xl font-bold font-mono ${theme.lossText}`}>
                  {pendingSummary.withdrawalsCount}
                </div>
                <div className={`text-[10px] ${theme.lossText}`}>
                  -{settings.currencySymbol}{pendingSummary.withdrawals.reduce((acc, w) => acc + w.amount, 0).toFixed(0)} solde
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.innerBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={theme.label}>Doublons</span>
                  <ShieldAlert className={`w-3.5 h-3.5 ${pendingSummary.duplicatesCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                </div>
                <div className={`text-xl font-bold font-mono ${pendingSummary.duplicatesCount > 0 ? 'text-amber-500' : theme.textPrimary}`}>
                  {pendingSummary.duplicatesCount}
                </div>
                <div className={`text-[10px] ${theme.textMuted}`}>
                  {pendingSummary.duplicatesCount > 0 ? 'Exclus auto' : 'Aucun'}
                </div>
              </div>
            </div>

            {/* Section Lignes Ambiguës */}
            {pendingSummary.ambiguousRows.length > 0 && (
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-[#261E10] border-amber-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <h4 className={`text-xs font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                      {pendingSummary.ambiguousRows.length} ligne{pendingSummary.ambiguousRows.length > 1 ? 's' : ''} à confirmer
                    </h4>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  {pendingSummary.ambiguousRows.map((amb) => {
                    const currentDecision = ambiguousDecisions[amb.id] || amb.suggestedType;
                    return (
                      <div 
                        key={amb.id}
                        className={`p-2.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                          isLight ? 'bg-white border-amber-200 text-slate-900' : 'bg-[#161922] border-[#2A3040] text-slate-100'
                        }`}
                      >
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{amb.date}</span>
                            <span className={`font-mono font-bold ${
                              amb.amountOrPnL >= 0 ? theme.winText : theme.lossText
                            }`}>
                              {amb.amountOrPnL >= 0 ? '+' : ''}{amb.amountOrPnL.toFixed(2)}{settings.currencySymbol}
                            </span>
                            {amb.symbol && <span className={theme.textMuted}>• {amb.symbol}</span>}
                          </div>
                          <p className={`text-[10px] font-mono ${theme.textMuted}`}>
                            {amb.rawText}
                          </p>
                        </div>

                        {/* Classification Choice Buttons */}
                        <div className="flex items-center gap-1 flex-wrap self-end md:self-auto">
                          <button
                            type="button"
                            onClick={() => handleSetAmbiguousDecision(amb.id, 'DEPOSIT')}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                              currentDecision === 'DEPOSIT' ? theme.winBadge : theme.badgeNeutral
                            }`}
                          >
                            <ArrowDownLeft className="w-3 h-3 inline mr-1" />
                            <span>Dépôt</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetAmbiguousDecision(amb.id, 'WITHDRAWAL')}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                              currentDecision === 'WITHDRAWAL' ? theme.lossBadge : theme.badgeNeutral
                            }`}
                          >
                            <ArrowUpRight className="w-3 h-3 inline mr-1" />
                            <span>Retrait</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetAmbiguousDecision(amb.id, 'TRADE')}
                            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                              currentDecision === 'TRADE'
                                ? (isLight ? 'bg-violet-100 text-violet-800 border-violet-300' : 'bg-[#3A2210] text-[#FF8533] border-[#FF8533]/40')
                                : theme.badgeNeutral
                            }`}
                          >
                            <Activity className="w-3 h-3 inline mr-1" />
                            <span>Trade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetAmbiguousDecision(amb.id, 'IGNORE')}
                            className={`px-2 py-1 rounded text-xs border transition-all ${
                              currentDecision === 'IGNORE'
                                ? 'bg-slate-500 text-white border-slate-600'
                                : theme.badgeNeutral
                            }`}
                          >
                            Ignorer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab Selector Aperçu */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h4 className={theme.label}>
                  Aperçu du contenu à importer
                </h4>

                <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs ${theme.innerBg}`}>
                  <button
                    onClick={() => setActivePreviewTab('ALL')}
                    className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                      activePreviewTab === 'ALL'
                        ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-[#252A38] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tout ({pendingSummary.totalDetected})
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('TRADES')}
                    className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                      activePreviewTab === 'TRADES'
                        ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-[#252A38] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Trades ({pendingSummary.tradesCount})
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('DEPOSITS')}
                    className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                      activePreviewTab === 'DEPOSITS' ? theme.winBadge : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dépôts ({pendingSummary.depositsCount})
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('WITHDRAWALS')}
                    className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                      activePreviewTab === 'WITHDRAWALS' ? theme.lossBadge : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Retraits ({pendingSummary.withdrawalsCount})
                  </button>
                  {pendingSummary.ambiguousRows.length > 0 && (
                    <button
                      onClick={() => setActivePreviewTab('AMBIGUOUS')}
                      className={`px-2.5 py-0.8 rounded-lg text-xs font-medium transition-colors ${
                        activePreviewTab === 'AMBIGUOUS'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-amber-400/80 hover:text-amber-300'
                      }`}
                    >
                      Ambiguës ({pendingSummary.ambiguousRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div className={`overflow-x-auto border rounded-xl ${theme.cardBg}`}>
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className={`border-b text-[10px] uppercase tracking-wider ${theme.tableHeaderBg}`}>
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Détail / Symbole</th>
                      <th className="p-2.5">Direction</th>
                      <th className="p-2.5 text-right">Montant / PnL</th>
                      <th className="p-2.5">Impact</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.divideBorder}`}>
                    {(activePreviewTab === 'ALL' || activePreviewTab === 'TRADES') &&
                      pendingSummary.trades.slice(0, activePreviewTab === 'TRADES' ? 30 : 10).map((t) => (
                        <tr key={t.id} className={`transition-colors ${theme.tableRowHover}`}>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${theme.badgeNeutral}`}>
                              TRADE
                            </span>
                          </td>
                          <td className={`p-2.5 font-mono ${theme.textPrimary}`}>{t.date}</td>
                          <td className={`p-2.5 font-bold ${theme.textPrimary}`}>{t.symbol}</td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              t.side === 'BUY' ? theme.winBadge : theme.lossBadge
                            }`}>
                              {t.side}
                            </span>
                          </td>
                          <td className={`p-2.5 font-mono font-bold text-right ${t.netPnL >= 0 ? theme.winText : theme.lossText}`}>
                            {t.netPnL >= 0 ? '+' : ''}{settings.currencySymbol}{t.netPnL.toFixed(2)}
                          </td>
                          <td className={`p-2.5 text-[11px] ${theme.textMuted}`}>Win Rate & PF</td>
                        </tr>
                      ))}

                    {(activePreviewTab === 'ALL' || activePreviewTab === 'DEPOSITS') &&
                      pendingSummary.deposits.map((d) => (
                        <tr key={d.id} className={`transition-colors ${theme.tableRowHover}`}>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1 w-max ${theme.winBadge}`}>
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>DÉPÔT</span>
                            </span>
                          </td>
                          <td className={`p-2.5 font-mono ${theme.textPrimary}`}>{d.date}</td>
                          <td className={`p-2.5 ${theme.textPrimary}`}>{d.description || 'Dépôt Compte'}</td>
                          <td className={`p-2.5 font-semibold ${theme.winText}`}>Crédit</td>
                          <td className={`p-2.5 font-mono font-bold text-right ${theme.winText}`}>
                            +{settings.currencySymbol}{d.amount.toFixed(2)}
                          </td>
                          <td className={`p-2.5 text-[11px] font-semibold ${theme.winText}`}>Solde (+)</td>
                        </tr>
                      ))}

                    {(activePreviewTab === 'ALL' || activePreviewTab === 'WITHDRAWALS') &&
                      pendingSummary.withdrawals.map((w) => (
                        <tr key={w.id} className={`transition-colors ${theme.tableRowHover}`}>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1 w-max ${theme.lossBadge}`}>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>RETRAIT</span>
                            </span>
                          </td>
                          <td className={`p-2.5 font-mono ${theme.textPrimary}`}>{w.date}</td>
                          <td className={`p-2.5 ${theme.textPrimary}`}>{w.description || 'Retrait Compte'}</td>
                          <td className={`p-2.5 font-semibold ${theme.lossText}`}>Débit</td>
                          <td className={`p-2.5 font-mono font-bold text-right ${theme.lossText}`}>
                            -{settings.currencySymbol}{w.amount.toFixed(2)}
                          </td>
                          <td className={`p-2.5 text-[11px] font-semibold ${theme.lossText}`}>Solde (-)</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Modal */}
      {showDuplicatesModal && pendingSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-xl w-full p-5 space-y-3 shadow-2xl relative border ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
          }`}>
            <div className={`flex items-center justify-between pb-2.5 border-b ${theme.tableBorder}`}>
              <h3 className={`text-base font-bold flex items-center gap-2 ${theme.textPrimary}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Doublons détectés ({pendingSummary.duplicates.length})</span>
              </h3>
              <button
                onClick={() => setShowDuplicatesModal(false)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${theme.badgeNeutral}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`max-h-72 overflow-y-auto divide-y ${theme.divideBorder}`}>
              {pendingSummary.duplicates.map((dup, i) => (
                <div key={i} className="py-2 text-xs space-y-0.5">
                  <div className={`font-semibold ${theme.textPrimary}`}>
                    {dup.incomingTrade.symbol} ({dup.incomingTrade.side}) — {dup.incomingTrade.date}
                  </div>
                  <div className={theme.textMuted}>Raison : {dup.reason}</div>
                  <div className={`font-mono font-bold ${dup.incomingTrade.netPnL >= 0 ? theme.winText : theme.lossText}`}>
                    PnL : {dup.incomingTrade.netPnL}
                  </div>
                </div>
              ))}
            </div>

            <div className={`pt-2.5 border-t flex items-center justify-between text-xs ${theme.tableBorder}`}>
              <button
                onClick={() => {
                  setIgnoreDuplicatesOption(true);
                  setShowDuplicatesModal(false);
                }}
                className={`px-3 py-1.5 font-semibold text-white rounded-xl cursor-pointer ${
                  theme.btnPrimary
                }`}
              >
                Ignorer les doublons (Recommandé)
              </button>
              <button
                onClick={() => {
                  setIgnoreDuplicatesOption(false);
                  setShowDuplicatesModal(false);
                }}
                className={`px-3 py-1.5 font-medium rounded-xl border cursor-pointer ${theme.badgeNeutral}`}
              >
                Conserver les deux
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
