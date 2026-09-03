import React, { useEffect, useState } from 'react';
import { useTrades } from './hooks/useTrades';
import { useSettings } from './hooks/useSettings';
import { useSetups } from './hooks/useSetups';
import { useRiskAlerts } from './hooks/useRiskAlerts';
import { useIsMobile } from './hooks/useIsMobile';
import { MobileApp } from './components/mobile/MobileApp';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TopBar } from './components/TopBar';
import { MonthlyTradingBreakdownCard } from './components/MonthlyTradingBreakdownCard';
import { DashboardStatisticsSummary } from './components/DashboardStatisticsSummary';
import { CalendarView } from './components/CalendarView';
import { CalculationVerificationPanel } from './components/CalculationVerificationPanel';
import { TradeTable } from './components/TradeTable';
import { EquityCurveChart } from './components/EquityCurveChart';
import { MyEdgeAnalyzerView } from './components/MyEdgeAnalyzerView';
import { AnalyticsView } from './components/AnalyticsView';
import { AIAnalysisView } from './components/AIAnalysisView';
import { SettingsView } from './components/SettingsView';
import { CreateTradeModal } from './components/CreateTradeModal';
import { TradeDetailModal } from './components/TradeDetailModal';
import { BackupModal } from './components/BackupModal';
import { SetupsManagementModal } from './components/SetupsManagementModal';
import { ImportModal } from './components/ImportModal';
import { Trade, NewTradeInput } from './types/trade';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardSkeleton } from './components/Skeleton';
import { ToastNotification } from './components/ToastNotification';
import './styles/mobile-architecture.css';

const viewMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.22, ease: 'easeOut' as const } };

export default function App() {
  const isMobile = useIsMobile();
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null; const clickable = target?.closest<HTMLElement>('button:not(:disabled), [role="button"], a[href]');
      if (!clickable || clickable.closest('[data-ripple-ignore="true"]')) return;
      clickable.classList.add('ripple-host'); const rect = clickable.getBoundingClientRect(); const ripple = document.createElement('span'); ripple.className = 'ripple-effect'; const size = Math.max(rect.width, rect.height); ripple.style.width = ripple.style.height = `${size}px`; ripple.style.left = `${event.clientX - rect.left - size / 2}px`; ripple.style.top = `${event.clientY - rect.top - size / 2}px`; clickable.appendChild(ripple); ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }; document.addEventListener('pointerdown', handlePointerDown); return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);
  const { trades = [], isLoading, error, addTrade, removeTrade, clearAllTrades, seedDatabase, selectedTrade, setSelectedTrade, loadTrades } = useTrades();
  const { settings, updateSettings } = useSettings(); const { setups = [] } = useSetups(); const { alerts, activeAlerts, unreadCount, dismissAll } = useRiskAlerts(trades || [], settings);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard'); const [calendarJumpMonth, setCalendarJumpMonth] = useState<{year:number;month:number}|null>(null); const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); const [isCreateOpen, setIsCreateOpen] = useState(false); const [isImportOpen, setIsImportOpen] = useState(false); const [isBackupOpen, setIsBackupOpen] = useState(false); const [isSetupsOpen, setIsSetupsOpen] = useState(false); const [notification, setNotification] = useState<{type:'success'|'error';message:string}|null>(null);
  const safeTrades = trades || []; const safeSetups = setups || []; const notify = (type:'success'|'error', message:string) => { setNotification({type,message}); setTimeout(() => setNotification(prev => prev?.message === message ? null : prev), 4000); };

  useEffect(() => {
    if (activeTab === 'dashboard') void loadTrades();
  }, [activeTab, loadTrades]);

  const handleImportComplete = async (importedCount:number, duplicatesSkipped:number) => { await loadTrades(); notify('success', `Importation réussie : ${importedCount} trade(s) enregistré(s), ${duplicatesSkipped} doublon(s) ignoré(s).`); };
  const handleSeed = async () => { try { const res = await seedDatabase(); notify('success', `Loaded ${res.inserted} institutional trades with verified SMC setups.`); } catch (err) { notify('error', err instanceof Error ? err.message : 'Failed to seed database'); } };
  const handleClear = async () => { if (window.confirm('Are you sure you want to delete all trades from IndexedDB?')) { try { await clearAllTrades(); notify('success', 'Database cleared successfully.'); } catch { notify('error', 'Failed to clear database'); } } };
  const handleCreateTrade = async (newTrade:NewTradeInput) => { try { const saved = await addTrade(newTrade); notify('success', `Trade ${saved.symbol} (#${saved.ticket || saved.id.slice(0,8)}) recorded successfully.`); } catch (err) { notify('error', err instanceof Error ? err.message : 'Failed to save trade'); throw err; } };
  const handleDeleteTrade = async (id:string) => { try { await removeTrade(id); notify('success', 'Trade deleted from IndexedDB.'); } catch { notify('error', 'Failed to delete trade'); } };
  const handleRestoreTrades = async (restoredTrades:Trade[]) => { for (const t of restoredTrades) { try { await addTrade(t); } catch { /* continue */ } } };

  if (isMobile) {
    return <MobileApp activeTab={activeTab} onTabChange={setActiveTab} data={{ trades: safeTrades, settings, setups: safeSetups }} onLogTrade={() => setIsCreateOpen(true)} />;
  }

  return <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D12] text-[#0F172A] dark:text-[#F5F5F5] font-sans flex flex-col md:flex-row relative">
    <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-indigo-500/5 dark:from-[#7C3AED]/5 via-transparent to-purple-500/5 dark:to-[#6D28D9]/5 -z-10 blur-3xl"/>
    <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onOpenCreate={()=>setIsCreateOpen(true)} onOpenImport={()=>setIsImportOpen(true)} onOpenSetupsModal={()=>setIsSetupsOpen(true)} onOpenBackup={()=>setIsBackupOpen(true)} onSeed={handleSeed} isLoading={isLoading} tradeCount={safeTrades.length} isMobileOpen={isMobileMenuOpen} onCloseMobile={()=>setIsMobileMenuOpen(false)}/>
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
      <TopBar unreadCount={unreadCount} activeNotificationCount={activeAlerts.length} onDismissAllNotifications={()=>{ if(window.confirm('Retirer toutes les notifications actives ? Elles resteront consultables dans l’historique des paramètres.')) void dismissAll(); }} activeTab={activeTab} onOpenMobileMenu={()=>setIsMobileMenuOpen(true)} onOpenCreate={()=>setIsCreateOpen(true)} onOpenImport={()=>setIsImportOpen(true)} onOpenSetupsModal={()=>setIsSetupsOpen(true)} onOpenBackup={()=>setIsBackupOpen(true)} onSeed={handleSeed} isLoading={isLoading} tradeCount={safeTrades.length}/>
      <ToastNotification notification={notification} onClose={()=>setNotification(null)}/>
      <main className="flex-1 w-[94%] max-w-[1800px] mx-auto px-3 sm:px-5 lg:px-7 py-6 pb-[calc(92px+env(safe-area-inset-bottom))] md:pb-6 space-y-6">
        {error && <div className="p-4 rounded-2xl bg-[#12151D] border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4"/><span>Erreur Base de Données : {error}</span></div>}
        <AnimatePresence mode="wait" initial={false}>
          {isLoading && safeTrades.length === 0 ? <motion.div key="skeleton-view" {...viewMotion}><DashboardSkeleton/></motion.div> : <>
            {activeTab === 'dashboard' && <motion.div key="dashboard" {...viewMotion} className="space-y-6">
              <CalculationVerificationPanel trades={safeTrades} settings={settings}/>
              {safeTrades.length>0&&<EquityCurveChart trades={safeTrades} initialBalance={settings.initialAccountBalance||10000} currency={settings.currency||'USD'}/>} 
              <MonthlyTradingBreakdownCard trades={safeTrades} currency={settings.currency||'USD'} onSelectTrade={setSelectedTrade} onNavigateToCalendar={(year,month)=>{setCalendarJumpMonth({year,month});setActiveTab('calendar')}}/>
              <DashboardStatisticsSummary trades={safeTrades} settings={settings}/>
              <TradeTable trades={safeTrades} onDelete={handleDeleteTrade} onSelect={setSelectedTrade} onSeed={handleSeed} onOpenCreate={()=>setIsCreateOpen(true)} onOpenImport={()=>setIsImportOpen(true)}/>
            </motion.div>}
            {activeTab === 'calendar' && <motion.div key="calendar" {...viewMotion}><CalendarView trades={safeTrades} currency={settings.currency||'USD'} onSelectTrade={setSelectedTrade} onSeed={handleSeed} initialYear={calendarJumpMonth?.year} initialMonth={calendarJumpMonth?.month}/></motion.div>}
            {activeTab === 'trades' && <motion.div key="trades" {...viewMotion}><TradeTable trades={safeTrades} onDelete={handleDeleteTrade} onSelect={setSelectedTrade} onSeed={handleSeed} onOpenCreate={()=>setIsCreateOpen(true)} onOpenImport={()=>setIsImportOpen(true)}/></motion.div>}
            {activeTab === 'edge' && <motion.div key="edge" {...viewMotion}><MyEdgeAnalyzerView trades={safeTrades} setups={safeSetups} currency={settings.currency||'EUR'} onOpenSetupsModal={()=>setIsSetupsOpen(true)} onSelectTrade={setSelectedTrade}/></motion.div>}
            {activeTab === 'analytics' && <motion.div key="analytics" {...viewMotion}><AnalyticsView trades={safeTrades} currency={settings.currency||'EUR'} initialBalance={settings.initialAccountBalance||10000} onSelectTrade={setSelectedTrade}/></motion.div>}
            {activeTab === 'ai-analysis' && <motion.div key="ai-analysis" {...viewMotion}><AIAnalysisView trades={safeTrades} setups={safeSetups} settings={settings} currency={settings.currency||'USD'} onNotify={notify}/></motion.div>}
            {activeTab === 'settings' && <motion.div key="settings" {...viewMotion}><SettingsView settings={settings} alerts={alerts} onUpdateSettings={updateSettings} onOpenBackup={()=>setIsBackupOpen(true)} onOpenSetups={()=>setIsSetupsOpen(true)} onOpenImport={()=>setIsImportOpen(true)} onSeed={handleSeed} onClear={handleClear} tradeCount={safeTrades.length}/></motion.div>}
          </>}
        </AnimatePresence>
      </main>
    </div>
    <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} onOpenCreate={()=>setIsCreateOpen(true)} onOpenImport={()=>setIsImportOpen(true)} onOpenSetupsModal={()=>setIsSetupsOpen(true)} onOpenBackup={()=>setIsBackupOpen(true)} onCloseMobile={()=>setIsMobileMenuOpen(false)}/>
    <CreateTradeModal isOpen={isCreateOpen} onClose={()=>setIsCreateOpen(false)} onSubmit={handleCreateTrade}/><TradeDetailModal trade={selectedTrade} currency={settings.currency||'USD'} onClose={()=>setSelectedTrade(null)}/><SetupsManagementModal isOpen={isSetupsOpen} onClose={()=>setIsSetupsOpen(false)}/><BackupModal isOpen={isBackupOpen} onClose={()=>setIsBackupOpen(false)} trades={safeTrades} settings={settings} onRestoreTrades={handleRestoreTrades}/><ImportModal isOpen={isImportOpen} onClose={()=>setIsImportOpen(false)} onImportComplete={handleImportComplete} existingTrades={safeTrades}/>
  </div>;
}
