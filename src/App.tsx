import React, { useState } from 'react';
import { useTrades } from './hooks/useTrades';
import { useSettings } from './hooks/useSettings';
import { useSetups } from './hooks/useSetups';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MonthlyTradingBreakdownCard } from './components/MonthlyTradingBreakdownCard';
import { CalendarView } from './components/CalendarView';
import { CalculationVerificationPanel } from './components/CalculationVerificationPanel';
import { TradeTable } from './components/TradeTable';
import { EquityCurveChart } from './components/EquityCurveChart';
import { MyEdgeView } from './components/MyEdgeView';
import { AnalyticsView } from './components/AnalyticsView';
import { CoachView } from './components/CoachView';
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

export default function App() {
  const {
    trades = [],
    isLoading,
    error,
    addTrade,
    removeTrade,
    clearAllTrades,
    seedDatabase,
    selectedTrade,
    setSelectedTrade,
    loadTrades,
  } = useTrades();

  const { settings, updateSettings } = useSettings();
  const { setups = [] } = useSetups();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [calendarJumpMonth, setCalendarJumpMonth] = useState<{ year: number; month: number } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isSetupsOpen, setIsSetupsOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const safeTrades = trades || [];
  const safeSetups = setups || [];

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleImportComplete = async (importedCount: number, duplicatesSkipped: number) => {
    await loadTrades();
    notify(
      'success',
      `Importation réussie : ${importedCount} trade(s) enregistré(s), ${duplicatesSkipped} doublon(s) ignoré(s).`
    );
  };

  const handleSeed = async () => {
    try {
      const res = await seedDatabase();
      notify(
        'success',
        `Loaded ${res.inserted} institutional trades with verified SMC setups.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to seed database');
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all trades from IndexedDB?')) {
      try {
        await clearAllTrades();
        notify('success', 'Database cleared successfully.');
      } catch (err) {
        notify('error', 'Failed to clear database');
      }
    }
  };

  const handleCreateTrade = async (newTrade: NewTradeInput) => {
    try {
      const saved = await addTrade(newTrade);
      notify('success', `Trade ${saved.symbol} (#${saved.ticket || saved.id.slice(0, 8)}) recorded successfully.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save trade');
      throw err;
    }
  };

  const handleDeleteTrade = async (id: string) => {
    try {
      await removeTrade(id);
      notify('success', 'Trade deleted from IndexedDB.');
    } catch (err) {
      notify('error', 'Failed to delete trade');
    }
  };

  const handleRestoreTrades = async (restoredTrades: Trade[]) => {
    for (const t of restoredTrades) {
      try {
        await addTrade(t);
      } catch {
        // Continue rest
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D12] text-[#0F172A] dark:text-[#F5F5F5] font-sans selection:bg-[#F97316]/25 selection:text-[#FDBA74] transition-colors duration-200 flex flex-col md:flex-row relative">
      {/* Background Soft Glow Decoration */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-indigo-500/5 dark:from-[#F97316]/5 via-transparent to-purple-500/5 dark:to-[#EA580C]/5 -z-10 blur-3xl" />

      {/* Left Sidebar Navigation (Desktop Fixed + Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSetupsModal={() => setIsSetupsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onSeed={handleSeed}
        isLoading={isLoading}
        tradeCount={safeTrades.length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar Header */}
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenCreate={() => setIsCreateOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenSetupsModal={() => setIsSetupsOpen(true)}
          onOpenBackup={() => setIsBackupOpen(true)}
          onSeed={handleSeed}
          isLoading={isLoading}
          tradeCount={safeTrades.length}
        />

        {/* Toast Notification Container */}
        <ToastNotification notification={notification} onClose={() => setNotification(null)} />

        {/* Dynamic Main Views Area with Smooth Fade & Slide Animations */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Global Database Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-[#12151D] border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Erreur Base de Données : {error}</span>
            </div>
          )}

          {/* Animated Tab Content Transitions */}
          <AnimatePresence mode="wait">
            {/* Loading Skeleton */}
            {isLoading && safeTrades.length === 0 ? (
              <motion.div
                key="skeleton-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardSkeleton />
              </motion.div>
            ) : (
              <>
                {/* TAB 1: DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="tab-dashboard"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Equity Curve Chart */}
                    {safeTrades.length > 0 && (
                      <EquityCurveChart
                        trades={safeTrades}
                        initialBalance={settings.initialAccountBalance || 10000}
                        currency={settings.currency || 'USD'}
                      />
                    )}

                    {/* Monthly Trading Breakdown */}
                    <MonthlyTradingBreakdownCard
                      trades={safeTrades}
                      currency={settings.currency || 'USD'}
                      onSelectTrade={setSelectedTrade}
                      onNavigateToCalendar={(year, month) => {
                        setCalendarJumpMonth({ year, month });
                        setActiveTab('calendar');
                      }}
                    />

                    {/* Mathematical Engine Integrity Verification */}
                    {safeTrades.length > 0 && <CalculationVerificationPanel trades={safeTrades} />}

                    {/* Recent Trade Activity Table */}
                    <TradeTable
                      trades={safeTrades}
                      onDelete={handleDeleteTrade}
                      onSelect={setSelectedTrade}
                      onSeed={handleSeed}
                      onOpenCreate={() => setIsCreateOpen(true)}
                      onOpenImport={() => setIsImportOpen(true)}
                    />
                  </motion.div>
                )}

            {/* TAB 2: CALENDAR */}
            {activeTab === 'calendar' && (
              <motion.div
                key="tab-calendar"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                <CalendarView
                  trades={safeTrades}
                  currency={settings.currency || 'USD'}
                  onSelectTrade={setSelectedTrade}
                  onSeed={handleSeed}
                  initialYear={calendarJumpMonth?.year}
                  initialMonth={calendarJumpMonth?.month}
                />
              </motion.div>
            )}

            {/* TAB 3: TRADE JOURNAL */}
            {activeTab === 'trades' && (
              <motion.div
                key="tab-journal"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                <TradeTable
                  trades={safeTrades}
                  onDelete={handleDeleteTrade}
                  onSelect={setSelectedTrade}
                  onSeed={handleSeed}
                  onOpenCreate={() => setIsCreateOpen(true)}
                  onOpenImport={() => setIsImportOpen(true)}
                />
              </motion.div>
            )}

            {/* TAB 3: MY EDGE ANALYZER */}
            {activeTab === 'edge' && (
              <motion.div
                key="tab-edge"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <MyEdgeView
                  trades={safeTrades}
                  setups={safeSetups}
                  onOpenSetupsModal={() => setIsSetupsOpen(true)}
                  onSelectTrade={setSelectedTrade}
                />
              </motion.div>
            )}

            {/* TAB 4: INSTITUTIONAL ANALYTICS */}
            {activeTab === 'analytics' && (
              <motion.div
                key="tab-analytics"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <AnalyticsView
                  trades={safeTrades}
                  currency={settings.currency || 'EUR'}
                  initialBalance={settings.initialAccountBalance || 10000}
                  onSelectTrade={setSelectedTrade}
                />
              </motion.div>
            )}

            {/* TAB 5: AI COACH & PSYCHOLOGY */}
            {activeTab === 'coach' && (
              <motion.div
                key="tab-coach"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <CoachView
                  trades={safeTrades}
                  setups={safeSetups}
                  currency={settings.currency || 'USD'}
                  initialBalance={settings.initialAccountBalance || 10000}
                />
              </motion.div>
            )}

            {/* TAB 6: SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                key="tab-settings"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <SettingsView
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onOpenBackup={() => setIsBackupOpen(true)}
                  onSeed={handleSeed}
                  onClear={handleClear}
                  tradeCount={safeTrades.length}
                />
              </motion.div>
            )}
            </>
          )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Overlays */}
      <CreateTradeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTrade}
      />

      <TradeDetailModal
        trade={selectedTrade}
        currency={settings.currency || 'USD'}
        onClose={() => setSelectedTrade(null)}
      />

      <SetupsManagementModal
        isOpen={isSetupsOpen}
        onClose={() => setIsSetupsOpen(false)}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        trades={safeTrades}
        settings={settings}
        onRestoreTrades={handleRestoreTrades}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
        existingTrades={safeTrades}
      />
    </div>
  );
}

