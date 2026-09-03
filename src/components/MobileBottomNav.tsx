import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Crosshair,
  Download,
  FileUp,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onOpenSetupsModal: () => void;
  onOpenBackup: () => void;
  onCloseMobile?: () => void;
}

const PRIMARY_TABS: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trades', label: 'Journal', icon: BookOpen },
  { id: 'ai-analysis', label: 'Analyse IA', icon: Sparkles },
  { id: 'edge', label: 'My Edge', icon: Crosshair },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenCreate,
  onOpenImport,
  onOpenSetupsModal,
  onOpenBackup,
  onCloseMobile,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  const go = (tab: ActiveTab) => {
    onTabChange(tab);
    setMoreOpen(false);
    onCloseMobile?.();
  };

  const openAction = (action: () => void) => {
    action();
    setMoreOpen(false);
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const moreItems = [
    { label: 'Calendrier', icon: CalendarDays, onClick: () => go('calendar') },
    { label: 'Statistiques', icon: BarChart3, onClick: () => go('analytics') },
    { label: 'Setups Manager', icon: Sliders, onClick: () => openAction(onOpenSetupsModal) },
    { label: 'Importer des trades', icon: FileUp, onClick: () => openAction(onOpenImport) },
    { label: 'Réglages', icon: Settings, onClick: () => go('settings') },
    { label: 'Backup & Restore', icon: Menu, onClick: () => openAction(onOpenBackup) },
  ];

  return (
    <>
      {moreOpen && (
        <div className="mobile-more-sheet fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Plus de navigation">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" aria-label="Fermer le menu Plus" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white dark:bg-[#12151D] border-t border-slate-200 dark:border-[#292E38] shadow-2xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+18px)] animate-mobile-sheet-in">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center justify-between px-1 pb-2">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Plus</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Outils et sections secondaires</p>
              </div>
              <button onClick={() => setMoreOpen(false)} className="mobile-touch-target rounded-full bg-slate-100 dark:bg-[#181C25] text-slate-600 dark:text-slate-300" aria-label="Fermer"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {installPrompt && (
                <button onClick={installApp} className="mobile-more-item mobile-touch-target flex items-center gap-3 rounded-2xl border border-[#DDD5FA] dark:border-[#7C3AED]/30 bg-[#F5EEFF] dark:bg-[#7C3AED]/10 px-3 text-left active:scale-[.98] col-span-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0B0D12] text-[#6D19E8] dark:text-[#A855F7] border border-[#DDD5FA] dark:border-[#292E38]"><Download className="w-4 h-4" /></span>
                  <span><span className="block text-xs font-bold text-slate-900 dark:text-white">Installer Thunder Edge</span><span className="block text-[10px] text-slate-500 dark:text-slate-400">Ajouter l'app à l'écran d'accueil</span></span>
                </button>
              )}
              {moreItems.map(({ label, icon: Icon, onClick }) => (
                <button key={label} onClick={onClick} className="mobile-more-item mobile-touch-target flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] px-3 text-left active:scale-[.98]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0B0D12] text-[#6D19E8] dark:text-[#A855F7] border border-slate-200 dark:border-[#292E38]"><Icon className="w-4 h-4" /></span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button type="button" onClick={onOpenCreate} className="mobile-fab fixed right-4 z-[65] md:hidden flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white shadow-[0_10px_28px_rgba(109,25,232,.32)] active:scale-95" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }} aria-label="Enregistrer un nouveau trade">
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[60] md:hidden border-t border-slate-200/90 dark:border-[#292E38] bg-white/95 dark:bg-[#0F1219]/95 backdrop-blur-xl shadow-[0_-8px_28px_rgba(15,23,42,.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Navigation principale">
        <div className="mx-auto flex h-[68px] max-w-[520px] items-stretch px-1.5">
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return <button key={id} type="button" onClick={() => go(id)} className={`mobile-nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-bold active:scale-[.96] ${active ? 'text-[#6D19E8] dark:text-[#C084FC]' : 'text-slate-500 dark:text-slate-400'}`} aria-current={active ? 'page' : undefined}><span className={`flex h-8 w-10 items-center justify-center rounded-2xl transition-colors duration-150 ${active ? 'bg-[#F3EAFF] dark:bg-[#7C3AED]/15' : ''}`}><Icon className="h-5 w-5" /></span><span className="max-w-full truncate leading-3">{label}</span>{active && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-[#7C3AED]" />}</button>;
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className={`mobile-nav-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-bold active:scale-[.96] ${moreOpen || ['calendar','analytics','settings'].includes(activeTab) ? 'text-[#6D19E8] dark:text-[#C084FC]' : 'text-slate-500 dark:text-slate-400'}`} aria-expanded={moreOpen} aria-label="Plus de sections"><span className={`flex h-8 w-10 items-center justify-center rounded-2xl ${moreOpen || ['calendar','analytics','settings'].includes(activeTab) ? 'bg-[#F3EAFF] dark:bg-[#7C3AED]/15' : ''}`}><Menu className="h-5 w-5" /></span><span>Plus</span></button>
        </div>
      </nav>
    </>
  );
};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}
