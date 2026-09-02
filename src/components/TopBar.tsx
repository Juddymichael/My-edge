import React from 'react';
import {
  Menu,
  Plus,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  Database,
  Radio,
  Crosshair,
  TrendingUp,
  Bot,
  Settings as SettingsIcon,
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Upload,
  Bell,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { ActiveTab } from './Sidebar';
import { motion } from 'motion/react';

interface TopBarProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onOpenSetupsModal: () => void;
  onOpenBackup: () => void;
  onSeed: () => void;
  unreadCount?: number;
  onDismissAllNotifications?: () => void;
  isLoading?: boolean;
  tradeCount: number;
}

const TAB_INFO: Record<ActiveTab, { title: string; subtitle: string; icon: React.FC<{ className?: string }> }> = {
  dashboard: {
    title: 'Performance Dashboard',
    subtitle: 'Institutional metrics, monthly trading breakdown, and capital growth',
    icon: LayoutDashboard,
  },
  calendar: {
    title: 'Trading Calendar',
    subtitle: 'Interactive daily trade calendar with P&L breakdown and weekly statistics',
    icon: CalendarDays,
  },
  trades: {
    title: 'Trade Journal & Ledger',
    subtitle: 'Complete trade database with mathematical R calculations & tags',
    icon: BookOpen,
  },
  edge: {
    title: 'My Edge Analyzer',
    subtitle: 'SMC setup confidence matrix, win rates & expectancy breakdown',
    icon: Crosshair,
  },
  analytics: {
    title: 'Institutional Analytics',
    subtitle: 'Killzone session performance, directionality, and drawdowns',
    icon: TrendingUp,
  },
  coach: {
    title: 'Trading Psychology Coach',
    subtitle: 'Discipline adherence rate, emotional bias & mistake cost audit',
    icon: Bot,
  },
  settings: {
    title: 'Terminal Settings',
    subtitle: 'Account currency, starting balance, timezone and parameters',
    icon: SettingsIcon,
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenCreate,
  onOpenImport,
  onOpenSetupsModal,
  onOpenBackup,
  onSeed,
  isLoading = false,
  tradeCount,
  unreadCount = 0,
  onDismissAllNotifications,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const info = TAB_INFO[activeTab] || TAB_INFO.dashboard;
  const Icon = info.icon;

  return (
    <header
      id="thunder-edge-topbar"
      className="sticky top-0 z-20 h-16 border-b border-[#ECE7FC] dark:border-[#292E38] bg-white/85 dark:bg-[#0B0D12]/90 backdrop-blur-md transition-colors duration-200 px-4 sm:px-6 flex items-center justify-between"
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-2xl text-[#6B668D] dark:text-[#9299A8] hover:bg-[#F5EEFF] dark:hover:bg-[#181C25] focus:outline-none cursor-pointer"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:flex p-2 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30 shrink-0 shadow-xs">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5] truncate flex items-center gap-2">
              <span>{info.title}</span>
            </h1>
            <p className="hidden lg:block text-[11px] font-medium text-[#6B668D] dark:text-[#9299A8] truncate">
              {info.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Market Status & Quick Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live Session Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Radio className="w-3 h-3 text-emerald-500" />
          <span>SMC KILLZONE ACTIVE</span>
        </div>

        {/* Setups Manager quick button */}
        <button
          onClick={onOpenSetupsModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-2xl text-[#0F0E26] dark:text-[#F5F5F5] bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#1F2430] border border-[#ECE7FC] dark:border-[#292E38] transition-all duration-200 cursor-pointer shadow-xs btn-press btn-icon-animate group"
          title="Open Setups Manager (Golden FVG, CISD, OB)"
        >
          <Sliders className="w-3.5 h-3.5 text-[#6D19E8] dark:text-[#FF8A00] btn-icon" />
          <span>Setups</span>
        </button>

        {/* Import Trades Button */}
        <button
          onClick={onOpenImport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-2xl text-[#6D19E8] dark:text-[#FF8A00] bg-[#F5EEFF] dark:bg-[#FF8A00]/10 hover:bg-[#ECE2FF] dark:hover:bg-[#FF8A00]/20 border border-[#DDD5FA] dark:border-[#FF8A00]/30 transition-all duration-200 cursor-pointer shadow-xs btn-press btn-icon-animate group"
          title="Import trades from CSV, Excel, Word, PDF, JSON"
        >
          <Upload className="w-3.5 h-3.5 text-[#6D19E8] dark:text-[#FF8A00] btn-icon-bounce" />
          <span className="hidden sm:inline">Importer</span>
        </button>

        {/* Seed dataset button if empty */}
        {tradeCount === 0 && (
          <button
            onClick={onSeed}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-2xl text-amber-800 dark:text-[#FF8A00] bg-amber-50 dark:bg-[#FF8A00]/10 hover:bg-amber-100 dark:hover:bg-[#FF8A00]/20 border border-amber-300 dark:border-[#FF8A00]/30 transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-xs btn-press btn-icon-animate group"
            title="Load sample institutional trades"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-[#FF8A00] dark:fill-[#FF8A00] btn-icon" />
            <span className="hidden sm:inline">Seed Data</span>
          </button>
        )}

        {/* Backup Modal */}
        <button
          onClick={onOpenBackup}
          className="p-2 rounded-2xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition-all duration-200 cursor-pointer btn-press btn-icon-animate group"
          title="Backup & Restore IndexedDB"
        >
          <Database className="w-4 h-4 btn-icon" />
        </button>

        {/* Bulk notification control */}
        {onDismissAllNotifications && (
          <button
            onClick={onDismissAllNotifications}
            disabled={unreadCount === 0}
            className="relative p-2 rounded-2xl text-[#6B668D] dark:text-[#9299A8] hover:text-[#0F0E26] dark:hover:text-[#F5F5F5] hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed btn-press btn-icon-animate group"
            title={unreadCount > 0 ? 'Marquer toutes les notifications comme vues / les retirer des alertes actives' : 'Aucune notification non lue'}
            aria-label="Effacer les notifications actives"
          >
            <Bell className="w-4 h-4 btn-icon" />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#F97316] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0B0D12]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        )}
        {onDismissAllNotifications && (
          <button
            onClick={onDismissAllNotifications}
            disabled={unreadCount === 0}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-2xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#181C25] hover:bg-slate-100 dark:hover:bg-[#202531] border border-slate-200 dark:border-[#292E38] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed btn-press"
            title="Retirer toutes les notifications actives"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tout effacer</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          className="p-2 rounded-2xl text-[#0F0E26] dark:text-[#F5F5F5] hover:bg-[#F5EEFF] dark:hover:bg-[#181C25] transition-all duration-200 border border-[#ECE7FC] dark:border-[#292E38] cursor-pointer shadow-xs btn-press btn-icon-animate group"
          title={isDark ? 'Switch to Light Studio Theme' : 'Switch to Dark Terminal Theme'}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#FF8A00] fill-[#FF8A00]/20 btn-icon" />
          ) : (
            <Moon className="w-4 h-4 text-[#6D19E8] fill-[#6D19E8]/20 btn-icon" />
          )}
        </motion.button>

        {/* Log Trade CTA */}
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onOpenCreate}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-2xl bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] hover:from-[#5A14C4] hover:to-[#3E1D9E] dark:hover:from-[#E67600] dark:hover:to-[#E65C00] text-white shadow-md shadow-[#6D19E8]/20 dark:shadow-[#FF8A00]/25 transition-all duration-200 cursor-pointer disabled:opacity-50 btn-press btn-icon-animate group"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] btn-icon" />
          <span>New Trade</span>
        </motion.button>
      </div>
    </header>
  );
};
