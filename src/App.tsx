import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { TradesView } from './components/TradesView';
import { StatisticsView } from './components/StatisticsView';
import { EdgeView } from './components/EdgeView';
import { EdgeExpectancyPanel } from './components/EdgeExpectancyPanel';
import { TransactionsView } from './components/TransactionsView';
import { ImportView } from './components/ImportView';
import { JournalView } from './components/JournalView';
import { SettingsView } from './components/SettingsView';
import { TradeDetailModal } from './components/TradeDetailModal';
import { TradeAiReviewModal } from './components/TradeAiReviewModal';
import { AddTradeModal } from './components/AddTradeModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { AiCoachView } from './components/AiCoachView';
import { PwaBanner } from './components/PwaBanner';
import { Trade, AccountTransaction, UserAppSettings, ImportBatchRecord } from './types';
import { loadTradesFromStorage, saveTradesToStorage, loadTransactionsFromStorage, saveTransactionsToStorage, loadSettingsFromStorage, saveSettingsToStorage, loadImportBatches, saveImportBatchRecord, removeBatchRecord, exportBackupJSON } from './storage';
import { calculateReliablePerformanceStats } from './calculations/strictStats';
import { SAMPLE_TRADES } from './data/sampleTrades';
import { normalizeUserSetupName } from './components/EdgeView';
import { getStandardSession } from './utils/tradingSession';
import { getThemeConfig } from './utils/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => { try { return localStorage.getItem('trading_edge_active_tab_v1') || 'dashboard'; } catch { return 'dashboard'; } });
  useEffect(() => { try { localStorage.setItem('trading_edge_active_tab_v1', activeTab); } catch {} }, [activeTab]);
  const [settings, setSettings] = useState<UserAppSettings>(() => loadSettingsFromStorage());
  const [trades, setTrades] = useState<Trade[]>(() => { const loaded=loadTradesFromStorage(); const sourceTrades=loaded&&loaded.length>0?loaded:SAMPLE_TRADES; const normalized=sourceTrades.map(t=>({...t,setup:normalizeUserSetupName(t.setup||(t.tags&&t.tags[0]?t.tags[0]:'FVG')),killzone:getStandardSession(t)||t.killzone||'London'})); saveTradesToStorage(normalized); return normalized; });
  const [transactions, setTransactions] = useState<AccountTransaction[]>(() => { const loaded=loadTransactionsFromStorage(); if(loaded&&loaded.length>0)return loaded; const initialDep:AccountTransaction[]=[{id:'tx-init-capital',date:'2026-08-01',time:'08:00',type:'DEPOSIT',amount:10000,description:'Dépôt Initial Capital',source:'Initial Account Setup',createdAt:new Date().toISOString()}]; saveTransactionsToStorage(initialDep); return initialDep; });
  const [importBatches, setImportBatches] = useState<ImportBatchRecord[]>(() => loadImportBatches());
  const [selectedTrade, setSelectedTrade] = useState<Trade|null>(null);
  const [selectedTradeForAiReview, setSelectedTradeForAiReview] = useState<Trade|null>(null);
  const [isAddModalOpen,setIsAddModalOpen]=useState(false); const [isAiModalOpen,setIsAiModalOpen]=useState(false);
  useEffect(()=>{saveTradesToStorage(trades)},[trades]); useEffect(()=>{saveTransactionsToStorage(transactions)},[transactions]);
  useEffect(()=>{saveSettingsToStorage(settings);if(settings.theme==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark')},[settings]);
  // Primary statistics now use the strict layer: no invented R or arbitrary risk assumptions.
  const stats=useMemo(()=>calculateReliablePerformanceStats(trades,settings.startingBalance),[trades,settings.startingBalance]);
  const handleAddTrade=(t:Trade)=>setTrades([t,...trades]); const handleDeleteTrade=(id:string)=>setTrades(trades.filter(t=>t.id!==id)); const handleUpdateTrade=(u:Trade)=>setTrades(trades.map(t=>t.id===u.id?u:t));
  const handleAddTransaction=(newTx:Omit<AccountTransaction,'id'|'createdAt'>)=>{const fullTx={...newTx,id:`tx-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,createdAt:new Date().toISOString()};setTransactions(prev=>[fullTx,...prev])};
  const handleDeleteTransaction=(id:string)=>setTransactions(prev=>prev.filter(t=>t.id!==id));
  const handleConfirmImport=(newTrades:Trade[],newTransactions:AccountTransaction[],batchRecord:ImportBatchRecord)=>{if(newTrades.length)setTrades(prev=>[...newTrades,...prev]);if(newTransactions.length)setTransactions(prev=>[...newTransactions,...prev]);saveImportBatchRecord(batchRecord);setImportBatches(loadImportBatches());setActiveTab('dashboard')};
  const handleUndoBatch=(id:string)=>{setTrades(prev=>prev.filter(t=>t.importBatchId!==id));setTransactions(prev=>prev.filter(t=>t.importBatchId!==id));removeBatchRecord(id);setImportBatches(loadImportBatches())};
  const handleRestoreBackup=(rt:Trade[],rs:UserAppSettings,rx?:AccountTransaction[])=>{setTrades(rt);setSettings(rs);if(rx&&Array.isArray(rx))setTransactions(rx)};
  const handleRestoreSampleData=()=>{const normalized=SAMPLE_TRADES.map(t=>({...t,setup:normalizeUserSetupName(t.setup||(t.tags&&t.tags[0]?t.tags[0]:'FVG')),killzone:getStandardSession(t)||t.killzone||'London'}));setTrades(normalized);const tx:AccountTransaction[]=[{id:'tx-init-capital',date:'2026-08-01',time:'08:00',type:'DEPOSIT',amount:10000,description:'Dépôt Initial Capital',source:'Initial Account Setup',createdAt:new Date().toISOString()}];setTransactions(tx);saveTradesToStorage(normalized);saveTransactionsToStorage(tx)};
  const handleClearAllData=()=>{setTrades([]);setTransactions([]);localStorage.removeItem('trading_edge_trades_v1');localStorage.removeItem('trading_edge_transactions_v1');localStorage.removeItem('trading_edge_import_batches_v1');setImportBatches([])};
  const toggleTheme=()=>setSettings({...settings,theme:settings.theme==='dark'?'light':'dark'}); const isLight=settings.theme==='light'; getThemeConfig(settings);
  return <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 relative overflow-hidden ${isLight?'bg-[#f8f6fe] text-slate-900 selection:bg-violet-600 selection:text-white':'bg-[#0B0F14] text-[#E8EDF2] selection:bg-[#f75605] selection:text-white'} ${settings.reduceMotion?'motion-reduce':''}`}>
    <div className={`fixed top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none -z-0 ${isLight?'bg-purple-400/15 blur-3xl':'bg-[#f75605]/5 blur-3xl'}`}/><div className={`fixed bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none -z-0 ${isLight?'bg-indigo-400/10 blur-3xl':'bg-slate-800/10 blur-3xl'}`}/>
    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenAddModal={()=>setIsAddModalOpen(true)} onOpenAiModal={()=>setIsAiModalOpen(true)} settings={settings} onToggleTheme={toggleTheme} onQuickExport={()=>exportBackupJSON(trades,settings,transactions)} tradeCount={trades.length} transactionCount={transactions.length}/>
    <main className="flex-1 min-w-0 overflow-y-auto pb-24 md:pb-12 relative z-10"><motion.div key={activeTab} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.5,ease:[.16,.3,1,.3]}}>
      {activeTab==='dashboard'&&<DashboardView trades={trades} transactions={transactions} stats={stats} settings={settings} onNavigate={setActiveTab} onOpenAddModal={()=>setIsAddModalOpen(true)} onOpenAiModal={()=>setIsAiModalOpen(true)} onUpdateSettings={setSettings}/>} 
      {activeTab==='coach'&&<AiCoachView trades={trades} stats={stats} settings={settings} onUpdateSettings={setSettings} onSelectTrade={setSelectedTrade}/>} 
      {activeTab==='calendar'&&<CalendarView trades={trades} settings={settings} onSelectTrade={setSelectedTrade}/>} 
      {activeTab==='trades'&&<TradesView trades={trades} settings={settings} onSelectTrade={setSelectedTrade} onDeleteTrade={handleDeleteTrade} onOpenAddModal={()=>setIsAddModalOpen(true)} onOpenAiReview={t=>setSelectedTradeForAiReview(t)} onRestoreSampleData={handleRestoreSampleData}/>} 
      {activeTab==='transactions'&&<TransactionsView transactions={transactions} settings={settings} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction}/>} 
      {activeTab==='statistics'&&<StatisticsView stats={stats} trades={trades} settings={settings}/>} 
      {activeTab==='edge'&&<><EdgeExpectancyPanel trades={trades} settings={settings}/><EdgeView trades={trades} settings={settings}/></>} 
      {activeTab==='import'&&<ImportView existingTrades={trades} existingTransactions={transactions} importBatches={importBatches} onConfirmImport={handleConfirmImport} onUndoBatch={handleUndoBatch} settings={settings}/>} 
      {activeTab==='journal'&&<JournalView trades={trades} settings={settings} onUpdateTrade={handleUpdateTrade}/>} 
      {activeTab==='settings'&&<SettingsView settings={settings} onUpdateSettings={setSettings} trades={trades} transactions={transactions} onRestoreBackup={handleRestoreBackup} onRestoreSampleData={handleRestoreSampleData} onClearAllData={handleClearAllData}/>} 
    </motion.div></main>
    <TradeDetailModal trade={selectedTrade} onClose={()=>setSelectedTrade(null)} settings={settings} onDeleteTrade={handleDeleteTrade} onOpenAiReview={t=>{setSelectedTrade(null);setSelectedTradeForAiReview(t)}}/>
    <TradeAiReviewModal trade={selectedTradeForAiReview} allTrades={trades} settings={settings} onClose={()=>setSelectedTradeForAiReview(null)} onAskCoachAboutTrade={()=>{setSelectedTradeForAiReview(null);setActiveTab('coach')}}/>
    <AddTradeModal isOpen={isAddModalOpen} onClose={()=>setIsAddModalOpen(false)} onSaveTrade={handleAddTrade} settings={settings}/><AiAnalysisModal isOpen={isAiModalOpen} onClose={()=>setIsAiModalOpen(false)} trades={trades} stats={stats} settings={settings}/><PwaBanner isLight={isLight}/>
  </div>;
}
