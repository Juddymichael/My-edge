import { CalendarDays, Crosshair, LayoutDashboard, BookOpen, Sparkles } from 'lucide-react';
import type { ActiveTab } from '../Sidebar';
import type { Trade } from '../../types/trade';
import { DashboardMobile } from './DashboardMobile';
import { TradeJournalMobile } from './TradeJournalMobile';
import { AIAnalysisMobile } from './AIAnalysisMobile';
import { MyEdgeAnalyzerMobile } from './MyEdgeAnalyzerMobile';
import { CalendarMobile } from './CalendarMobile';

export interface MobileSharedData { trades: Trade[]; settings: unknown; setups: unknown[]; }
interface MobileAppProps { activeTab: ActiveTab; onTabChange: (tab: ActiveTab) => void; data: MobileSharedData; }

const mobilePages = [
  { id: 'dashboard' as const, label: 'Accueil', icon: LayoutDashboard },
  { id: 'trades' as const, label: 'Journal', icon: BookOpen },
  { id: 'ai-analysis' as const, label: 'IA', icon: Sparkles },
  { id: 'edge' as const, label: 'Edge', icon: Crosshair },
  { id: 'calendar' as const, label: 'Calendrier', icon: CalendarDays },
];

export function MobileApp({ activeTab, onTabChange, data }: MobileAppProps) {
  void data;
  const page = activeTab === 'trades' ? <TradeJournalMobile /> : activeTab === 'ai-analysis' ? <AIAnalysisMobile /> : activeTab === 'edge' ? <MyEdgeAnalyzerMobile /> : activeTab === 'calendar' ? <CalendarMobile /> : <DashboardMobile />;
  return <div data-mobile-ui className="mobile-app-shell min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D12] text-[#0F172A] dark:text-[#F5F5F5]">
    <main className="mobile-app-content">{page}</main>
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {mobilePages.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onTabChange(id)} className={`mobile-nav-item ${activeTab === id ? 'is-active' : ''}`} aria-current={activeTab === id ? 'page' : undefined}><Icon className="h-5 w-5" /><span className="mobile-safe-text">{label}</span></button>)}
    </nav>
  </div>;
}
