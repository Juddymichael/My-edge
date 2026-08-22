import React from 'react';
import { Award, Info } from 'lucide-react';
import { Trade, UserAppSettings } from '../types';
import { calculatePerformanceStats, getExpectancyConfidence } from '../calculations';

interface Props {
  trades: Trade[];
  settings: UserAppSettings;
}

export const EdgeExpectancyPanel: React.FC<Props> = ({ trades, settings }) => {
  const stats = calculatePerformanceStats(trades);
  const confidence = getExpectancyConfidence(stats.totalTrades);
  const positive = (stats.expectancy ?? 0) > 0;
  const decisive = stats.winningTrades + stats.losingTrades;

  const badge = confidence.level === 'high'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
    : confidence.level === 'moderate'
      ? 'bg-sky-500/10 text-sky-400 border-sky-500/25'
      : confidence.level === 'indicative'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
        : 'bg-slate-500/10 text-slate-400 border-slate-500/25';

  return (
    <section className={`mx-auto max-w-7xl px-4 sm:px-6 pt-4 ${settings.theme === 'light' ? 'text-slate-900' : 'text-[#E8EDF2]'}`}>
      <div className={`rounded-2xl border p-4 sm:p-5 ${settings.theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#121820] border-[#252E38]'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl border ${positive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold">Espérance mathématique de ma stratégie</h2>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge}`}>
                  {confidence.label}
                </span>
              </div>
              <p className={`mt-1 text-[11px] ${settings.theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Gain/perte moyen attendu par trade, calculé uniquement à partir des trades réellement enregistrés.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
            <Metric label="Espérance / trade" value={stats.expectancy === null ? 'N/A' : `${stats.expectancy >= 0 ? '+' : ''}${settings.currencySymbol}${stats.expectancy.toFixed(2)}`} positive={positive} />
            <Metric label="Espérance en R" value={stats.expectancyR === null ? 'N/A' : `${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R`} positive={(stats.expectancyR ?? 0) >= 0} />
            <Metric label="Win / Loss" value={`${stats.winningTrades} / ${stats.losingTrades}`} />
            <Metric label="Échantillon" value={`${stats.totalTrades} trades`} />
          </div>
        </div>

        <div className={`mt-4 pt-3 border-t flex items-start gap-2 text-[10px] leading-relaxed ${settings.theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-[#252E38] text-slate-400'}`}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Formule : probabilité de gain × gain moyen − probabilité de perte × perte moyenne. Les Break Even ne sont pas comptés comme des gains ou pertes pour les probabilités. {decisive} trades décisifs sur {stats.totalTrades} sont utilisés. Si l'espérance est positive, l'avantage observé est positif sur l'échantillon actuel — cela ne garantit pas les performances futures.
          </span>
        </div>
      </div>
    </section>
  );
};

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={`mt-1 text-sm font-bold font-mono truncate ${positive === undefined ? '' : positive ? 'text-emerald-400' : 'text-rose-400'}`}>{value}</div>
    </div>
  );
}
