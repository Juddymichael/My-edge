import React, { useState } from 'react';
import { UserSettings, AppTheme } from '../types/settings';
import { useTheme } from '../hooks/useTheme';
import { Settings as SettingsIcon, Sun, Moon, Laptop, Database, Trash2, Sparkles, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  onOpenBackup: () => void;
  onSeed: () => void;
  onClear: () => void;
  tradeCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onOpenBackup, onSeed, onClear, tradeCount }) => {
  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useState(settings.currency || 'EUR');
  const [initialBalance, setInitialBalance] = useState(String(settings.initialAccountBalance || 10000));
  const [defaultRisk, setDefaultRisk] = useState(String(settings.defaultRisk || 1.0));
  const [timezone, setTimezone] = useState(settings.timezone || 'UTC');
  const risk = settings.riskPatternSettings || { revengeWindowMinutes: 15, revengeMinLotMultiplier: 1.5, lossStreakThreshold: 4 };
  const [revengeWindow, setRevengeWindow] = useState(String(risk.revengeWindowMinutes));
  const [revengeLotMultiplier, setRevengeLotMultiplier] = useState(String(risk.revengeMinLotMultiplier));
  const [lossStreakThreshold, setLossStreakThreshold] = useState(String(risk.lossStreakThreshold));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      currency,
      initialAccountBalance: parseFloat(initialBalance) || 10000,
      defaultRisk: parseFloat(defaultRisk) || 1.0,
      timezone,
      riskPatternSettings: {
        revengeWindowMinutes: Math.min(60, Math.max(1, parseInt(revengeWindow, 10) || 15)),
        revengeMinLotMultiplier: Math.min(10, Math.max(1, parseFloat(revengeLotMultiplier) || 1.5)),
        lossStreakThreshold: Math.min(20, Math.max(2, parseInt(lossStreakThreshold, 10) || 4)),
      },
    });
    setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6" id="view-settings">
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"><SettingsIcon className="w-5 h-5" /></div><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Terminal Preferences &amp; Configuration</h2><p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Account currency, starting balance, timezone, session killzones, and theme</p></div></div></div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-3"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Color Theme</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{ id: 'dark' as AppTheme, label: 'Dark Terminal', icon: Moon, desc: 'Deep Navy & Electric Indigo' }, { id: 'light' as AppTheme, label: 'Light Studio', icon: Sun, desc: 'Clean White & Crisp Violet' }, { id: 'system' as AppTheme, label: 'System Sync', icon: Laptop, desc: 'Follows OS mode' }].map((t) => { const Icon = t.icon; const isSelected = theme === t.id; return <button type="button" key={t.id} onClick={() => setTheme(t.id)} className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}><div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}><Icon className="w-4 h-4" /></div><div><span className="font-medium text-xs text-slate-900 dark:text-slate-100 block">{t.label}</span><span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{t.desc}</span></div></button>; })}</div></div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-4"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account &amp; Financial Risk Parameters</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Account Currency</label><select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"><option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option><option value="JPY">JPY (¥)</option><option value="CHF">CHF (Fr)</option><option value="AUD">AUD ($)</option><option value="CAD">CAD ($)</option></select></div>
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Starting Balance</label><input type="number" step="any" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium" /></div>
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Default Target Risk (%)</label><input type="number" step="0.1" value={defaultRisk} onChange={e => setDefaultRisk(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium" /></div>
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label><select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"><option value="UTC">UTC</option><option value="America/New_York">America/New_York (EST/EDT)</option><option value="Europe/London">Europe/London (GMT/BST)</option><option value="Europe/Paris">Europe/Paris (CET/CEST)</option><option value="Asia/Tokyo">Asia/Tokyo (JST)</option><option value="Australia/Sydney">Australia/Sydney (AEST)</option></select></div>
        </div><div className="flex items-center justify-end gap-3 pt-2">{savedSuccess && <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium"><CheckCircle2 className="w-4 h-4" /> Settings saved successfully</span>}<button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer"><Save className="w-3.5 h-3.5" /><span>Save Settings</span></button></div></div>

        <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#101827] shadow-xs space-y-4"><div className="flex items-start gap-3"><div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldAlert className="w-4 h-4" /></div><div><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Behavioral Risk Alerts</h3><p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Ajustez la sensibilité des alertes automatiques. Les données restent locales.</p></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fenêtre revenge trading (min)</label><input type="number" min="1" max="60" value={revengeWindow} onChange={e => setRevengeWindow(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums" /><p className="text-[10px] text-slate-400 mt-1">1–60 minutes</p></div>
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Seuil taille de lot (x moyenne)</label><input type="number" min="1" max="10" step="0.1" value={revengeLotMultiplier} onChange={e => setRevengeLotMultiplier(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums" /><p className="text-[10px] text-slate-400 mt-1">Signal renforcé si dépassé</p></div>
          <div><label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pertes consécutives avant alerte</label><input type="number" min="2" max="20" value={lossStreakThreshold} onChange={e => setLossStreakThreshold(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums" /><p className="text-[10px] text-slate-400 mt-1">2–20 pertes</p></div>
        </div></div>
      </form>

      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-4"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Database className="w-4 h-4 text-indigo-500" /><span>Local IndexedDB Data Management</span></h3><div className="flex items-center justify-between flex-wrap gap-4 pt-2"><div className="text-xs text-slate-500 dark:text-slate-400 font-normal">Currently storing <span className="font-semibold text-slate-900 dark:text-slate-200 tabular-nums">{tradeCount} trades</span> in browser local storage.</div><div className="flex items-center gap-2 flex-wrap"><button onClick={onSeed} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"><Sparkles className="w-3.5 h-3.5 text-amber-500" /><span>Load Seed Data</span></button><button onClick={onOpenBackup} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"><Database className="w-3.5 h-3.5 text-indigo-500" /><span>Export / Backup</span></button>{tradeCount > 0 && <button onClick={onClear} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /><span>Clear Database</span></button>}</div></div></div>
    </div>
  );
};
