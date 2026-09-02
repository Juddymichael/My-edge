import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Crosshair,
  BarChart3,
  Bot,
  Settings as SettingsIcon,
  Plus,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  Database,
  ShieldCheck,
  ChevronRight,
  Zap,
  Upload,
} from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'motion/react';

export type ActiveTab = 'dashboard' | 'calendar' | 'trades' | 'edge' | 'analytics' | 'coach' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onOpenSetupsModal: () => void;
  onOpenBackup: () => void;
  onSeed: () => void;
  isLoading?: boolean;
  tradeCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreate,
  onOpenImport,
  onOpenSetupsModal,
  onOpenBackup,
  onSeed,
  isLoading = false,
  tradeCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      description: 'Monthly activity & equity curve',
      icon: LayoutDashboard,
    },
    {
      id: 'calendar' as ActiveTab,
      label: 'Calendrier',
      description: 'Daily P&L & weekly recap matrix',
      icon: CalendarDays,
      badge: 'Visual',
    },
    {
      id: 'trades' as ActiveTab,
      label: 'Trade Journal',
      description: `${tradeCount} logged executions`,
      icon: BookOpen,
      badge: tradeCount > 0 ? String(tradeCount) : undefined,
    },
    {
      id: 'edge' as ActiveTab,
      label: 'My Edge Analyzer',
      description: 'SMC setups & win rate matrix',
      icon: Crosshair,
      highlight: true,
    },
    {
      id: 'analytics' as ActiveTab,
      label: 'Statistiques',
      description: "Vue d'ensemble & métriques",
      icon: BarChart3,
    },
    {
      id: 'coach' as ActiveTab,
      label: 'Trading Coach',
      description: 'Psychology & mistake tracker',
      icon: Bot,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      description: 'Currency, risk & preferences',
      icon: SettingsIcon,
    },
  ];

  const handleNav = (tab: ActiveTab) => {
    onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <aside
      id="thunder-edge-sidebar"
      className="flex flex-col h-full bg-white dark:bg-[#12151D] border-r border-[#ECE7FC] dark:border-[#292E38] text-[#0F0E26] dark:text-[#F5F5F5] select-none transition-colors duration-200"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#ECE7FC]/80 dark:border-[#292E38] flex items-center justify-between">
        <button
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none group"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D19E8] via-[#5B1FE0] to-[#4B27B8] dark:from-[#FF8A00] dark:via-[#FF7A00] dark:to-[#FF6B00] flex items-center justify-center text-white shadow-md shadow-[#6D19E8]/25 dark:shadow-[#FF8A00]/25 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-5 h-5 fill-amber-300 dark:fill-white text-amber-300 dark:text-white stroke-[2]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#12151D] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-[#0F0E26] dark:text-[#F5F5F5] font-sans">
                THUNDER<span className="text-[#6D19E8] dark:text-[#FF8A00] ml-0.5">EDGE</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-[#F5F0FF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-[#6B668D] dark:text-[#9299A8] block font-medium">
              Institutional Edge Terminal
            </span>
          </div>
        </button>
      </div>

      {/* Primary Action Button */}
      <div className="p-4 pb-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          id="sidebar-btn-log-trade"
          onClick={() => {
            onOpenCreate();
            if (onCloseMobile) onCloseMobile();
          }}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] hover:from-[#5A14C4] hover:to-[#3E1D9E] dark:hover:from-[#E67600] dark:hover:to-[#E65C00] text-white text-xs font-bold shadow-md shadow-[#6D19E8]/20 dark:shadow-[#FF8A00]/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Log New Trade</span>
        </motion.button>
      </div>

      {/* Vertical Navigation List */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main navigation menu">
        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8E89AF] dark:text-[#9299A8]">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => handleNav(item.id)}
              className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs cursor-pointer btn-press nav-item-interactive group ${
                isActive
                  ? 'active font-bold text-[#6D19E8] dark:text-[#FF8A00] bg-[#F5EEFF] dark:bg-[#FF8A00]/10 border border-[#DDD5FA] dark:border-[#FF8A00]/30 shadow-xs'
                  : 'font-semibold text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] text-white shadow-xs'
                      : 'bg-[#F5F2FE] dark:bg-[#181C25] text-[#6B668D] dark:text-[#9299A8] group-hover:text-[#6D19E8] dark:group-hover:text-[#FF8A00]'
                  }`}
                >
                  <Icon className="w-4 h-4 transition-transform duration-200 group-hover:rotate-6" />
                </div>
                <div className="text-left truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-[#8E89AF] dark:text-[#9299A8]/80 truncate">
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold tabular-nums rounded-full bg-[#ECE7FC] dark:bg-[#181C25] text-[#6D19E8] dark:text-[#FF8A00] dark:border dark:border-[#292E38] transition-transform duration-200 group-hover:scale-105">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8E89AF] dark:text-[#9299A8]">
          Tools &amp; SMC
        </div>

        {/* Setups Manager quick item */}
        <button
          id="sidebar-btn-setups-manager"
          onClick={() => {
            onOpenSetupsModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] border border-transparent cursor-pointer btn-press nav-item-interactive group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-[#F5F2FE] dark:bg-[#181C25] text-[#6B668D] dark:text-[#9299A8] group-hover:text-[#6D19E8] dark:group-hover:text-[#FF8A00] transition-all duration-200 group-hover:scale-110">
              <Sliders className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" />
            </div>
            <div className="text-left">
              <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Setups Manager</span>
              <div className="text-[10px] font-medium text-[#8E89AF] dark:text-[#9299A8]/80">
                FVG, CISD, MSS models
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E89AF] dark:text-[#9299A8] transition-transform duration-200 group-hover:translate-x-1" />
        </button>

        {/* Universal Import trigger */}
        <button
          id="sidebar-btn-import"
          onClick={() => {
            onOpenImport();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] border border-transparent cursor-pointer btn-press nav-item-interactive group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30 transition-all duration-200 group-hover:scale-110">
              <Upload className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </div>
            <div className="text-left">
              <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Importer des Trades</span>
              <div className="text-[10px] font-medium text-[#8E89AF] dark:text-[#9299A8]/80">
                CSV, Excel, Word, PDF
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E89AF] dark:text-[#9299A8] transition-transform duration-200 group-hover:translate-x-1" />
        </button>

        {/* Backup Modal trigger */}
        <button
          id="sidebar-btn-backup"
          onClick={() => {
            onOpenBackup();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] border border-transparent cursor-pointer btn-press nav-item-interactive group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-[#F5F2FE] dark:bg-[#181C25] text-[#6B668D] dark:text-[#9299A8] group-hover:text-[#6D19E8] dark:group-hover:text-[#FF8A00] transition-all duration-200 group-hover:scale-110">
              <Database className="w-4 h-4 transition-transform duration-200 group-hover:rotate-6" />
            </div>
            <div className="text-left">
              <span className="font-bold text-[#0F0E26] dark:text-[#F5F5F5]">Backup &amp; Export</span>
              <div className="text-[10px] font-medium text-[#8E89AF] dark:text-[#9299A8]/80">
                JSON snapshot &amp; CSV
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#8E89AF] dark:text-[#9299A8] transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>

      {/* Footer / Status & Theme Switcher */}
      <div className="p-4 border-t border-[#ECE7FC] dark:border-[#292E38] space-y-3 bg-[#FAF8FF] dark:bg-[#0B0D12]">
        {/* Seed Data button if exploring */}
        <button
          id="sidebar-btn-seed"
          onClick={() => {
            onSeed();
            if (onCloseMobile) onCloseMobile();
          }}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-[#FF8A00] bg-amber-50 dark:bg-[#FF8A00]/10 hover:bg-amber-100 dark:hover:bg-[#FF8A00]/20 border border-amber-300/80 dark:border-[#FF8A00]/30 shadow-xs transition-all duration-200 cursor-pointer disabled:opacity-50 btn-press"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-[#FF8A00] dark:fill-[#FF8A00]" />
          <span>Load Seed Dataset</span>
        </button>

        {/* Theme Switcher Card */}
        <div className="p-2 rounded-2xl bg-white dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
            {isDark ? (
              <Moon className="w-4 h-4 text-[#FF8A00] fill-[#FF8A00]/20" />
            ) : (
              <Sun className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]/20" />
            )}
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>

          <button
            id="sidebar-theme-toggle"
            type="button"
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6D19E8] dark:focus:ring-[#FF8A00] focus:ring-offset-2 ${
              isDark ? 'bg-gradient-to-r from-[#FF8A00] to-[#FF6B00]' : 'bg-[#DDD5FA]'
            }`}
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle Theme Mode"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Storage status indicator */}
        <div className="flex items-center justify-between text-[11px] text-[#8E89AF] dark:text-[#9299A8] px-1 font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>IndexedDB Secured</span>
          </div>
          <span className="font-bold text-[#6D19E8] dark:text-[#FF8A00]">v2.5</span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <div className="hidden md:block w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer container */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
