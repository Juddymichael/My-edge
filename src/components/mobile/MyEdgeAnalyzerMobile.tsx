import { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Download,
  Filter,
  Image as ImageIcon,
  RotateCcw,
  X,
} from 'lucide-react';
import type { Trade, TradeDirection } from '../../types/trade';
import type { MobilePageProps } from './types';

type View = 'summary' | 'heatmap' | 'screens' | 'compare' | 'playbook' | 'details';
type ResultFilter = 'ALL' | 'WIN' | 'LOSS' | 'BE';

type Filters = {
  period: 'ALL' | '7D' | '30D' | '90D';
  pair: string;
  setup: string;
  killzone: string;
  direction: 'ALL' | TradeDirection;
  result: ResultFilter;
};

const DEFAULT_FILTERS: Filters = {
  period: 'ALL',
  pair: 'ALL',
  setup: 'ALL',
  killzone: 'ALL',
  direction: 'ALL',
  result: 'ALL',
};

const VIEW_OPTIONS: Array<{ value: View; label: string }> = [
  { value: 'summary', label: 'Synthèse' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'screens', label: 'Screens' },
  { value: 'compare', label: 'Comparer' },
  { value: 'playbook', label: 'Playbook' },
  { value: 'details', label: 'Détails' },
];

function pnl(trade: Trade) {
  return typeof trade.netPnL === 'number' && Number.isFinite(trade.netPnL) ? trade.netPnL : 0;
}

function resultOf(trade: Trade): ResultFilter {
  const value = pnl(trade);
  if (value > 0) return 'WIN';
  if (value < 0) return 'LOSS';
  return 'BE';
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function winRate(trades: Trade[]) {
  if (!trades.length) return 0;
  return (trades.filter(t => resultOf(t) === 'WIN').length / trades.length) * 100;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function labelKillzone(trade: Trade) {
  return trade.session || trade.killzone || 'Hors Killzone';
}

function labelSetup(trade: Trade) {
  return trade.setup || trade.setupId || 'Sans setup';
}

function filterCount(filters: Filters) {
  return Object.values(filters).filter(value => value !== 'ALL').length;
}

function downloadPlaybook(trades: Trade[]) {
  const rows = [
    ['Setup', 'Killzone', 'Trades', 'Win rate', 'P&L', 'Avg R'],
    ...Array.from(new Set(trades.map(labelSetup))).map(setup => {
      const subset = trades.filter(t => labelSetup(t) === setup);
      const avgR = subset.filter(t => typeof t.rMultiple === 'number').reduce((sum, t) => sum + (t.rMultiple || 0), 0) /
        Math.max(1, subset.filter(t => typeof t.rMultiple === 'number').length);
      const zones = Array.from(new Set(subset.map(labelKillzone))).join(' / ');
      return [setup, zones, String(subset.length), percent(winRate(subset)), pnl(subset.reduce((sum, t) => sum + pnl(t), 0) as unknown as Trade), avgR.toFixed(2)];
    }),
  ];
  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'my-edge-playbook.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-lg font-black text-slate-900 dark:text-white">{value}</strong>
      {hint && <span className="mt-0.5 block truncate text-[10px] text-slate-500">{hint}</span>}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

export function MyEdgeAnalyzerMobile({ data }: MobilePageProps) {
  const trades = data.trades || [];
  const settings = data.settings as { currency?: string };
  const currency = settings?.currency || 'USD';
  const [view, setView] = useState<View>('summary');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');

  const options = useMemo(() => ({
    pairs: Array.from(new Set(trades.map(t => t.symbol).filter(Boolean))).sort(),
    setups: Array.from(new Set(trades.map(labelSetup))).sort(),
    killzones: Array.from(new Set(trades.map(labelKillzone))).sort(),
  }), [trades]);

  const filteredTrades = useMemo(() => {
    const now = Date.now();
    const periodMs = filters.period === '7D' ? 7 * 86400000 : filters.period === '30D' ? 30 * 86400000 : filters.period === '90D' ? 90 * 86400000 : Infinity;
    return trades.filter(trade => {
      const opened = new Date(trade.openedAt).getTime();
      if (periodMs !== Infinity && (!Number.isFinite(opened) || now - opened > periodMs)) return false;
      if (filters.pair !== 'ALL' && trade.symbol !== filters.pair) return false;
      if (filters.setup !== 'ALL' && labelSetup(trade) !== filters.setup) return false;
      if (filters.killzone !== 'ALL' && labelKillzone(trade) !== filters.killzone) return false;
      if (filters.direction !== 'ALL' && trade.direction !== filters.direction) return false;
      if (filters.result !== 'ALL' && resultOf(trade) !== filters.result) return false;
      return true;
    });
  }, [trades, filters]);

  const totalPnl = filteredTrades.reduce((sum, trade) => sum + pnl(trade), 0);
  const winners = filteredTrades.filter(t => resultOf(t) === 'WIN');
  const losers = filteredTrades.filter(t => resultOf(t) === 'LOSS');
  const avgR = filteredTrades.filter(t => typeof t.rMultiple === 'number').reduce((sum, t) => sum + (t.rMultiple || 0), 0) /
    Math.max(1, filteredTrades.filter(t => typeof t.rMultiple === 'number').length);
  const profitFactor = losers.reduce((sum, t) => sum + Math.abs(pnl(t)), 0) > 0
    ? winners.reduce((sum, t) => sum + pnl(t), 0) / losers.reduce((sum, t) => sum + Math.abs(pnl(t)), 0)
    : winners.length ? Infinity : 0;

  const setupGroups = useMemo(() => {
    const map = new Map<string, Trade[]>();
    filteredTrades.forEach(trade => {
      const key = labelSetup(trade);
      const group = map.get(key) || [];
      group.push(trade);
      map.set(key, group);
    });
    return Array.from(map.entries()).map(([setup, group]) => ({
      setup,
      trades: group,
      winRate: winRate(group),
      pnl: group.reduce((sum, trade) => sum + pnl(trade), 0),
      zones: Array.from(new Set(group.map(labelKillzone))),
    })).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const screenshots = useMemo(() => filteredTrades.flatMap(trade => [
    trade.screenshotBefore ? { src: trade.screenshotBefore, label: `${trade.symbol} · avant`, trade } : null,
    trade.screenshotAfter ? { src: trade.screenshotAfter, label: `${trade.symbol} · après`, trade } : null,
  ].filter(Boolean) as Array<{ src: string; label: string; trade: Trade }>), [filteredTrades]);

  const selectedA = filteredTrades.find(trade => trade.id === compareA) || filteredTrades[0];
  const selectedB = filteredTrades.find(trade => trade.id === compareB) || filteredTrades[1];

  const applyFilters = () => {
    setFilters(draftFilters);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  const setDraft = (key: keyof Filters, value: string) => {
    setDraftFilters(current => ({ ...current, [key]: value } as Filters));
  };

  return (
    <section data-mobile-ui className="min-w-0 overflow-x-hidden px-3 pb-5 pt-4">
      <header className="mb-3 min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.09em] text-violet-500">My Edge Analyzer</p>
            <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">Ton Edge, en un coup d'œil</h1>
            <p className="mt-1 truncate text-[11px] text-slate-500">{filteredTrades.length} / {trades.length} trades analysés</p>
          </div>
          <button type="button" onClick={() => { setDraftFilters(filters); setFilterOpen(true); }} className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Filter className="h-4 w-4" />
            Filtrer
            {filterCount(filters) > 0 && <b className="grid min-w-5 place-items-center rounded-full bg-violet-600 px-1 text-[9px] text-white">{filterCount(filters)}</b>}
          </button>
        </div>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {VIEW_OPTIONS.map(option => (
          <button key={option.value} type="button" onClick={() => setView(option.value)} className={`min-h-10 shrink-0 rounded-full border px-3 text-[11px] font-extrabold ${view === option.value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>
            {option.label}
          </button>
        ))}
      </div>

      {view === 'summary' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="P&L" value={formatMoney(totalPnl, currency)} hint={`${winners.length} gains · ${losers.length} pertes`} />
            <MetricCard label="Win rate" value={percent(winRate(filteredTrades))} hint={`${filteredTrades.length} trades`} />
            <MetricCard label="Profit factor" value={Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'} hint="Gains / pertes" />
            <MetricCard label="Avg R" value={`${avgR.toFixed(2)}R`} hint="R moyen disponible" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-sm font-black">Verdict</h2><p className="text-[10px] text-slate-500">Lecture rapide de ton avantage</p></div><BarChart3 className="h-5 w-5 text-violet-500" /></div>
            <p className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">
              {!filteredTrades.length ? 'Aucune donnée ne correspond aux filtres.' : winRate(filteredTrades) >= 55 && totalPnl > 0 ? 'Edge favorable : tes résultats montrent une vraie asymétrie positive.' : totalPnl > 0 ? 'Edge positif mais encore irrégulier : travaille la répétabilité.' : 'Edge à renforcer : cherche les conditions qui concentrent tes meilleurs résultats.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setView('heatmap')} className="min-h-11 rounded-xl bg-violet-50 text-xs font-extrabold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">Voir les setups</button>
              <button type="button" onClick={() => setView('screens')} className="min-h-11 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Voir les screens</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Meilleur setup" value={setupGroups[0]?.setup || '—'} hint={setupGroups[0] ? `${percent(setupGroups[0].winRate)} de win rate` : undefined} />
            <MetricCard label="Meilleure killzone" value={Array.from(new Set(filteredTrades.map(labelKillzone))).sort((a, b) => {
              const aw = winRate(filteredTrades.filter(t => labelKillzone(t) === a));
              const bw = winRate(filteredTrades.filter(t => labelKillzone(t) === b));
              return bw - aw;
            })[0] || '—'} hint="au win rate" />
          </div>
        </div>
      )}

      {view === 'heatmap' && (
        <div className="space-y-2">
          <div className="mb-2 flex items-center justify-between"><div><h2 className="text-sm font-black">Setup × Killzone</h2><p className="text-[10px] text-slate-500">Tap un setup pour voir son détail.</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold dark:bg-slate-800">{setupGroups.length} setups</span></div>
          {setupGroups.map(group => (
            <button key={group.setup} type="button" onClick={() => setSelectedSetup(selectedSetup === group.setup ? null : group.setup)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm font-black">{group.setup}</strong><span className="mt-1 block truncate text-[10px] text-slate-500">{group.zones.join(' · ')}</span></div><div className="shrink-0 text-right"><strong className={`block text-sm font-black ${group.pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatMoney(group.pnl, currency)}</strong><span className={`text-[10px] font-extrabold ${group.winRate >= 55 ? 'text-emerald-600' : group.winRate >= 45 ? 'text-amber-600' : 'text-rose-500'}`}>{percent(group.winRate)} win</span></div></div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, group.winRate))}%` }} /></div>
              {selectedSetup === group.setup && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">{group.zones.map(zone => { const zoneTrades = group.trades.filter(t => labelKillzone(t) === zone); return <div key={zone} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><span className="block truncate text-[10px] font-bold text-slate-500">{zone}</span><strong className="block text-sm">{percent(winRate(zoneTrades))}</strong><span className="text-[9px] text-slate-500">{zoneTrades.length} trades</span></div>; })}</div>}
            </button>
          ))}
          {!setupGroups.length && <Empty text="Pas assez de données pour construire le heatmap." />}
        </div>
      )}

      {view === 'screens' && (
        <div className="space-y-3">
          <div><h2 className="text-sm font-black">Screenshot gallery</h2><p className="text-[10px] text-slate-500">2 colonnes · touche une image pour le plein écran.</p></div>
          {screenshots.length ? <div className="grid grid-cols-2 gap-2">{screenshots.map(item => <button key={`${item.src}-${item.label}`} type="button" onClick={() => setSelectedScreenshot(item.src)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left dark:border-slate-800 dark:bg-slate-900"><img src={item.src} alt={item.label} className="aspect-square w-full object-cover" loading="lazy" /><span className="block truncate px-2.5 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.label}</span></button>)}</div> : <Empty icon={<ImageIcon className="h-6 w-6" />} text="Aucun screenshot disponible avec ces filtres." />}
        </div>
      )}

      {view === 'compare' && (
        <div className="space-y-3">
          <div><h2 className="text-sm font-black">Comparer A / B</h2><p className="text-[10px] text-slate-500">Choisis deux trades et compare les métriques essentielles.</p></div>
          <div className="grid grid-cols-2 gap-2">
            <FilterSelect label="Trade A" value={compareA || selectedA?.id || ''} options={filteredTrades.map(t => t.id)} onChange={setCompareA} />
            <FilterSelect label="Trade B" value={compareB || selectedB?.id || ''} options={filteredTrades.map(t => t.id)} onChange={setCompareB} />
          </div>
          {selectedA && selectedB ? <div className="space-y-2">{[
            ['P&L', formatMoney(pnl(selectedA), currency), formatMoney(pnl(selectedB), currency), pnl(selectedA) >= pnl(selectedB)],
            ['R multiple', selectedA.rMultiple != null ? `${selectedA.rMultiple.toFixed(2)}R` : '—', selectedB.rMultiple != null ? `${selectedB.rMultiple.toFixed(2)}R` : '—', (selectedA.rMultiple || 0) >= (selectedB.rMultiple || 0)],
            ['Setup', labelSetup(selectedA), labelSetup(selectedB), labelSetup(selectedA) === labelSetup(selectedB)],
            ['Killzone', labelKillzone(selectedA), labelKillzone(selectedB), labelKillzone(selectedA) === labelKillzone(selectedB)],
            ['Direction', selectedA.direction, selectedB.direction, selectedA.direction === selectedB.direction],
            ['Timeframe', selectedA.timeframe || '—', selectedB.timeframe || '—', selectedA.timeframe === selectedB.timeframe],
          ].map(row => <div key={row[0]} className="grid grid-cols-[76px_1fr_1fr] items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] dark:border-slate-800 dark:bg-slate-900"><span className="font-bold text-slate-500">{row[0]}</span><span className={`min-w-0 truncate rounded-lg px-2 py-1.5 font-extrabold ${row[3] ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{row[1]}</span><span className={`min-w-0 truncate rounded-lg px-2 py-1.5 font-extrabold ${!row[3] && row[0] === 'P&L' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{row[2]}</span></div>)} </div> : <Empty text="Deux trades sont nécessaires pour la comparaison." />}
        </div>
      )}

      {view === 'playbook' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-black">Playbook</h2><p className="text-[10px] text-slate-500">Les conditions qui méritent d'être répétées.</p></div><button type="button" onClick={() => downloadPlaybook(filteredTrades)} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-[10px] font-extrabold text-white"><Download className="h-4 w-4" /> Exporter</button></div>
          {setupGroups.slice(0, 8).map(group => <div key={group.setup} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-sm font-black">{group.setup}</strong><span className="text-[10px] text-slate-500">{group.trades.length} trades · {group.zones.join(' · ')}</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${group.winRate >= 55 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{percent(group.winRate)}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-[9px] font-bold text-slate-500">P&L</span><strong className={group.pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatMoney(group.pnl, currency)}</strong></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-[9px] font-bold text-slate-500">Action</span><strong className="text-xs">{group.winRate >= 55 ? 'À privilégier' : 'À surveiller'}</strong></div></div></div>)}
          {!setupGroups.length && <Empty text="Le playbook est vide avec ces filtres." />}
        </div>
      )}

      {view === 'details' && (
        <div className="space-y-2">
          <div className="mb-2"><h2 className="text-sm font-black">Détails des données</h2><p className="text-[10px] text-slate-500">Lecture compacte de chaque trade filtré.</p></div>
          {filteredTrades.slice(0, 100).map(trade => <div key={trade.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-xs font-black">{trade.symbol} · {trade.direction}</strong><span className="text-[9px] text-slate-500">{labelSetup(trade)} · {labelKillzone(trade)}</span></div><strong className={`shrink-0 text-xs ${pnl(trade) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatMoney(pnl(trade), currency)}</strong></div><div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px]"><span className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold dark:bg-slate-800">R: {trade.rMultiple != null ? trade.rMultiple.toFixed(2) : '—'}</span><span className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold dark:bg-slate-800">TF: {trade.timeframe || '—'}</span><span className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold dark:bg-slate-800">{trade.status}</span></div></div>)}
          {filteredTrades.length > 100 && <p className="pt-2 text-center text-[10px] font-bold text-slate-500">100 premiers trades affichés sur {filteredTrades.length}.</p>}
        </div>
      )}

      {filterOpen && <div className="fixed inset-0 z-[100] flex items-end bg-black/45"><div role="dialog" aria-modal="true" className="max-h-[86dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(18px+env(safe-area-inset-bottom))] dark:bg-slate-950"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" /><div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-black">Filtres My Edge</h2><p className="text-[10px] text-slate-500">Construis ton échantillon d'analyse.</p></div><button type="button" onClick={() => setFilterOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-3"><FilterSelect label="Période" value={draftFilters.period} options={['ALL', '7D', '30D', '90D']} onChange={value => setDraft('period', value)} /><FilterSelect label="Paire" value={draftFilters.pair} options={['ALL', ...options.pairs]} onChange={value => setDraft('pair', value)} /><FilterSelect label="Setup" value={draftFilters.setup} options={['ALL', ...options.setups]} onChange={value => setDraft('setup', value)} /><FilterSelect label="Killzone" value={draftFilters.killzone} options={['ALL', ...options.killzones]} onChange={value => setDraft('killzone', value)} /><FilterSelect label="Direction" value={draftFilters.direction} options={['ALL', 'BUY', 'SELL']} onChange={value => setDraft('direction', value)} /><FilterSelect label="Résultat" value={draftFilters.result} options={['ALL', 'WIN', 'LOSS', 'BE']} onChange={value => setDraft('result', value)} /></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={resetFilters} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-extrabold dark:border-slate-700"><RotateCcw className="h-4 w-4" /> Réinitialiser</button><button type="button" onClick={applyFilters} className="min-h-12 rounded-xl bg-violet-600 text-xs font-extrabold text-white">Appliquer · {filteredTrades.length} trades</button></div></div></div>}

      {selectedScreenshot && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3" onClick={() => setSelectedScreenshot(null)}><img src={selectedScreenshot} alt="Screenshot agrandi" className="max-h-[92dvh] max-w-full rounded-xl object-contain" /></div>}
    </section>
  );
}

function Empty({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-5 text-center dark:border-slate-700"><span className="text-slate-400">{icon || <BarChart3 className="h-6 w-6" />}</span><strong className="text-xs font-black text-slate-700 dark:text-slate-200">{text}</strong></div>;
}
