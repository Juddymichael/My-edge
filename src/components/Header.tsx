import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { useTheme } from '../hooks/useTheme';

export type ActiveTab = 'dashboard' | 'calendar' | 'trades' | 'edge' | 'analytics' | 'coach' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  onOpenSetupsModal: () => void;
  onOpenBackup: () => void;
  onSeed: () => void;
  isLoading: boolean;
  tradeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenCreate,
  onOpenSetupsModal,
  onOpenBackup,
  onSeed,
  isLoading,
  tradeCount,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { id: 'trades', label: 'Journal', icon: BookOpen },
    { id: 'edge', label: 'My Edge', icon: Crosshair },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'coach', label: 'Trading Coach', icon: Bot },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="thunder-edge-header"
      className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#080D1A]/95 backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
            >
              <Logo size="md" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.id === 'edge' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Seed Dataset shortcut if empty or exploring */}
            <button
              id="btn-seed-data"
              onClick={onSeed}
              disabled={isLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 transition disabled:opacity-50 cursor-pointer"
              title="Load Institutional Seed Trades & Setups"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Seed Dataset</span>
            </button>

            {/* Setups Manager Quick Trigger */}
            <button
              id="btn-open-setups-manager"
              onClick={onOpenSetupsModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 transition cursor-pointer"
              title="Manage Trading Setups (Golden FVG, CISD, OB, etc.)"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Setups</span>
            </button>

            {/* Backup / Export Trigger */}
            <button
              id="btn-header-backup"
              onClick={onOpenBackup}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              title="Data Backup & Restore"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Color Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Primary Action: New Trade */}
            <button
              id="btn-header-create-trade"
              onClick={onOpenCreate}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>Log Trade</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              id="btn-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080D1A] px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                onSeed();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 py-2 px-3"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Seed Dataset</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
