import React, { useState } from 'react';
import { Trade } from '../types/trade';
import { DataQualityBadge } from './DataQualityBadge';
import { formatCurrency, formatRMultiple, formatPercent } from '../lib/formatting';
import {
  X,
  Copy,
  Check,
  Fingerprint,
  Layers,
  Activity,
  DollarSign,
  Brain,
  Code,
} from 'lucide-react';

interface TradeDetailModalProps {
  trade: Trade | null;
  currency?: string;
  onClose: () => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  currency = 'EUR',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'smc' | 'financials' | 'psychology' | 'raw'>('overview');

  if (!trade) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(trade, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (val: unknown, fallback = 'Not recorded') => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 dark:text-slate-500 italic font-normal">{fallback}</span>;
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">YES</span>
      ) : (
        <span className="text-slate-500 font-normal">NO</span>
      );
    }
    return <span className="text-slate-900 dark:text-slate-100 font-medium tabular-nums">{String(val)}</span>;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      id="trade-detail-modal"
    >
      <div className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-xs shadow-xs ${
                trade.direction === 'BUY'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
              }`}
            >
              {trade.direction === 'BUY' ? 'LONG' : 'SHORT'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {trade.symbol}
                </h3>
                <span className="text-xs text-slate-400 font-normal tabular-nums">
                  #{trade.ticket ?? trade.id.slice(0, 8)}
                </span>
                <DataQualityBadge quality={trade.dataQuality} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {new Date(trade.openedAt).toISOString().slice(0, 16).replace('T', ' ')} • {trade.session ?? 'No session'} • {trade.timeframe ?? 'No timeframe'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-900/30">
          {[
            { id: 'overview', label: 'Overview & Execution', icon: Activity },
            { id: 'smc', label: 'Setup & ICT / SMC', icon: Layers },
            { id: 'financials', label: 'PnL & Risk', icon: DollarSign },
            { id: 'psychology', label: 'Review & Psychology', icon: Brain },
            { id: 'raw', label: 'Database Audit', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 px-3 text-xs border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 block">NET P&amp;L</span>
                  <p className={`text-base font-semibold tabular-nums mt-0.5 ${
                    trade.netPnL && trade.netPnL > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : trade.netPnL && trade.netPnL < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}>
                    {formatCurrency(trade.netPnL, currency)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 block">R MULTIPLE</span>
                  <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatRMultiple(trade.rMultiple)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 block">ENTRY PRICE</span>
                  <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                    {trade.entryPrice !== null ? trade.entryPrice : 'Not recorded'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 block">EXIT PRICE</span>
                  <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                    {trade.exitPrice !== null ? trade.exitPrice : 'Open Position'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Position Attributes</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stop Loss:</span>
                      {renderValue(trade.stopLoss)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Take Profit:</span>
                      {renderValue(trade.takeProfit)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quantity / Lots:</span>
                      {renderValue(trade.quantity ?? trade.lotSize)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contract Size:</span>
                      {renderValue(trade.contractSize)}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Execution Timestamps</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Opened At:</span>
                      <span className="tabular-nums text-slate-800 dark:text-slate-200">{new Date(trade.openedAt).toISOString().slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Closed At:</span>
                      <span className="tabular-nums text-slate-800 dark:text-slate-200">
                        {trade.closedAt ? new Date(trade.closedAt).toISOString().slice(0, 16).replace('T', ' ') : 'Running (Open)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timezone:</span>
                      <span className="text-slate-800 dark:text-slate-200">{trade.timezone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SETUP & SMC CONTEXT */}
          {activeTab === 'smc' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Trading Setup Model</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-500/30">
                    {trade.setup ?? 'Unassigned Setup'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Market Context &amp; Bias</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">HTF Narrative / Bias:</span>
                      {renderValue(trade.htfBias)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Killzone:</span>
                      {renderValue(trade.killzone)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Liquidity Sweep Taken:</span>
                      {renderValue(trade.liquidityTaken)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IRL / ERL Framework:</span>
                      {renderValue(trade.irlErl)}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">ICT / SMC Mechanics</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Displacement:</span>
                      {renderValue(trade.displacement)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Market Structure Shift (MSS):</span>
                      {renderValue(trade.mss)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CISD:</span>
                      {renderValue(trade.cisd)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fair Value Gap (FVG):</span>
                      {renderValue(trade.fvg)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Inverse FVG (IFVG):</span>
                      {renderValue(trade.ifvg)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Block (OB):</span>
                      {renderValue(trade.ob)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Entry &amp; Target Strategy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">Entry Model:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-normal">{trade.entryModel ?? 'Not recorded'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">SL Model:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-normal">{trade.slModel ?? 'Not recorded'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">TP Model:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-normal">{trade.tpModel ?? 'Not recorded'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIALS */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Accounting &amp; Fees</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross P&amp;L:</span>
                      {renderValue(trade.grossPnL !== null ? formatCurrency(trade.grossPnL, currency) : null)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Commission:</span>
                      {renderValue(trade.commission !== null ? formatCurrency(trade.commission, currency) : null)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Swap / Financing:</span>
                      {renderValue(trade.swap !== null ? formatCurrency(trade.swap, currency) : null)}
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 font-medium">
                      <span className="text-slate-700 dark:text-slate-300">Net P&amp;L:</span>
                      <span className={`tabular-nums font-semibold ${trade.netPnL && trade.netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(trade.netPnL, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Risk Management Metrics</h4>
                  <div className="space-y-1.5 font-normal">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initial Risk Amount:</span>
                      {renderValue(trade.initialRiskAmount !== null ? formatCurrency(trade.initialRiskAmount, currency) : null)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Risk Percent (%):</span>
                      {renderValue(trade.riskPercent !== null ? formatPercent(trade.riskPercent, 2) : null)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">R-Multiple:</span>
                      {renderValue(trade.rMultiple !== null ? formatRMultiple(trade.rMultiple) : null)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Balance Prior:</span>
                      {renderValue(trade.balanceBefore !== null ? formatCurrency(trade.balanceBefore, currency) : null)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PSYCHOLOGY & NOTES */}
          {activeTab === 'psychology' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">Emotional State at Execution</span>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {trade.emotion ?? 'Not recorded'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">Mistake / Rule Invalidation</span>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {trade.mistake ?? 'NONE'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-slate-400 uppercase text-[10px] font-medium tracking-wider block">Trade Notes &amp; Observations</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-normal">
                  {trade.notes || 'No qualitative notes recorded for this position.'}
                </p>
              </div>

              {trade.tags && trade.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[10px] uppercase font-medium tracking-wider mr-1">Tags:</span>
                  {trade.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RAW AUDIT JSON */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                <Fingerprint className="w-4 h-4 text-indigo-500" />
                <span>Deterministic Source ID: <strong className="tabular-nums font-medium text-slate-900 dark:text-slate-200">{trade.sourceId}</strong></span>
              </div>

              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                {JSON.stringify(trade, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

