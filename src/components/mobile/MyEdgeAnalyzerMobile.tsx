import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, ChevronDown, Download, Filter, Image as ImageIcon, RotateCcw, X } from 'lucide-react';
import type { Trade, TradeDirection } from '../../types/trade';
import type { MobilePageProps } from './types';

type View = 'summary' | 'heatmap' | 'screens' | 'compare' | 'playbook' | 'details';
type Result = 'ALL' | 'WIN' | 'LOSS' | 'BE';
type Filters = { period: 'ALL' | '7D' | '30D' | '90D'; pair: string; setup: string; killzone: string; direction: 'ALL' | TradeDirection; result: Result };
const EMPTY_FILTERS: Filters = { period: 'ALL', pair: 'ALL', setup: 'ALL', killzone: 'ALL', direction: 'ALL', result: 'ALL' };
const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'summary', label: 'Synthèse' }, { value: 'heatmap', label: 'Heatmap' }, { value: 'screens', label: 'Screens' },
  { value: 'compare', label: 'Comparer' }, { value: 'playbook', label: 'Playbook' }, { value: 'details', label: 'Détails' },
];

const tradePnl = (t: Trade) => typeof t.netPnL === 'number' && Number.isFinite(t.netPnL) ? t.netPnL : 0;
const result = (t: Trade): Result => tradePnl(t) > 0 ? 'WIN' : tradePnl(t) < 0 ? 'LOSS' : 'BE';
const setup = (t: Trade) => t.setup || t.setupId || 'Sans setup';
const zone = (t: Trade) => t.session || t.killzone || 'Hors Killzone';
const money = (n: number, currency: string) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;
const winRate = (items: Trade[]) => items.length ? items.filter(t => result(t) === 'WIN').length / items.length * 100 : 0;
const activeFilters = (f: Filters) => Object.values(f).filter(v => v !== 'ALL').length;

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span><strong className="mt-1 block truncate text-lg font-black text-slate-900 dark:text-white">{value}</strong>{hint && <span className="block truncate text-[10px] text-slate-500">{hint}</span>}</div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="block"><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span><div className="relative"><select value={value} onChange={e => onChange(e.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-8 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">{options.map(o => <option key={o} value={o}>{o}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></label>;
}

function Empty({ text, icon }: { text: string; icon?: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700"><span className="text-slate-400">{icon || <BarChart3 className="h-6 w-6" />}</span><strong className="text-xs text-slate-600 dark:text-slate-300">{text}</strong></div>;
}

function exportPlaybook(groups: Array<{ setup: string; zones: string[]; trades: Trade[]; winRate: number; totalPnl: number }>) {
  const rows = [['Setup', 'Killzones', 'Trades', 'Win rate', 'P&L', 'Avg R']];
  groups.forEach(g => {
    const withR = g.trades.filter(t => typeof t.rMultiple === 'number');
    const avgR = withR.length ? withR.reduce((sum, t) => sum + (t.rMultiple || 0), 0) / withR.length : 0;
    rows.push([g.setup, g.zones.join(' / '), String(g.trades.length), pct(g.winRate), String(g.totalPnl), avgR.toFixed(2)]);
  });
  const csv = rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'my-edge-playbook.csv'; link.click(); URL.revokeObjectURL(url);
}

export function MyEdgeAnalyzerMobile({ data }: MobilePageProps) {
  const trades = data.trades || [];
  const currency = ((data.settings as { currency?: string } | null)?.currency) || 'USD';
  const [view, setView] = useState<View>('summary');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  const choices = useMemo(() => ({
    pairs: [...new Set(trades.map(t => t.symbol).filter(Boolean))].sort(),
    setups: [...new Set(trades.map(setup))].sort(),
    zones: [...new Set(trades.map(zone))].sort(),
  }), [trades]);

  const filtered = useMemo(() => {
    const age = filters.period === '7D' ? 7 : filters.period === '30D' ? 30 : filters.period === '90D' ? 90 : 0;
    const cutoff = age ? Date.now() - age * 86400000 : 0;
    return trades.filter(t => {
      if (cutoff && new Date(t.openedAt).getTime() < cutoff) return false;
      if (filters.pair !== 'ALL' && t.symbol !== filters.pair) return false;
      if (filters.setup !== 'ALL' && setup(t) !== filters.setup) return false;
      if (filters.killzone !== 'ALL' && zone(t) !== filters.killzone) return false;
      if (filters.direction !== 'ALL' && t.direction !== filters.direction) return false;
      if (filters.result !== 'ALL' && result(t) !== filters.result) return false;
      return true;
    });
  }, [trades, filters]);

  const total = filtered.reduce((s, t) => s + tradePnl(t), 0);
  const wins = filtered.filter(t => result(t) === 'WIN');
  const losses = filtered.filter(t => result(t) === 'LOSS');
  const grossLoss = losses.reduce((s, t) => s + Math.abs(tradePnl(t)), 0);
  const factor = grossLoss ? wins.reduce((s, t) => s + tradePnl(t), 0) / grossLoss : wins.length ? Infinity : 0;

  const groups = useMemo(() => {
    const map = new Map<string, Trade[]>();
    filtered.forEach(t => map.set(setup(t), [...(map.get(setup(t)) || []), t]));
    return [...map.entries()].map(([name, items]) => ({ setup: name, trades: items, zones: [...new Set(items.map(zone))], winRate: winRate(items), totalPnl: items.reduce((s, t) => s + tradePnl(t), 0) })).sort((a, b) => b.totalPnl - a.totalPnl);
  }, [filtered]);

  const screens = filtered.flatMap(t => [t.screenshotBefore ? { src: t.screenshotBefore, label: `${t.symbol} · avant` } : null, t.screenshotAfter ? { src: t.screenshotAfter, label: `${t.symbol} · après` } : null].filter(Boolean) as Array<{ src: string; label: string }>);
  const a = filtered.find(t => t.id === compareA) || filtered[0];
  const b = filtered.find(t => t.id === compareB) || filtered[1];

  const setDraftValue = (key: keyof Filters, value: string) => setDraft(current => ({ ...current, [key]: value } as Filters));
  const apply = () => { setFilters(draft); setFilterOpen(false); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); };

  return <section data-mobile-ui className="min-w-0 overflow-x-hidden px-3 pb-5 pt-4">
    <header className="mb-3 flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="mb-1 text-[10px] font-black uppercase tracking-wider text-violet-500">My Edge Analyzer</p><h1 className="truncate text-xl font-black text-slate-950 dark:text-white">Ton Edge, en un coup d'œil</h1><p className="mt-1 text-[11px] text-slate-500">{filtered.length} / {trades.length} trades analysés</p></div><button type="button" onClick={() => { setDraft(filters); setFilterOpen(true); }} className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><Filter className="h-4 w-4" /> Filtrer{activeFilters(filters) > 0 && <b className="grid min-w-5 place-items-center rounded-full bg-violet-600 px-1 text-[9px] text-white">{activeFilters(filters)}</b>}</button></header>

    <nav className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{VIEWS.map(v => <button key={v.value} type="button" onClick={() => setView(v.value)} className={`min-h-10 shrink-0 rounded-full border px-3 text-[11px] font-extrabold ${view === v.value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{v.label}</button>)}</nav>

    {view === 'summary' && <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Metric label="P&L" value={money(total, currency)} hint={`${wins.length} gains · ${losses.length} pertes`} /><Metric label="Win rate" value={pct(winRate(filtered))} hint={`${filtered.length} trades`} /><Metric label="Profit factor" value={Number.isFinite(factor) ? factor.toFixed(2) : '∞'} /><Metric label="Avg R" value={`${(filtered.filter(t => typeof t.rMultiple === 'number').reduce((s, t) => s + (t.rMultiple || 0), 0) / Math.max(1, filtered.filter(t => typeof t.rMultiple === 'number').length)).toFixed(2)}R`} /></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-2 flex items-center justify-between"><div><h2 className="text-sm font-black">Synthèse & verdict</h2><p className="text-[10px] text-slate-500">Lecture rapide de l'avantage statistique.</p></div><BarChart3 className="h-5 w-5 text-violet-500" /></div><p className="text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">{!filtered.length ? 'Aucune donnée avec ces filtres.' : winRate(filtered) >= 55 && total > 0 ? 'Edge favorable : les conditions sélectionnées sont rentables et répétables.' : total > 0 ? 'Edge positif mais irrégulier : travaille la sélection des meilleures conditions.' : 'Edge à renforcer : identifie les setups et killzones qui concentrent tes gains.'}</p></div></div>}

    {view === 'heatmap' && <div className="space-y-2"><div className="mb-2"><h2 className="text-sm font-black">Setup × Killzone</h2><p className="text-[10px] text-slate-500">Chaque carte remplace le tableau desktop par une lecture mobile.</p></div>{groups.map(g => <button key={g.setup} type="button" onClick={() => setExpandedSetup(expandedSetup === g.setup ? null : g.setup)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm font-black">{g.setup}</strong><span className="block truncate text-[10px] text-slate-500">{g.zones.join(' · ')} · {g.trades.length} trades</span></div><div className="shrink-0 text-right"><strong className={g.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{money(g.totalPnl, currency)}</strong><span className={`block text-[10px] font-black ${g.winRate >= 55 ? 'text-emerald-600' : g.winRate >= 45 ? 'text-amber-600' : 'text-rose-500'}`}>{pct(g.winRate)} win</span></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, g.winRate)}%` }} /></div>{expandedSetup === g.setup && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">{g.zones.map(z => { const items = g.trades.filter(t => zone(t) === z); return <div key={z} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="block truncate text-[9px] font-bold text-slate-500">{z}</span><strong className="text-sm">{pct(winRate(items))}</strong><span className="block text-[9px] text-slate-500">{items.length} trades</span></div>; })}</div>}</button>)}{!groups.length && <Empty text="Aucun setup avec ces filtres." />}</div>}

    {view === 'screens' && <div className="space-y-3"><div><h2 className="text-sm font-black">Screenshot gallery</h2><p className="text-[10px] text-slate-500">2 colonnes · touche une image pour l'agrandir.</p></div>{screens.length ? <div className="grid grid-cols-2 gap-2">{screens.map(item => <button key={`${item.src}-${item.label}`} type="button" onClick={() => setLightbox(item.src)} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left dark:border-slate-800 dark:bg-slate-900"><img src={item.src} alt={item.label} loading="lazy" className="aspect-square w-full object-cover" /><span className="block truncate px-2 py-2 text-[10px] font-bold">{item.label}</span></button>)}</div> : <Empty icon={<ImageIcon className="h-6 w-6" />} text="Aucun screenshot disponible." />}</div>}

    {view === 'compare' && <div className="space-y-3"><div><h2 className="text-sm font-black">Comparer A / B</h2><p className="text-[10px] text-slate-500">Valeurs favorables mises en évidence.</p></div>{a && b ? <><div className="grid grid-cols-2 gap-2"><Select label="Trade A" value={compareA || a.id} options={filtered.map(t => t.id)} onChange={setCompareA} /><Select label="Trade B" value={compareB || b.id} options={filtered.map(t => t.id)} onChange={setCompareB} /></div>{[['P&L', tradePnl(a), tradePnl(b)], ['R multiple', a.rMultiple || 0, b.rMultiple || 0], ['Setup', setup(a), setup(b)], ['Killzone', zone(a), zone(b)], ['Direction', a.direction, b.direction], ['Timeframe', a.timeframe || '—', b.timeframe || '—']].map(([label, av, bv]) => <div key={String(label)} className="grid grid-cols-[70px_1fr_1fr] gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-[10px] dark:border-slate-800 dark:bg-slate-900"><span className="self-center font-bold text-slate-500">{label}</span><span className="min-w-0 truncate rounded-lg bg-emerald-50 px-2 py-2 font-extrabold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{typeof av === 'number' ? String(av.toFixed(2)) : av}</span><span className="min-w-0 truncate rounded-lg bg-slate-50 px-2 py-2 font-extrabold dark:bg-slate-800">{typeof bv === 'number' ? String(bv.toFixed(2)) : bv}</span></div>)}</> : <Empty text="Deux trades sont nécessaires pour comparer." />}</div>}

    {view === 'playbook' && <div className="space-y-3"><div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-black">Playbook</h2><p className="text-[10px] text-slate-500">Conditions à répéter et à surveiller.</p></div><button type="button" onClick={() => exportPlaybook(groups)} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-[10px] font-black text-white"><Download className="h-4 w-4" /> Exporter</button></div>{groups.slice(0, 12).map(g => <div key={g.setup} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-sm font-black">{g.setup}</strong><span className="text-[10px] text-slate-500">{g.trades.length} trades · {g.zones.join(' · ')}</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${g.winRate >= 55 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{pct(g.winRate)}</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-slate-500">P&L</span><strong className={g.totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{money(g.totalPnl, currency)}</strong></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-slate-500">Décision</span><strong>{g.winRate >= 55 ? 'À privilégier' : 'À surveiller'}</strong></div></div></div>)}{!groups.length && <Empty text="Le playbook est vide avec ces filtres." />}</div>}

    {view === 'details' && <div className="space-y-2"><h2 className="text-sm font-black">Détails des trades</h2>{filtered.slice(0, 100).map(t => <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-xs font-black">{t.symbol} · {t.direction}</strong><span className="text-[9px] text-slate-500">{setup(t)} · {zone(t)}</span></div><strong className={`shrink-0 text-xs ${tradePnl(t) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{money(tradePnl(t), currency)}</strong></div><div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px]"><span className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">R {t.rMultiple?.toFixed(2) || '—'}</span><span className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">{t.timeframe || '—'}</span><span className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">{t.status}</span></div></div>)}{filtered.length > 100 && <p className="text-center text-[10px] text-slate-500">100 premiers trades affichés sur {filtered.length}.</p>}</div>}

    {filterOpen && <div className="fixed inset-0 z-[100] flex items-end bg-black/45"><div role="dialog" aria-modal="true" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(18px+env(safe-area-inset-bottom))] dark:bg-slate-950"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" /><div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-black">Filtres</h2><p className="text-[10px] text-slate-500">Période · paire · setup · killzone · direction · résultat</p></div><button type="button" onClick={() => setFilterOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Fermer"><X className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-3"><Select label="Période" value={draft.period} options={['ALL', '7D', '30D', '90D']} onChange={v => setDraftValue('period', v)} /><Select label="Paire" value={draft.pair} options={['ALL', ...choices.pairs]} onChange={v => setDraftValue('pair', v)} /><Select label="Setup" value={draft.setup} options={['ALL', ...choices.setups]} onChange={v => setDraftValue('setup', v)} /><Select label="Killzone" value={draft.killzone} options={['ALL', ...choices.zones]} onChange={v => setDraftValue('killzone', v)} /><Select label="Direction" value={draft.direction} options={['ALL', 'BUY', 'SELL']} onChange={v => setDraftValue('direction', v)} /><Select label="Résultat" value={draft.result} options={['ALL', 'WIN', 'LOSS', 'BE']} onChange={v => setDraftValue('result', v)} /></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={reset} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-black dark:border-slate-700"><RotateCcw className="h-4 w-4" /> Réinitialiser</button><button type="button" onClick={apply} className="min-h-12 rounded-xl bg-violet-600 text-xs font-black text-white">Appliquer</button></div></div></div>}
    {lightbox && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3" onClick={() => setLightbox(null)}><img src={lightbox} alt="Screenshot agrandi" className="max-h-[92dvh] max-w-full rounded-xl object-contain" /></div>}
  </section>;
}
