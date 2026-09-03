import { useEffect, useState } from 'react';
import { CalendarDays, Crosshair, LayoutDashboard, BookOpen, Sparkles, Sliders } from 'lucide-react';
import type { ActiveTab } from '../Sidebar';
import type { MobileSharedData } from './types';
import { DashboardMobile } from './DashboardMobile';
import { TradeJournalMobile } from './TradeJournalMobile';
import { AIAnalysisMobile } from './AIAnalysisMobile';
import { MyEdgeAnalyzerMobile } from './MyEdgeAnalyzerMobile';
import { CalendarMobile } from './CalendarMobile';
import { ImportModal } from '../ImportModal';
import { SetupsManagementModal } from '../SetupsManagementModal';
import { OfflineIndicator } from '../OfflineIndicator';

interface MobileAppProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  data: MobileSharedData;
  onLogTrade: () => void;
  onDeleteTrade: (id: string) => Promise<void>;
  onOpenImport: () => void;
}

const mobilePages = [
  { id: 'dashboard' as const, label: 'Accueil', icon: LayoutDashboard },
  { id: 'trades' as const, label: 'Journal', icon: BookOpen },
  { id: 'ai-analysis' as const, label: 'IA', icon: Sparkles },
  { id: 'edge' as const, label: 'Edge', icon: Crosshair },
  { id: 'calendar' as const, label: 'Calendrier', icon: CalendarDays },
];

export function MobileApp({
  activeTab,
  onTabChange,
  data,
  onLogTrade,
  onDeleteTrade,
  onOpenImport,
}: MobileAppProps) {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [setupsOpen, setSetupsOpen] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const openImport = () => {
    setImportOpen(true);
    onOpenImport();
  };

  const page =
    activeTab === 'trades' ? (
      <TradeJournalMobile data={data} onDeleteTrade={onDeleteTrade} onOpenImport={openImport} />
    ) : activeTab === 'ai-analysis' ? (
      <AIAnalysisMobile data={data} />
    ) : activeTab === 'edge' ? (
      <MyEdgeAnalyzerMobile data={data} />
    ) : activeTab === 'calendar' ? (
      <CalendarMobile data={data} />
    ) : (
      <DashboardMobile data={data} onLogTrade={onLogTrade} />
    );

  return (
    <div
      data-mobile-ui
      className="mobile-app-shell min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B0D12] dark:text-[#F5F5F5]"
    >
      <OfflineIndicator />

      <div className="sticky top-0 z-40 flex items-center justify-end gap-2 px-3 pt-2 pointer-events-none">
        <button
          type="button"
          onClick={() => setSetupsOpen(true)}
          className="pointer-events-auto flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 text-[10px] font-extrabold text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          aria-label="Ouvrir Setups Manager"
        >
          <Sliders className="h-3.5 w-3.5" />
          Setups
        </button>
      </div>

      <main className="mobile-app-content">{page}</main>

      {activeTab === 'ai-analysis' && offline && (
        <div className="fixed bottom-[76px] left-3 right-3 z-[60] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Cette fonctionnalité nécessite une connexion internet
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        {mobilePages.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`mobile-nav-item ${activeTab === id ? 'is-active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="mobile-safe-text">{label}</span>
          </button>
        ))}
      </nav>

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImportComplete={() => {
          window.dispatchEvent(new Event('thunder-edge-trades-changed'));
        }}
        existingTrades={data.trades}
      />
      <SetupsManagementModal isOpen={setupsOpen} onClose={() => setSetupsOpen(false)} />
    </div>
  );
}
