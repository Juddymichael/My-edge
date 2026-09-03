import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronDown, Eye, Filter, Search, Trash2, Upload, X } from 'lucide-react';
import type { Trade, TradeStatus } from '../../types/trade';
import type { MobilePageProps } from './types';

type TradeJournalMobileProps = MobilePageProps & {
  onDeleteTrade: (id: string) => Promise<void>;
  onOpenImport: () => void;
};

const PAGE_SIZE = 30;
const STATUS_OPTIONS: Array<{ value: 'ALL' | TradeStatus; label: string }> = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'CLOSED', label: 'Fermés' },
  { value: 'OPEN', label: 'Ouverts' },
  { value: 'CANCELLED', label: 'Annulés' },
];

function money(value: number | null | undefined, currency: string) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function price(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 6 });
}

function dateTime(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

function killzoneLabel(trade: Trade) {
  return trade.session || trade.killzone || 'Hors Killzone';
}

function matchesSearch(trade: Trade, query: string) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return [trade.symbol, trade.ticket, trade.setup, trade.setupId, trade.entryModel, trade.notes]
    .filter(Boolean).some(value => String(value).toLowerCase().includes(q));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="trade-mobile-detail-row"><span>{label}</span><strong className="mobile-safe-text">{value}</strong></div>;
}

export function TradeJournalMobile({ data, onDeleteTrade, onOpenImport }: TradeJournalMobileProps) {
  const trades = data.trades || [];
  const currency = typeof data.settings === 'object' && data.settings && 'currency' in data.settings && typeof data.settings.currency === 'string' ? data.settings.currency : 'USD';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | TradeStatus>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTrades = useMemo(() => [...trades]
    .filter(t => status === 'ALL' || t.status === status)
    .filter(t => matchesSearch(t, query))
    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()), [trades, query, status]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, status, trades.length]);

  const visibleTrades = filteredTrades.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrades.length;

  useEffect(() => {
    if (!hasMore) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700) setVisibleCount(current => Math.min(current + PAGE_SIZE, filteredTrades.length));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, filteredTrades.length]);

  const handleDelete = async (trade: Trade) => {
    if (!window.confirm(`Supprimer le trade ${trade.symbol}${trade.ticket ? ` #${trade.ticket}` : ''} ?`)) return;
    setDeletingId(trade.id);
    try {
      await onDeleteTrade(trade.id);
      if (selectedTrade?.id === trade.id) setSelectedTrade(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (selectedTrade) {
    return <section data-mobile-ui className="trade-mobile-detail-screen">
      <header className="trade-mobile-detail-header">
        <button type="button" className="trade-mobile-back" onClick={() => setSelectedTrade(null)} aria-label="Retour au journal"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0"><p className="trade-mobile-eyebrow">Détail du trade</p><h1 className="mobile-safe-text">{selectedTrade.symbol}</h1></div>
        <button type="button" className="trade-mobile-delete" onClick={() => void handleDelete(selectedTrade)} disabled={deletingId === selectedTrade.id} aria-label="Supprimer"><Trash2 className="h-5 w-5" /></button>
      </header>
      <div className="trade-mobile-detail-scroll">
        <div className="trade-mobile-detail-hero">
          <div><span className={`trade-mobile-direction ${selectedTrade.direction === 'BUY' ? 'buy' : 'sell'}`}>{selectedTrade.direction}</span><p>{dateTime(selectedTrade.openedAt)}</p></div>
          <strong className={selectedTrade.netPnL != null && selectedTrade.netPnL >= 0 ? 'positive' : 'negative'}>{money(selectedTrade.netPnL, currency)}</strong>
        </div>
        <div className="trade-mobile-detail-card">
          <DetailRow label="Ticket" value={selectedTrade.ticket || selectedTrade.id.slice(0, 10)} />
          <DetailRow label="Statut" value={selectedTrade.status} />
          <DetailRow label="Entrée → sortie" value={`${price(selectedTrade.entryPrice)} → ${price(selectedTrade.exitPrice)}`} />
          <DetailRow label="Stop Loss" value={price(selectedTrade.stopLoss)} />
          <DetailRow label="Take Profit" value={price(selectedTrade.takeProfit)} />
          <DetailRow label="Lot size" value={selectedTrade.lotSize != null ? String(selectedTrade.lotSize) : '—'} />
          <DetailRow label="Quantité" value={selectedTrade.quantity != null ? String(selectedTrade.quantity) : '—'} />
          <DetailRow label="R-multiple" value={selectedTrade.rMultiple != null ? `${selectedTrade.rMultiple.toFixed(2)}R` : '—'} />
          <DetailRow label="Risque initial" value={money(selectedTrade.initialRiskAmount, currency)} />
          <DetailRow label="Killzone" value={killzoneLabel(selectedTrade)} />
          <DetailRow label="Setup" value={selectedTrade.setup || '—'} />
          <DetailRow label="Timeframe" value={selectedTrade.timeframe || '—'} />
          <DetailRow label="Émotion" value={selectedTrade.emotion || '—'} />
          <DetailRow label="Erreur" value={selectedTrade.mistake || '—'} />
          <DetailRow label="Ouvert" value={dateTime(selectedTrade.openedAt)} />
          <DetailRow label="Fermé" value={dateTime(selectedTrade.closedAt)} />
        </div>
        {selectedTrade.notes && <div className="trade-mobile-detail-card"><h2>Notes</h2><p className="trade-mobile-notes">{selectedTrade.notes}</p></div>}
        {(selectedTrade.tags.length > 0) && <div className="trade-mobile-detail-card"><h2>Tags</h2><div className="trade-mobile-tags">{selectedTrade.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>}
        {(selectedTrade.screenshotBefore || selectedTrade.screenshotAfter) && <div className="trade-mobile-detail-card"><h2>Screenshots</h2><div className="trade-mobile-screenshots">{[selectedTrade.screenshotBefore, selectedTrade.screenshotAfter].filter(Boolean).map((src, index) => <img key={`${src}-${index}`} src={src as string} alt={index === 0 ? 'Avant le trade' : 'Après le trade'} loading="lazy" />)}</div></div>}
      </div>
    </section>;
  }

  return <section data-mobile-ui className="trade-mobile-page">
    <header className="trade-mobile-header">
      <div className="trade-mobile-title-row"><div className="min-w-0"><p className="trade-mobile-eyebrow">Journal de trading</p><h1>Trade Journal</h1><span>{trades.length} trades</span></div><button type="button" className="trade-mobile-import" onClick={onOpenImport}><Upload className="h-4 w-4" /><span>Importer</span></button></div>
      <div className="trade-mobile-tools">
        <label className="trade-mobile-search"><Search className="h-4 w-4" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Symbole, ticket, setup…" aria-label="Rechercher un trade" /><button type="button" className="trade-mobile-clear" onClick={() => setQuery('')} hidden={!query} aria-label="Effacer"><X className="h-4 w-4" /></button></label>
        <button type="button" className={`trade-mobile-filter-button ${status !== 'ALL' ? 'active' : ''}`} onClick={() => setFilterOpen(true)}><Filter className="h-4 w-4" /><span>Filtrer</span>{status !== 'ALL' && <b>1</b>}</button>
      </div>
    </header>

    {filterOpen && <div className="trade-mobile-sheet-backdrop" onClick={() => setFilterOpen(false)}><div className="trade-mobile-sheet" role="dialog" aria-modal="true" aria-label="Filtres" onClick={e => e.stopPropagation()}><div className="trade-mobile-sheet-handle" /><div className="trade-mobile-sheet-head"><h2>Filtrer les trades</h2><button type="button" onClick={() => setFilterOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></button></div><div className="trade-mobile-filter-group"><span>Statut</span>{STATUS_OPTIONS.map(option => <button key={option.value} type="button" className={status === option.value ? 'selected' : ''} onClick={() => setStatus(option.value)}>{option.label}<ChevronDown className="h-4 w-4" /></button>)}</div><button type="button" className="trade-mobile-apply" onClick={() => setFilterOpen(false)}>Voir {filteredTrades.length} trade{filteredTrades.length > 1 ? 's' : ''}</button></div></div>}

    <div className="trade-mobile-results"><span>{filteredTrades.length} résultat{filteredTrades.length > 1 ? 's' : ''}</span>{query && <span className="trade-mobile-query">« {query} »</span>}</div>
    <div className="trade-mobile-list">
      {visibleTrades.map(trade => <article key={trade.id} className="trade-mobile-card" role="button" tabIndex={0} onClick={() => setSelectedTrade(trade)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTrade(trade); } }}>
        <div className="trade-mobile-card-top"><div className="trade-mobile-symbol-wrap"><strong className="trade-mobile-symbol">{trade.symbol}</strong><span className={`trade-mobile-direction ${trade.direction === 'BUY' ? 'buy' : 'sell'}`}>{trade.direction}</span></div><strong className={`trade-mobile-pnl ${(trade.netPnL ?? 0) >= 0 ? 'positive' : 'negative'}`}>{money(trade.netPnL, currency)}</strong></div>
        <div className="trade-mobile-card-mid"><span><CalendarDays className="h-3.5 w-3.5" />{dateTime(trade.openedAt)}</span><span className="trade-mobile-prices">{price(trade.entryPrice)} <b>→</b> {price(trade.exitPrice)}</span></div>
        <div className="trade-mobile-card-bottom"><div className="trade-mobile-meta"><span className="trade-mobile-killzone">{killzoneLabel(trade)}</span>{trade.setup && <span className="trade-mobile-setup">{trade.setup}</span>}</div><div className="trade-mobile-actions"><button type="button" onClick={e => { e.stopPropagation(); setSelectedTrade(trade); }} aria-label="Voir le détail"><Eye className="h-4 w-4" /></button><button type="button" disabled={deletingId === trade.id} onClick={e => { e.stopPropagation(); void handleDelete(trade); }} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></div></div>
      </article>)}
    </div>
    {visibleTrades.length === 0 && <div className="trade-mobile-empty"><Search className="h-7 w-7" /><strong>Aucun trade trouvé</strong><span>Modifie la recherche ou les filtres.</span></div>}
    {hasMore && <div className="trade-mobile-loading">Chargement de {Math.min(PAGE_SIZE, filteredTrades.length - visibleCount)} trades…</div>}
    {!hasMore && filteredTrades.length > 0 && <div className="trade-mobile-end">Fin du journal · {filteredTrades.length} trade{filteredTrades.length > 1 ? 's' : ''}</div>}
  </section>;
}
