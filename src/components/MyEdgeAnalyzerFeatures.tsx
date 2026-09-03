import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, GitCompareArrows, Image as ImageIcon, X } from 'lucide-react';
import { Trade } from '../types/trade';
import { DimensionPerformance, analyzeCluster } from '../lib/calculations/edge';
import { formatCurrency } from '../lib/formatting';

type GalleryFilter = 'ALL' | 'WIN' | 'LOSS';

interface SetupGalleryProps {
  setupName: string;
  trades: Trade[];
  currency?: string;
  onClose: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

interface GalleryItem {
  trade: Trade;
  screenshot: string;
  screenshotLabel: string;
}

const getSetupName = (trade: Trade) => trade.setup?.trim() || trade.setupId || 'Non défini';

const isWin = (trade: Trade) => (trade.netPnL ?? 0) > 0;
const isLoss = (trade: Trade) => (trade.netPnL ?? 0) < 0;

export const SetupScreenshotGallery: React.FC<SetupGalleryProps> = ({
  setupName,
  trades,
  currency = 'EUR',
  onClose,
  onSelectTrade,
}) => {
  const [filter, setFilter] = useState<GalleryFilter>('ALL');
  const [preview, setPreview] = useState<GalleryItem | null>(null);

  const items = useMemo<GalleryItem[]>(() => {
    return trades
      .filter((trade) => getSetupName(trade) === setupName)
      .flatMap((trade) => {
        const screenshots: GalleryItem[] = [];
        if (trade.screenshotBefore) {
          screenshots.push({ trade, screenshot: trade.screenshotBefore, screenshotLabel: 'Avant' });
        }
        if (trade.screenshotAfter) {
          screenshots.push({ trade, screenshot: trade.screenshotAfter, screenshotLabel: 'Après' });
        }
        return screenshots;
      })
      .filter(({ trade }) => {
        if (filter === 'WIN') return isWin(trade);
        if (filter === 'LOSS') return isLoss(trade);
        return true;
      })
      .sort((a, b) => {
        const aWin = isWin(a.trade) ? 1 : 0;
        const bWin = isWin(b.trade) ? 1 : 0;
        return bWin - aWin || (b.trade.netPnL ?? 0) - (a.trade.netPnL ?? 0);
      });
  }, [filter, setupName, trades]);

  const formatDate = (trade: Trade) => {
    const value = trade.closedAt || trade.openedAt;
    return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-[#292E38] flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#F97316]" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Galerie — {setupName}</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9299A8] mt-1">
              {items.length} capture{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''} • gagnants affichés en premier
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#181C25] text-slate-500 dark:text-[#9299A8]" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 dark:border-[#292E38] flex flex-wrap gap-2">
          {(['ALL', 'WIN', 'LOSS'] as GalleryFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                filter === value
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : 'bg-slate-50 dark:bg-[#181C25] text-slate-600 dark:text-[#9299A8] border-slate-200 dark:border-[#292E38]'
              }`}
            >
              {value === 'ALL' ? 'Tous' : value === 'WIN' ? 'Gagnants' : 'Perdants'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-500 dark:text-[#9299A8]">
              Aucune capture pour ce filtre.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(({ trade, screenshot, screenshotLabel }) => (
                <button
                  key={`${trade.id}-${screenshotLabel}`}
                  onClick={() => setPreview({ trade, screenshot, screenshotLabel })}
                  className="group text-left rounded-2xl overflow-hidden border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] hover:border-[#F97316]/60 transition"
                >
                  <div className="aspect-video bg-slate-100 dark:bg-[#0B0D12] overflow-hidden">
                    <img src={screenshot} alt={`Trade ${trade.symbol} — ${screenshotLabel}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-[#F5F5F5]">{trade.symbol}</span>
                      <span className={`text-[10px] font-bold ${isWin(trade) ? 'text-emerald-500' : isLoss(trade) ? 'text-rose-500' : 'text-slate-500'}`}>
                        {isWin(trade) ? 'WIN' : isLoss(trade) ? 'LOSS' : 'BE'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#9299A8]">{formatDate(trade)} • {screenshotLabel}</div>
                    <div className={`text-xs font-bold ${(trade.netPnL ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(trade.netPnL ?? 0) >= 0 ? '+' : ''}{formatCurrency(trade.netPnL ?? 0, currency)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/85 p-4 flex items-center justify-center" onClick={() => setPreview(null)}>
          <div className="w-full max-w-5xl max-h-[92vh] rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-[#292E38]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F5F5F5]">{preview.trade.symbol} • {preview.screenshotLabel}</h3>
                <p className="text-[11px] text-slate-500 dark:text-[#9299A8]">{formatDate(preview.trade)}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#181C25]"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid lg:grid-cols-[1fr_280px] max-h-[calc(92vh-70px)] overflow-auto">
              <div className="bg-black flex items-center justify-center min-h-[320px] p-2">
                <img src={preview.screenshot} alt={`Aperçu ${preview.trade.symbol}`} className="max-w-full max-h-[70vh] object-contain" />
              </div>
              <div className="p-5 space-y-4">
                <div><span className="text-[10px] text-slate-500 dark:text-[#9299A8]">Paire</span><p className="text-sm font-bold">{preview.trade.symbol}</p></div>
                <div><span className="text-[10px] text-slate-500 dark:text-[#9299A8]">Date</span><p className="text-sm font-semibold">{formatDate(preview.trade)}</p></div>
                <div><span className="text-[10px] text-slate-500 dark:text-[#9299A8]">Résultat</span><p className={`text-sm font-bold ${isWin(preview.trade) ? 'text-emerald-500' : isLoss(preview.trade) ? 'text-rose-500' : 'text-slate-500'}`}>{isWin(preview.trade) ? 'Gagnant' : isLoss(preview.trade) ? 'Perdant' : 'Breakeven'}</p></div>
                <div><span className="text-[10px] text-slate-500 dark:text-[#9299A8]">P&L</span><p className={`text-sm font-bold ${(preview.trade.netPnL ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(preview.trade.netPnL ?? 0) >= 0 ? '+' : ''}{formatCurrency(preview.trade.netPnL ?? 0, currency)}</p></div>
                <div><span className="text-[10px] text-slate-500 dark:text-[#9299A8]">Setup</span><p className="text-sm font-semibold">{setupName}</p></div>
                {onSelectTrade && <button onClick={() => onSelectTrade(preview.trade)} className="w-full px-3 py-2 rounded-xl bg-[#F97316] text-white text-xs font-bold">Ouvrir le trade</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SetupComparisonProps {
  setupStats: DimensionPerformance[];
  trades: Trade[];
  currency?: string;
  onClose: () => void;
}

const getStatus = (stats: DimensionPerformance) => {
  if (stats.confidenceTier === 'CONFIRMED' && stats.monetaryExpectancy > 0 && (stats.profitFactor ?? 0) >= 1) return { label: 'Edge confirmé', className: 'edge-confirmed-halo bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
  if (stats.monetaryExpectancy < 0 || ((stats.profitFactor ?? 0) > 0 && (stats.profitFactor ?? 0) < 1)) return { label: 'À éviter', className: 'bg-rose-500/10 text-rose-500 border-rose-500/30' };
  return { label: 'En observation', className: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };
};

const bestKillzoneForSetup = (setupKey: string, trades: Trade[]) => {
  const setupTrades = trades.filter((trade) => getSetupName(trade) === setupKey);
  const byKillzone = new Map<string, Trade[]>();
  setupTrades.forEach((trade) => {
    const killzone = trade.session || 'Non spécifiée';
    const bucket = byKillzone.get(session) || [];
    bucket.push(trade);
    byKillzone.set(session, bucket);
  });
  const candidates = Array.from(byKillzone.entries()).map(([session, cluster]) => analyzeCluster(cluster, session, session, 'Killzone'));
  return candidates.sort((a, b) => b.monetaryExpectancy - a.monetaryExpectancy || b.winRate - a.winRate || b.sampleSize - a.sampleSize)[0] || null;
};

const metricWinner = (a: number | null, b: number | null, higherIsBetter = true) => {
  if (a === null || b === null || a === b) return { a: false, b: false };
  return higherIsBetter ? { a: a > b, b: b > a } : { a: a < b, b: b < a };
};

export const SetupComparison: React.FC<SetupComparisonProps> = ({ setupStats, trades, currency = 'EUR', onClose }) => {
  const [leftKey, setLeftKey] = useState(setupStats[0]?.key || '');
  const [rightKey, setRightKey] = useState(setupStats.find((setup) => setup.key !== setupStats[0]?.key)?.key || setupStats[0]?.key || '');

  const left = setupStats.find((setup) => setup.key === leftKey) || null;
  const right = setupStats.find((setup) => setup.key === rightKey) || null;
  const leftKillzone = left ? bestKillzoneForSetup(left.key, trades) : null;
  const rightKillzone = right ? bestKillzoneForSetup(right.key, trades) : null;

  const comparisonNote = useMemo(() => {
    if (!left || !right) return 'Sélectionnez deux setups pour comparer leurs performances réelles.';
    const parts: string[] = [];
    if (left.winRate !== right.winRate) parts.push(`${left.label} a un meilleur winrate` + (left.winRate > right.winRate ? '' : ` que ${right.label}`));
    if (left.monetaryExpectancy !== right.monetaryExpectancy) parts.push(`${left.monetaryExpectancy > right.monetaryExpectancy ? left.label : right.label} génère une meilleure espérance par trade`);
    if (parts.length === 0) return 'Les deux setups présentent des métriques très proches sur les données sélectionnées.';
    return parts.join(' mais ').replace(' mais mais ', ' mais ') + '.';
  }, [left, right]);

  if (!left || !right) return null;

  const wr = metricWinner(left.winRate, right.winRate);
  const count = metricWinner(left.sampleSize, right.sampleSize);
  const exp = metricWinner(left.monetaryExpectancy, right.monetaryExpectancy);
  const pf = metricWinner(left.profitFactor, right.profitFactor);

  const Stat = ({ label, leftValue, rightValue, winners }: { label: string; leftValue: React.ReactNode; rightValue: React.ReactNode; winners: { a: boolean; b: boolean } }) => (
    <div className="grid grid-cols-[1fr_100px_1fr] items-center gap-3 py-3 border-b border-slate-100 dark:border-[#292E38] last:border-0">
      <div className={`text-center text-sm font-bold ${winners.a ? 'text-emerald-500' : 'text-slate-900 dark:text-[#F5F5F5]'}`}>{winners.a && <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />}{leftValue}</div>
      <div className="text-center text-[10px] uppercase tracking-wider text-slate-500 dark:text-[#9299A8] font-bold">{label}</div>
      <div className={`text-center text-sm font-bold ${winners.b ? 'text-emerald-500' : 'text-slate-900 dark:text-[#F5F5F5]'}`}>{rightValue}{winners.b && <CheckCircle2 className="inline w-3.5 h-3.5 ml-1" />}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-2xl">
        <div className="sticky top-0 z-10 p-5 bg-white/95 dark:bg-[#12151D]/95 backdrop-blur border-b border-slate-200 dark:border-[#292E38] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2"><GitCompareArrows className="w-5 h-5 text-[#F97316]" /><div><h2 className="text-lg font-bold">Comparer deux setups</h2><p className="text-xs text-slate-500 dark:text-[#9299A8]">Comparaison calculée uniquement à partir des trades réels.</p></div></div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#181C25]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1.5"><span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#9299A8]">Setup A</span><select value={leftKey} onChange={(event) => setLeftKey(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-sm">{setupStats.map((setup) => <option key={setup.key} value={setup.key}>{setup.label}</option>)}</select></label>
            <label className="space-y-1.5"><span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#9299A8]">Setup B</span><select value={rightKey} onChange={(event) => setRightKey(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-sm">{setupStats.map((setup) => <option key={setup.key} value={setup.key}>{setup.label}</option>)}</select></label>
          </div>

          <div className="grid grid-cols-[1fr_100px_1fr] gap-3 px-4 py-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38]">
            <div className="text-center"><div className="text-base font-bold text-[#F97316]">{left.label}</div><span className={`inline-block mt-2 px-2 py-1 rounded-full text-[10px] font-bold border ${getStatus(left).className}`}>{getStatus(left).label}</span></div>
            <div className="flex items-center justify-center text-slate-400">VS</div>
            <div className="text-center"><div className="text-base font-bold text-[#F97316]">{right.label}</div><span className={`inline-block mt-2 px-2 py-1 rounded-full text-[10px] font-bold border ${getStatus(right).className}`}>{getStatus(right).label}</span></div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#292E38] px-4">
            <Stat label="Winrate" leftValue={`${left.winRate}%`} rightValue={`${right.winRate}%`} winners={wr} />
            <Stat label="Trades" leftValue={left.sampleSize} rightValue={right.sampleSize} winners={count} />
            <Stat label="Espérance" leftValue={`${left.rExpectancy !== null ? `${left.rExpectancy}R` : formatCurrency(left.monetaryExpectancy, currency)}`} rightValue={`${right.rExpectancy !== null ? `${right.rExpectancy}R` : formatCurrency(right.monetaryExpectancy, currency)}`} winners={exp} />
            <Stat label="Profit Factor" leftValue={left.profitFactor?.toFixed(2) ?? '—'} rightValue={right.profitFactor?.toFixed(2) ?? '—'} winners={pf} />
            <Stat label="Meilleure session" leftValue={leftKillzone?.label || '—'} rightValue={rightKillzone?.label || '—'} winners={{ a: false, b: false }} />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38]">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-[#9299A8] mb-1">Lecture automatique</div>
            <p className="text-sm font-semibold text-slate-900 dark:text-[#F5F5F5]">{comparisonNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
