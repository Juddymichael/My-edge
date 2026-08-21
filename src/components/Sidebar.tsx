import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  ListFilter, 
  BarChart3, 
  Zap, 
  FileUp, 
  BookOpen, 
  Settings, 
  Plus, 
  TrendingUp, 
  Moon, 
  Sun,
  Download,
  Sparkles,
  MoreHorizontal,
  X,
  ChevronRight,
  Wallet,
  Bot,
  BrainCircuit,
  Cpu
} from 'lucide-react';
import { UserAppSettings } from '../types';
import { getThemeClasses } from '../utils/theme';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  onOpenAiModal?: () => void;
  settings: UserAppSettings;
  onToggleTheme: () => void;
  onQuickExport: () => void;
  tradeCount: number;
  transactionCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenAiModal,
  settings,
  onToggleTheme,
  onQuickExport,
  tradeCount,
  transactionCount = 0,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'coach', 
      label: 'AI Trading Coach', 
      icon: Sparkles, 
      isAi: true, 
      tag: 'PREMIUM',
      desc: 'Score, Edge, Leaks & Monthly Coach' 
    },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'trades', label: 'Trades', icon: ListFilter, badge: tradeCount },
    { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Wallet, badge: transactionCount },
    { id: 'edge', label: 'Mon Edge', icon: Zap },
    { id: 'import', label: 'Import', icon: FileUp },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const secondaryNavItems = [
    { id: 'coach', label: 'AI Trading Coach', icon: Sparkles, isAi: true, desc: 'Score, Edge, Leaks & Monthly Coach' },
    { id: 'transactions', label: 'Transactions de Compte', icon: Wallet, desc: 'Dépôts, retraits & flux de trésorerie' },
    { id: 'edge', label: 'Mon Edge', icon: Zap, desc: 'Avantage statistique, Kill Zones & Setups' },
    { id: 'import', label: 'Import', icon: FileUp, desc: 'Importer CSV, MT4/MT5, PDF (Trades + Dépôts/Retraits)' },
    { id: 'journal', label: 'Journal', icon: BookOpen, desc: 'Carnet de bord & notes psychologiques' },
    { id: 'settings', label: 'Paramètres', icon: Settings, desc: 'Devise, thème, capital, sauvegardes' },
  ];

  const isMoreActive = ['transactions', 'edge', 'import', 'journal', 'settings'].includes(activeTab);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMoreSheetOpen(false);
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full font-sans select-none relative">
      {/* Brand Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              isLight 
                ? 'bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white shadow-purple-500/25'
                : 'bg-[#f75605] text-white shadow-[#f75605]/20'
            }`}>
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className={`font-black text-base tracking-tight leading-none ${
                isLight ? 'text-purple-950' : 'text-[#E8EDF2]'
              }`}>
                Trade<span className={isLight ? 'text-violet-600' : 'text-[#f75605]'}>Studio</span>
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                isLight ? 'text-purple-700' : 'text-[#8B96A3]'
              }`}>
                Trading Pro
              </p>
            </div>
          </div>
        </div>

        {/* Primary CTA Action Button */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onOpenAddModal()}
          className={`mt-4 w-full py-2.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
            theme.btnPrimary
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouveau Trade</span>
        </motion.button>
      </div>

      {/* Navigation Links with animated layout pill */}
      <nav className="flex-1 px-3 py-1 space-y-1.5 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isAiItem = (item as any).isAi;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                isActive
                  ? 'text-white font-black'
                  : isAiItem
                    ? isLight
                      ? 'bg-orange-50/80 text-[#f75605] border border-orange-200 hover:bg-orange-100/80 shadow-xs'
                      : 'bg-[#22160F] text-[#f75605] border border-[#f75605]/40 hover:bg-[#2F1E14] shadow-xs'
                    : isLight
                      ? 'text-slate-700 hover:text-purple-900 hover:bg-purple-50/70'
                      : 'text-[#8B96A3] hover:text-[#E8EDF2] hover:bg-[#171E27]'
              }`}
            >
              {/* Active Tab Pill Animated using layoutId */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className={`absolute inset-0 rounded-xl -z-10 ${
                    isAiItem
                      ? 'bg-gradient-to-r from-[#f75605] via-[#ff6a1a] to-[#ff843a] shadow-lg shadow-[#f75605]/30'
                      : isLight 
                        ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 shadow-md shadow-purple-500/25'
                        : 'bg-[#f75605] shadow-md shadow-[#f75605]/25'
                  }`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isAiItem
                      ? isLight ? 'bg-orange-100 text-[#f75605]' : 'bg-[#f75605]/20 text-[#f75605]'
                      : ''
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${
                    isActive 
                      ? 'text-white stroke-[2.5]'
                      : isAiItem
                        ? 'text-[#f75605] stroke-[2.5]'
                        : isLight ? 'text-purple-600' : 'text-[#8B96A3]'
                  }`} />
                </div>
                <span className={isAiItem && !isActive ? 'font-extrabold text-[#f75605]' : ''}>
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 relative z-10">
                {(item as any).tag && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1 ${
                    isActive
                      ? 'bg-white text-[#f75605] shadow-xs'
                      : isLight
                        ? 'bg-[#f75605] text-white shadow-xs'
                        : 'bg-[#f75605] text-white shadow-xs'
                  }`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    {(item as any).tag}
                  </span>
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                    isActive 
                      ? 'bg-white/20 text-white backdrop-blur-xs'
                      : isLight ? 'bg-purple-100 text-purple-800' : 'bg-[#171E27] text-[#f75605] border border-[#252E38]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer / User Settings Quick Bar */}
      <div className={`p-4 border-t space-y-2 relative z-10 ${
        isLight ? 'bg-purple-50/50 border-purple-200/80' : 'bg-[#121820] border-[#252E38]'
      }`}>
        <div className={`flex items-center justify-between px-1 text-xs ${isLight ? 'text-slate-600' : 'text-[#8B96A3]'}`}>
          <span className="text-[11px]">Capital: <strong className={`font-mono font-black ${isLight ? 'text-purple-950' : 'text-[#E8EDF2]'}`}>{settings.currencySymbol}{settings.startingBalance.toLocaleString()}</strong></span>
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
              isLight ? 'border-purple-200 hover:bg-purple-100 text-purple-700' : 'border-[#252E38] hover:bg-[#171E27] text-[#f75605]'
            }`}
            title="Changer de thème"
          >
            {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onQuickExport()}
          className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'bg-white text-purple-900 border-purple-200/90 hover:bg-purple-50 shadow-sm'
              : 'bg-[#171E27] text-[#8B96A3] hover:text-[#E8EDF2] border-[#252E38] hover:bg-[#1C2430]'
          }`}
        >
          <Download className={`w-3.5 h-3.5 ${isLight ? 'text-purple-600' : 'text-[#f75605]'}`} />
          <span>Sauvegarder JSON</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE TOP HEADER BAR */}
      <div className={`md:hidden sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-between border-b backdrop-blur-md transition-colors ${
        isLight ? 'bg-white/95 border-purple-200/80 text-slate-900' : 'bg-[#0B0F14]/95 border-[#252E38] text-[#E8EDF2]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${
            isLight 
              ? 'bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white'
              : 'bg-[#f75605] text-white'
          }`}>
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className={`font-black text-sm tracking-tight block leading-none ${isLight ? 'text-purple-950' : 'text-[#E8EDF2]'}`}>
              Trade<span className={isLight ? 'text-violet-600' : 'text-[#f75605]'}>Studio</span>
            </span>
            <span className={`text-[10px] font-bold ${isLight ? 'text-purple-700' : 'text-[#8B96A3]'}`}>
              {mainNavItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAiModal && (
            <button
              onClick={onOpenAiModal}
              className={`p-2 rounded-xl text-xs font-bold shadow-xs ${
                isLight 
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white'
                  : 'bg-[#171E27] text-[#f75605] border border-[#252E38]'
              }`}
              title="Assistant IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isLight ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-[#252E38] text-[#f75605] bg-[#121820]'
            }`}
          >
            {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onOpenAddModal}
            className={`py-1.5 px-3 rounded-xl font-black text-xs flex items-center gap-1 shadow-md ${
              isLight
                ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 text-white'
                : 'bg-[#f75605] text-white'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Trade</span>
          </motion.button>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET FOR "MORE" */}
      <AnimatePresence>
        {isMoreSheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs" 
              onClick={() => setIsMoreSheetOpen(false)}
            />

            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={`relative w-full rounded-t-3xl shadow-2xl z-10 p-5 space-y-4 max-h-[85vh] overflow-y-auto border-t ${
                isLight ? 'bg-white border-purple-200/90 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
              }`}
            >
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-2 ${isLight ? 'bg-purple-300/40' : 'bg-[#252E38]'}`} />

              <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-purple-200/60' : 'border-[#252E38]'}`}>
                <div>
                  <h3 className="text-base font-black">Modules & Outils</h3>
                  <p className={`text-xs ${isLight ? 'text-purple-600' : 'text-[#8B96A3]'}`}>Accédez à l'ensemble des fonctionnalités</p>
                </div>
                <button
                  onClick={() => setIsMoreSheetOpen(false)}
                  className={`p-2 rounded-xl border ${
                    isLight ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-[#252E38] text-[#8B96A3] bg-[#171E27]'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleNavClick(item.id)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? isLight
                            ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 text-white shadow-md'
                            : 'bg-[#f75605] text-white font-black shadow-md'
                          : isLight
                            ? 'bg-purple-50/50 border-purple-200/80 text-slate-800 hover:bg-purple-100/60'
                            : 'bg-[#171E27] border-[#252E38] text-[#E8EDF2] hover:bg-[#1C2430]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : isLight ? 'bg-purple-100 text-purple-700' : 'bg-[#121820] text-[#f75605]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-sm block leading-tight">{item.label}</span>
                          <span className={`text-xs block mt-0.5 ${isActive ? (isLight ? 'text-purple-100' : 'text-white') : (isLight ? 'text-purple-600' : 'text-[#8B96A3]')}`}>{item.desc}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR with animated indicator */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 border-t backdrop-blur-xl transition-colors shadow-2xl flex items-center justify-around font-sans ${
        isLight ? 'bg-white/95 border-purple-200/80 text-slate-700' : 'bg-[#0B0F14]/95 border-[#252E38] text-[#8B96A3]'
      }`}>
        {/* 1. Dashboard */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'dashboard'
              ? isLight ? 'text-violet-600 font-black' : 'text-[#f75605] font-black'
              : isLight ? 'text-slate-500' : 'text-[#8B96A3]'
          }`}
        >
          {activeTab === 'dashboard' && (
            <motion.div
              layoutId="mobileActiveIndicator"
              className={`absolute top-0 w-8 h-1 rounded-b-full shadow-xs ${
                isLight ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-[#f75605]'
              }`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        {/* 2. Trades */}
        <button
          onClick={() => handleNavClick('trades')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'trades'
              ? isLight ? 'text-violet-600 font-black' : 'text-[#f75605] font-black'
              : isLight ? 'text-slate-500' : 'text-[#8B96A3]'
          }`}
        >
          {activeTab === 'trades' && (
            <motion.div
              layoutId="mobileActiveIndicator"
              className={`absolute top-0 w-8 h-1 rounded-b-full shadow-xs ${
                isLight ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-[#f75605]'
              }`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px]">Trades</span>
          {tradeCount > 0 && (
            <span className={`absolute top-1 right-2.5 w-2 h-2 rounded-full ${isLight ? 'bg-violet-600' : 'bg-[#f75605]'}`} />
          )}
        </button>

        {/* 3. Dedicated AI Coach (Orange & Logo) */}
        <button
          onClick={() => handleNavClick('coach')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'coach'
              ? 'text-[#f75605] font-black'
              : isLight
                ? 'text-[#f75605] font-bold'
                : 'text-[#f75605] font-bold'
          }`}
        >
          {activeTab === 'coach' && (
            <motion.div
              layoutId="mobileActiveIndicator"
              className="absolute top-0 w-10 h-1 rounded-b-full bg-gradient-to-r from-[#f75605] to-[#ff7a29] shadow-md shadow-[#f75605]/50"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <div className={`p-1 rounded-lg ${
            activeTab === 'coach'
              ? 'bg-[#f75605] text-white shadow-md shadow-[#f75605]/30'
              : isLight ? 'bg-orange-100 text-[#f75605]' : 'bg-[#2A1D13] text-[#f75605] border border-[#f75605]/40'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] flex items-center gap-0.5">
            <span>IA Coach</span>
          </span>
        </button>

        {/* 4. Statistics */}
        <button
          onClick={() => handleNavClick('statistics')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'statistics'
              ? isLight ? 'text-violet-600 font-black' : 'text-[#f75605] font-black'
              : isLight ? 'text-slate-500' : 'text-[#8B96A3]'
          }`}
        >
          {activeTab === 'statistics' && (
            <motion.div
              layoutId="mobileActiveIndicator"
              className={`absolute top-0 w-8 h-1 rounded-b-full shadow-xs ${
                isLight ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-[#f75605]'
              }`}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Stats</span>
        </button>

        {/* 5. More */}
        <button
          onClick={() => setIsMoreSheetOpen(!isMoreSheetOpen)}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            isMoreActive || isMoreSheetOpen
              ? isLight ? 'text-violet-600 font-black' : 'text-[#f75605] font-black'
              : isLight ? 'text-slate-500' : 'text-[#8B96A3]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">Plus</span>
        </button>
      </div>

      {/* DESKTOP STICKY SIDEBAR */}
      <aside className={`hidden md:flex w-64 flex-col justify-between h-screen sticky top-0 select-none z-30 font-sans border-r transition-colors ${
        isLight 
          ? 'bg-white border-purple-200/90 text-slate-900 shadow-lg shadow-purple-500/5' 
          : 'bg-[#0B0F14] border-[#252E38] text-[#E8EDF2]'
      }`}>
        {navContent}
      </aside>
    </>
  );
};
