import React from 'react';
import { AlertTriangle, Eye, ExternalLink, X } from 'lucide-react';
import { RiskAlert } from '../lib/riskPatterns';

interface RiskAlertsPanelProps {
  alerts: RiskAlert[];
  unreadCount: number;
  onView: (alert: RiskAlert) => void;
  onDismiss: (id: string) => void;
  onOpenTrade: (id: string) => void;
}

export const RiskAlertsPanel: React.FC<RiskAlertsPanelProps> = ({
  alerts,
  unreadCount,
  onView,
  onDismiss,
  onOpenTrade,
}) => {
  const recent = alerts.slice(0, 5);

  return (
    <section className="p-5 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#101827] shadow-xs" aria-labelledby="risk-alerts-title">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 id="risk-alerts-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Alertes récentes</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Patterns comportementaux détectés automatiquement</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold tabular-nums">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Aucune alerte comportementale détectée.
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((alert) => (
            <article key={alert.id} className={`rounded-xl border px-4 py-3 transition ${alert.read ? 'border-slate-200 dark:border-slate-800' : 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.04]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{alert.title}</h3>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{alert.explanation}</p>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500 truncate">Trades : {alert.relatedTradeLabels.join(' · ')}</p>
                </div>
                <button onClick={() => onDismiss(alert.id)} title="Rejeter" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {!alert.read && (
                  <button onClick={() => onView(alert)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
                    <Eye className="w-3 h-3" /> Marquer comme vue
                  </button>
                )}
                <button onClick={() => { onView(alert); onOpenTrade(alert.relatedTradeIds[0]); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer">
                  <ExternalLink className="w-3 h-3" /> Voir dans Trade Journal
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
