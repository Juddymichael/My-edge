import React from 'react';
import { Database, ShieldCheck, AlertTriangle, AlertCircle, Layers } from 'lucide-react';
import { Trade } from '../types/trade';

interface Props {
  trades?: Trade[];
  isLoading?: boolean;
}

export const DatabaseStatusCard: React.FC<Props> = ({ trades = [], isLoading = false }) => {
  const safeTrades = trades || [];
  const verifiedCount = safeTrades.filter((t) => t && t.dataQuality === 'VERIFIED').length;
  const partialCount = safeTrades.filter((t) => t && t.dataQuality === 'PARTIAL').length;
  const reviewCount = safeTrades.filter((t) => t && t.dataQuality === 'NEEDS_REVIEW').length;
  const openCount = safeTrades.filter((t) => t && t.status === 'OPEN').length;

  return (
    <div
      id="db-status-card"
      className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">IndexedDB (Dexie.js)</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ACTIVE &amp; PERSISTED
              </span>
            </div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
              Local-first zero-latency storage • Automatic schema migration
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block">TOTAL RECORDS</span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {isLoading ? '...' : trades.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Verified */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {verifiedCount}
          </p>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">100% coherent data</p>
        </div>

        {/* Partial */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Partial
            </span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {partialCount}
          </p>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">Missing non-critical meta</p>
        </div>

        {/* Needs Review */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Needs Review
            </span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {reviewCount}
          </p>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">Ambiguity or missing price</p>
        </div>

        {/* Open Positions */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
              <Layers className="w-3.5 h-3.5" />
              Open Positions
            </span>
          </div>
          <p className="text-xl font-semibold tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {openCount}
          </p>
          <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">Excluded from win-rate</p>
        </div>
      </div>
    </div>
  );
};

