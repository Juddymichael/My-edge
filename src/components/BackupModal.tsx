import React, { useState } from 'react';
import { Trade } from '../types/trade';
import { UserSettings } from '../types/settings';
import { exportToJson, importFromJson, exportToCsv } from '../lib/backup';
import { Download, Upload, FileText, Check, AlertCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  settings: UserSettings;
  onRestoreTrades: (trades: Trade[]) => Promise<void>;
}

export const BackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  trades,
  settings,
  onRestoreTrades,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'RESTORE'>('EXPORT');
  const [jsonText, setJsonText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const jsonStr = exportToJson(trades, settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thunder_edge_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: 'Backup JSON downloaded successfully.' });
  };

  const handleDownloadCsv = () => {
    const csvStr = exportToCsv(trades);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thunder_edge_trades_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: 'CSV export downloaded successfully.' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!jsonText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste or upload a valid JSON backup string.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const parsedData = importFromJson(jsonText);
      await onRestoreTrades(parsedData.trades);
      setStatusMessage({
        type: 'success',
        text: `Restored ${parsedData.trades.length} validated trades successfully.`,
      });
      setJsonText('');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Corrupted or invalid backup file',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="backup-modal"
        className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Data Backup &amp; Portability</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Zero data lock-in • Complete JSON/CSV export</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs">
          <button
            onClick={() => {
              setActiveTab('EXPORT');
              setStatusMessage(null);
            }}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            EXPORT BACKUP
          </button>
          <button
            onClick={() => {
              setActiveTab('RESTORE');
              setStatusMessage(null);
            }}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'RESTORE'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            RESTORE JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'EXPORT' ? (
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400 font-normal">
                Download a complete, loss-less snapshot of all <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{trades.length}</span> trades currently in
                IndexedDB.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadJson}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 flex flex-col items-center justify-center text-center gap-2 group transition cursor-pointer"
                >
                  <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">Download JSON Backup</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Full schema &amp; settings</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadCsv}
                  className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 flex flex-col items-center justify-center text-center gap-2 group transition cursor-pointer"
                >
                  <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">Export CSV File</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Spreadsheet format</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 font-normal">
                Restore a previously exported Thunder Edge JSON backup file. All trades will be
                validated with Zod before insertion.
              </p>

              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">OR PASTE JSON HERE</label>
                <textarea
                  rows={6}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="Paste ThunderEdge JSON backup here..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleExecuteRestore}
                  disabled={isProcessing || !jsonText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'Validating...' : 'Validate & Restore'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

