import React, { useState } from 'react';
import { UserSettings, AppTheme } from '../types/settings';
import { RiskAlert } from '../lib/riskPatterns';
import { useTheme } from '../hooks/useTheme';
import { Settings as SettingsIcon, Sun, Moon, Laptop, Database, Trash2, Sparkles, Save, CheckCircle2, ShieldAlert, Bell, Eye, EyeOff, Sliders, Upload, ChevronDown, ChevronRight } from 'lucide-react';

interface SettingsViewProps { settings: UserSettings; alerts: RiskAlert[]; onUpdateSettings: (partial: Partial<UserSettings>) => Promise<void>; onOpenBackup: () => void; onOpenSetups: () => void; onOpenImport: () => void; onSeed: () => void; onClear: () => void; tradeCount: number; }

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, alerts, onUpdateSettings, onOpenBackup, onOpenSetups, onOpenImport, onSeed, onClear, tradeCount }) => {
  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useState(settings.currency || 'EUR');
  const [initialBalance, setInitialBalance] = useState(String(settings.initialAccountBalance || 10000));
  const [defaultRisk, setDefaultRisk] = useState(String(settings.defaultRisk || 1));
  const [timezone, setTimezone] = useState(settings.timezone || 'UTC');
  const risk = settings.riskPatternSettings;
  const [revengeWindow, setRevengeWindow] = useState(String(risk.revengeWindowMinutes));
  const [revengeLotMultiplier, setRevengeLotMultiplier] = useState(String(risk.revengeMinLotMultiplier));
  const [lossStreakThreshold, setLossStreakThreshold] = useState(String(risk.lossStreakThreshold));
  const [overtradingMultiplier, setOvertradingMultiplier] = useState(String(risk.overtradingDailyMultiplier));
  const [abnormalLotMultiplier, setAbnormalLotMultiplier] = useState(String(risk.abnormalLotMultiplier));
  const [recentWinrateWindow, setRecentWinrateWindow] = useState(String(risk.recentWinrateWindow));
  const [recentWinrateDrop, setRecentWinrateDrop] = useState(String(risk.recentWinrateDropPoints));
  const [killzoneMinTrades, setKillzoneMinTrades] = useState(String(risk.outsideKillzoneMinTrades));
  const [killzoneGap, setKillzoneGap] = useState(String(risk.outsideKillzonePerformanceGap));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({ currency, initialAccountBalance: parseFloat(initialBalance) || 10000, defaultRisk: parseFloat(defaultRisk) || 1, timezone,
      riskPatternSettings: {
        revengeWindowMinutes: Math.min(60, Math.max(1, parseInt(revengeWindow,10) || 15)), revengeMinLotMultiplier: Math.min(10, Math.max(1, parseFloat(revengeLotMultiplier) || 1.5)),
        lossStreakThreshold: Math.min(20, Math.max(2, parseInt(lossStreakThreshold,10) || 4)), overtradingDailyMultiplier: Math.min(10, Math.max(1.1, parseFloat(overtradingMultiplier) || 2)),
        abnormalLotMultiplier: Math.min(10, Math.max(1.5, parseFloat(abnormalLotMultiplier) || 3)), recentWinrateWindow: Math.min(50, Math.max(10, parseInt(recentWinrateWindow,10) || 20)),
        recentWinrateDropPoints: Math.min(50, Math.max(5, parseFloat(recentWinrateDrop) || 15)), outsideKillzoneMinTrades: Math.min(100, Math.max(5, parseInt(killzoneMinTrades,10) || 10)),
        outsideKillzonePerformanceGap: Math.min(50, Math.max(5, parseFloat(killzoneGap) || 10)),
      }
    });
    setSavedSuccess(true); setTimeout(() => setSavedSuccess(false), 2500);
  };
  const inputClass = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums';
  return <div className="space-y-6" id="view-settings">
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"><SettingsIcon className="w-5 h-5" /></div><div><h2 className="text-base font-semibold">Terminal Preferences &amp; Configuration</h2><p className="text-xs text-slate-500 dark:text-slate-400">Account currency, starting balance, timezone, killzone killzones, and theme</p></div></div></div>
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs overflow-hidden">
      <button type="button" onClick={()=>setToolsOpen(v=>!v)} className="w-full flex items-center justify-between text-left btn-press">
        <span className="flex items-center gap-3"><span className="p-2 rounded-xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00]"><Sliders className="w-4 h-4"/></span><span><span className="block text-sm font-semibold">Tools &amp; SMC</span><span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Setups Manager, import et sauvegarde des données</span></span></span>
        {toolsOpen ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>}
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${toolsOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button type="button" onClick={onOpenSetups} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#6D19E8]/40 dark:hover:border-[#FF8A00]/40 hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition-all duration-200 btn-press text-left"><Sliders className="w-4 h-4 text-[#6D19E8] dark:text-[#FF8A00]"/><span><b className="block text-xs">Setups Manager</b><small className="text-[10px] text-slate-500">FVG, CISD, MSS models</small></span></button>
          <button type="button" onClick={onOpenImport} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#6D19E8]/40 dark:hover:border-[#FF8A00]/40 hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition-all duration-200 btn-press text-left"><Upload className="w-4 h-4 text-[#6D19E8] dark:text-[#FF8A00]"/><span><b className="block text-xs">Importer des Trades</b><small className="text-[10px] text-slate-500">CSV, Excel, Word, PDF</small></span></button>
          <button type="button" onClick={onOpenBackup} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#6D19E8]/40 dark:hover:border-[#FF8A00]/40 hover:bg-[#FAF8FF] dark:hover:bg-[#181C25] transition-all duration-200 btn-press text-left"><Database className="w-4 h-4 text-[#6D19E8] dark:text-[#FF8A00]"/><span><b className="block text-xs">Backup &amp; Export</b><small className="text-[10px] text-slate-500">JSON snapshot &amp; CSV</small></span></button>
        </div></div>
      </div>
    </div>

    <form onSubmit={handleSave} className="space-y-6">
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-3"><h3 className="text-sm font-semibold">Color Theme</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{id:'dark' as AppTheme,label:'Dark Terminal',icon:Moon,desc:'Deep Navy & Electric Indigo'},{id:'light' as AppTheme,label:'Light Studio',icon:Sun,desc:'Clean White & Crisp Violet'},{id:'system' as AppTheme,label:'System Sync',icon:Laptop,desc:'Follows OS mode'}].map(t=>{const Icon=t.icon;const selected=theme===t.id;return <button type="button" key={t.id} onClick={()=>setTheme(t.id)} className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${selected?'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20':'border-slate-200 dark:border-slate-800'}`}><div className={`p-2 rounded-lg ${selected?'bg-indigo-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}><Icon className="w-4 h-4"/></div><div><span className="font-medium text-xs block">{t.label}</span><span className="text-[11px] text-slate-500 dark:text-slate-400">{t.desc}</span></div></button>})}</div></div>
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-4"><h3 className="text-sm font-semibold">Account &amp; Financial Risk Parameters</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"><div><label className="block text-xs font-medium mb-1">Account Currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)} className={inputClass}><option>EUR</option><option>USD</option><option>GBP</option><option>JPY</option><option>CHF</option><option>AUD</option><option>CAD</option></select></div><div><label className="block text-xs font-medium mb-1">Starting Balance</label><input type="number" step="any" value={initialBalance} onChange={e=>setInitialBalance(e.target.value)} className={inputClass}/></div><div><label className="block text-xs font-medium mb-1">Default Target Risk (%)</label><input type="number" step="0.1" value={defaultRisk} onChange={e=>setDefaultRisk(e.target.value)} className={inputClass}/></div><div><label className="block text-xs font-medium mb-1">Timezone</label><select value={timezone} onChange={e=>setTimezone(e.target.value)} className={inputClass}><option>UTC</option><option>America/New_York</option><option>Europe/London</option><option>Europe/Paris</option><option>Asia/Tokyo</option><option>Australia/Sydney</option></select></div></div></div>
      <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-[#101827] shadow-xs space-y-4"><div className="flex items-start gap-3"><div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldAlert className="w-4 h-4"/></div><div><h3 className="text-sm font-semibold">Behavioral Risk Alerts</h3><p className="text-[11px] text-slate-500 dark:text-slate-400">Sensibilité des détections automatiques. Les données restent locales.</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="block text-xs font-medium mb-1">Revenge window (min)</label><input type="number" min="1" max="60" value={revengeWindow} onChange={e=>setRevengeWindow(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Revenge lot multiplier</label><input type="number" min="1" max="10" step="0.1" value={revengeLotMultiplier} onChange={e=>setRevengeLotMultiplier(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Pertes consécutives</label><input type="number" min="2" max="20" value={lossStreakThreshold} onChange={e=>setLossStreakThreshold(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Sur-trading : × moyenne/jour</label><input type="number" min="1.1" max="10" step="0.1" value={overtradingMultiplier} onChange={e=>setOvertradingMultiplier(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Lot anormal : × moyenne</label><input type="number" min="1.5" max="10" step="0.1" value={abnormalLotMultiplier} onChange={e=>setAbnormalLotMultiplier(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Fenêtre winrate récent</label><input type="number" min="10" max="50" value={recentWinrateWindow} onChange={e=>setRecentWinrateWindow(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Baisse winrate (points)</label><input type="number" min="5" max="50" value={recentWinrateDrop} onChange={e=>setRecentWinrateDrop(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Killzone : trades minimum</label><input type="number" min="5" max="100" value={killzoneMinTrades} onChange={e=>setKillzoneMinTrades(e.target.value)} className={inputClass}/></div>
        <div><label className="block text-xs font-medium mb-1">Écart de winrate killzone</label><input type="number" min="5" max="50" value={killzoneGap} onChange={e=>setKillzoneGap(e.target.value)} className={inputClass}/></div>
      </div><div className="flex items-center justify-end gap-3 pt-2">{savedSuccess&&<span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Settings saved successfully</span>}<button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"><Save className="w-3.5 h-3.5"/>Save Settings</button></div></div>
    </form>

    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><Bell className="w-4 h-4"/></div><div><h3 className="text-sm font-semibold">Notifications &amp; historique</h3><p className="text-[11px] text-slate-500 dark:text-slate-400">Historique local des alertes comportementales détectées.</p></div></div>
        <span className="text-[10px] font-bold text-slate-500">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
      </div>
      {alerts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">Aucun historique de notification.</div> : <div className="max-h-80 overflow-y-auto space-y-2">{alerts.slice().sort((a,b)=>new Date(b.detectedAt).getTime()-new Date(a.detectedAt).getTime()).map(alert=><div key={alert.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12151D] flex items-start gap-3"><div className="mt-0.5 text-amber-500">{alert.read ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-800 dark:text-slate-100">{alert.title}</span><span className="text-[10px] text-slate-500">{new Date(alert.detectedAt).toLocaleString('fr-FR')}</span></div><p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{alert.explanation}</p><span className="text-[10px] text-slate-400">{alert.dismissed ? 'Retirée des alertes actives' : alert.read ? 'Vue' : 'Non lue'}</span></div></div>)}</div>}
    </div>
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101827] shadow-xs space-y-4"><h3 className="text-sm font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-indigo-500"/>Local IndexedDB Data Management</h3><div className="flex items-center justify-between flex-wrap gap-4"><div className="text-xs text-slate-500 dark:text-slate-400">Currently storing <span className="font-semibold">{tradeCount} trades</span> in browser local storage.</div><div className="flex items-center gap-2 flex-wrap"><button onClick={onSeed} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800"><Sparkles className="w-3.5 h-3.5 text-amber-500"/>Load Seed Data</button><button onClick={onOpenBackup} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800"><Database className="w-3.5 h-3.5 text-indigo-500"/>Export / Backup</button>{tradeCount>0&&<button onClick={onClear} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"><Trash2 className="w-3.5 h-3.5"/>Clear Database</button>}</div></div></div>
  </div>;
};
