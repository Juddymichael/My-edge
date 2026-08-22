import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, BookOpen, Calendar, FileUp, LayoutDashboard, ListFilter, MoreHorizontal, Settings, Wallet, X, Zap, Sparkles } from 'lucide-react';
import { UserAppSettings } from '../types';

interface MobileNavigationProps { activeTab: string; setActiveTab: (tab: string) => void; settings: UserAppSettings; tradeCount: number; transactionCount: number; }

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, setActiveTab, settings, tradeCount, transactionCount }) => {
  const [open, setOpen] = useState(false);
  const light = settings.theme === 'light';
  const go = (tab: string) => { setActiveTab(tab); setOpen(false); };
  const moreItems = [
    { id: 'statistics', label: 'Statistiques', desc: 'Performance, win rate, expectancy', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', desc: 'Dépôts, retraits & flux', icon: Wallet },
    { id: 'edge', label: 'Mon Edge', desc: 'Edge, setups & espérance', icon: Zap },
    { id: 'import', label: 'Import', desc: 'CSV, XLSX, PDF & JSON', icon: FileUp },
    { id: 'journal', label: 'Journal', desc: 'Notes & suivi des trades', icon: BookOpen },
    { id: 'settings', label: 'Paramètres', desc: 'Capital, thème & sauvegardes', icon: Settings },
  ];
  const moreActive = moreItems.some(x => x.id === activeTab);
  return <>
    <AnimatePresence>{open && <div className="fixed inset-0 z-[60] md:hidden flex items-end">
      <motion.button aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: .18 }} className={`relative w-full rounded-t-3xl border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl ${light ? 'bg-white border-purple-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'}`}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-slate-400/30" />
        <div className="flex items-center justify-between mb-3"><div><h3 className="font-black text-base">Modules & outils</h3><p className="text-xs opacity-60">Toutes les fonctions de la version web</p></div><button onClick={() => setOpen(false)} className="p-2 rounded-xl border border-current/10"><X className="w-4 h-4" /></button></div>
        <div className="grid grid-cols-2 gap-2">{moreItems.map(({ id, label, desc, icon: Icon }) => <button key={id} onClick={() => go(id)} className={`text-left p-3 rounded-2xl border transition-all ${activeTab === id ? (light ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#f75605] text-white border-[#f75605]') : (light ? 'bg-purple-50 border-purple-200 text-slate-800' : 'bg-[#171E27] border-[#252E38] text-[#E8EDF2]')}`}><Icon className="w-4 h-4 mb-2" /><span className="block text-xs font-black">{label}</span><span className="block text-[10px] opacity-60 mt-0.5 leading-tight">{desc}</span></button>)}</div>
      </motion.div>
    </div>}</AnimatePresence>
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-[55] border-t px-1 pt-1 pb-[calc(.25rem+env(safe-area-inset-bottom))] ${light ? 'bg-white/95 border-purple-200 text-slate-600' : 'bg-[#0B0F14]/95 border-[#252E38] text-[#8B96A3]'} backdrop-blur-xl`}>
      <div className="grid grid-cols-5 items-center">
        <button onClick={() => go('dashboard')} className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl ${activeTab === 'dashboard' ? (light ? 'text-violet-600' : 'text-[#f75605]') : ''}`}><div className={`w-7 h-0.5 rounded-full mb-0.5 ${activeTab === 'dashboard' ? (light ? 'bg-violet-600' : 'bg-[#f75605]') : 'bg-transparent'}`} /><LayoutDashboard className="w-5 h-5" /><span className="text-[10px] font-bold">Accueil</span></button>
        <button onClick={() => go('calendar')} className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl ${activeTab === 'calendar' ? (light ? 'text-violet-600' : 'text-[#f75605]') : ''}`}><div className={`w-7 h-0.5 rounded-full mb-0.5 ${activeTab === 'calendar' ? (light ? 'bg-violet-600' : 'bg-[#f75605]') : 'bg-transparent'}`} /><Calendar className="w-5 h-5" /><span className="text-[10px] font-bold">Calendrier</span></button>
        <button onClick={() => go('trades')} className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl ${activeTab === 'trades' ? (light ? 'text-violet-600' : 'text-[#f75605]') : ''}`}><div className={`w-7 h-0.5 rounded-full mb-0.5 ${activeTab === 'trades' ? (light ? 'bg-violet-600' : 'bg-[#f75605]') : 'bg-transparent'}`} /><ListFilter className="w-5 h-5" /><span className="text-[10px] font-bold">Trades</span>{tradeCount > 0 && <span className={`absolute top-1 right-5 w-1.5 h-1.5 rounded-full ${light ? 'bg-violet-600' : 'bg-[#f75605]'}`} />}</button>
        <button onClick={() => go('coach')} className="relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[#f75605]"><div className={`w-7 h-0.5 rounded-full mb-0.5 ${activeTab === 'coach' ? 'bg-[#f75605]' : 'bg-transparent'}`} /><Sparkles className="w-5 h-5" /><span className="text-[10px] font-bold">IA Coach</span></button>
        <button onClick={() => setOpen(v => !v)} className={`relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl ${moreActive || open ? (light ? 'text-violet-600' : 'text-[#f75605]') : ''}`}><div className={`w-7 h-0.5 rounded-full mb-0.5 ${moreActive || open ? (light ? 'bg-violet-600' : 'bg-[#f75605]') : 'bg-transparent'}`} /><MoreHorizontal className="w-5 h-5" /><span className="text-[10px] font-bold">Plus</span>{transactionCount > 0 && <span className="absolute top-1 right-5 w-1.5 h-1.5 rounded-full bg-emerald-500" />}</button>
      </div>
    </nav>
  </>;
};
