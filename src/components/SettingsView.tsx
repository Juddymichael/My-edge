import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserAppSettings, Trade, AccountTransaction, VioletThemeVariant } from '../types';
import { exportBackupJSON } from '../storage';
import { VIOLET_VARIANTS, getThemeClasses } from '../utils/theme';
import { DEFAULT_PLAN_INSTRUMENTS } from '../utils/tradingSession';
import { 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  ShieldAlert, 
  Palette, 
  Sun, 
  Moon, 
  Check, 
  Smartphone, 
  CheckCircle2, 
  Target, 
  Plus, 
  X, 
  RotateCcw,
  Database,
  RefreshCw
} from 'lucide-react';
import { usePwa } from '../hooks/usePwa';

interface SettingsViewProps {
  settings: UserAppSettings;
  onUpdateSettings: (newSettings: UserAppSettings) => void;
  trades: Trade[];
  transactions?: AccountTransaction[];
  onRestoreBackup: (trades: Trade[], settings: UserAppSettings, transactions?: AccountTransaction[]) => void;
  onRestoreSampleData?: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  trades,
  transactions = [],
  onRestoreBackup,
  onRestoreSampleData,
  onClearAllData,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);
  const { isInstallable, isStandalone, installApp } = usePwa();
  const [startingBalInput, setStartingBalInput] = useState(settings.startingBalance.toString());
  const [currencyInput, setCurrencyInput] = useState(settings.currencySymbol);
  const [reduceMotionCheck, setReduceMotionCheck] = useState(settings.reduceMotion);
  const [planInstruments, setPlanInstruments] = useState<string[]>(
    settings.planInstruments && settings.planInstruments.length > 0
      ? settings.planInstruments
      : DEFAULT_PLAN_INSTRUMENTS
  );
  const [newInstrumentInput, setNewInstrumentInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreDemoConfirm, setShowRestoreDemoConfirm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const handleAddInstrument = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newInstrumentInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw && !planInstruments.includes(raw)) {
      setPlanInstruments([...planInstruments, raw]);
      setNewInstrumentInput('');
    }
  };

  const handleRemoveInstrument = (symbolToRemove: string) => {
    setPlanInstruments(planInstruments.filter((s) => s !== symbolToRemove));
  };

  const handleResetDefaultInstruments = () => {
    setPlanInstruments([...DEFAULT_PLAN_INSTRUMENTS]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const balNum = parseFloat(startingBalInput);
    onUpdateSettings({
      ...settings,
      startingBalance: isNaN(balNum) ? 10000 : balNum,
      currencySymbol: currencyInput || '$',
      reduceMotion: reduceMotionCheck,
      planInstruments: planInstruments.length > 0 ? planInstruments : DEFAULT_PLAN_INSTRUMENTS,
    });
    showNotification('success', 'Paramètres enregistrés avec succès.');
  };

  const handleSelectVariant = (variantKey: VioletThemeVariant) => {
    onUpdateSettings({
      ...settings,
      violetVariant: variantKey,
    });
  };

  const handleToggleThemeMode = (mode: 'light' | 'dark') => {
    onUpdateSettings({
      ...settings,
      theme: mode,
    });
  };

  const handleBackupRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.trades && Array.isArray(json.trades)) {
        onRestoreBackup(json.trades, json.settings || settings, json.transactions);
        const txCount = json.transactions && Array.isArray(json.transactions) ? json.transactions.length : 0;
        showNotification(
          'success',
          `Sauvegarde restaurée avec succès (${json.trades.length} trades${txCount > 0 ? `, ${txCount} transactions` : ''}).`
        );
      } else {
        showNotification('error', 'Format de fichier JSON invalide : clé "trades" introuvable.');
      }
    } catch (err) {
      showNotification('error', 'Erreur lors de la lecture du fichier JSON.');
      console.error(err);
    }
  };

  const handleConfirmRestoreSample = () => {
    if (onRestoreSampleData) {
      onRestoreSampleData();
      setShowRestoreDemoConfirm(false);
      showNotification('success', 'Dataset de démonstration restauré avec succès.');
    }
  };

  const currentVariantKey = settings.violetVariant || 'smoothie-berry';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`p-3 sm:p-6 md:p-8 space-y-5 max-w-4xl mx-auto font-sans transition-colors ${
        isLight ? 'text-slate-900' : 'text-slate-100'
      }`}
    >
      <div className={`pb-3 border-b ${theme.tableBorder}`}>
        <h2 className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 ${theme.textPrimary}`}>
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Paramètres & Personnalisation</span>
        </h2>
        <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
          Configurez l'apparence, les instruments autorisés et le capital initial
        </p>
      </div>

      {/* Theme & Color Palette Selector Card */}
      <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 ${theme.cardBg}`}>
        <h3 className={`text-sm font-bold pb-2.5 border-b flex items-center justify-between ${theme.tableBorder} ${theme.textPrimary}`}>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <span>Thème & Nuances</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${theme.badgeNeutral}`}>
            Mode {isLight ? 'Clair (Violet)' : 'Sombre (Orange)'}
          </span>
        </h3>

        {/* Mode Switcher Buttons */}
        <div>
          <label className={theme.label}>Apparence de l'Interface</label>
          <div className="grid grid-cols-2 gap-2.5 mt-1.5">
            <button
              type="button"
              onClick={() => handleToggleThemeMode('light')}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer btn-press ${
                isLight
                  ? 'bg-violet-50/80 border-violet-500 ring-2 ring-violet-500/20 shadow-xs'
                  : theme.innerBg
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                  isLight ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className={`block text-xs font-semibold ${theme.textPrimary}`}>Mode Clair</span>
                  <span className={`text-[10px] ${theme.textMuted}`}>Accent Violet</span>
                </div>
              </div>
              {isLight && <Check className="w-4 h-4 text-violet-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleToggleThemeMode('dark')}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer btn-press ${
                !isLight
                  ? 'bg-[#171E27] border-[#f75605] ring-2 ring-[#f75605]/20 shadow-xs text-[#E8EDF2]'
                  : theme.innerBg
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                  !isLight ? 'bg-[#f75605] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className={`block text-xs font-semibold ${theme.textPrimary}`}>Mode Sombre</span>
                  <span className={`text-[10px] ${theme.textMuted}`}>Anthracite & Orange Studio</span>
                </div>
              </div>
              {!isLight && <Check className="w-4 h-4 text-[#f75605]" />}
            </button>
          </div>
        </div>

        {/* Violet Variants Picker */}
        {isLight && (
          <div>
            <label className={theme.label}>Nuance du Mode Clair</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-1.5">
              {(Object.keys(VIOLET_VARIANTS) as VioletThemeVariant[]).map((key) => {
                const variant = VIOLET_VARIANTS[key];
                const isSelected = currentVariantKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectVariant(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer btn-press relative ${
                      isSelected
                        ? 'border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/70 shadow-xs'
                        : `${theme.innerBg} hover:border-slate-300`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold ${theme.textPrimary}`}>
                        {variant.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-600" />}
                    </div>

                    <div className={`h-2 w-full rounded-full bg-gradient-to-r ${variant.gradientClass} mb-1`} />

                    <span className={`text-[10px] block leading-tight ${theme.textMuted}`}>
                      {variant.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Plan vs Hors-Plan Trading Plan Instruments Card */}
      <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 ${theme.cardBg}`}>
        <div className={`flex items-center justify-between pb-2.5 border-b ${theme.tableBorder}`}>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              Plan de Trading — Instruments Autorisés
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetDefaultInstruments}
            className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer btn-press ${theme.badgeNeutral}`}
            title="Rétablir EURUSD, XAUUSD, EURJPY"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Par Défaut</span>
          </button>
        </div>

        <p className={`text-xs leading-relaxed ${theme.textMuted}`}>
          Les instruments présents dans cette liste sont classés <strong>« Dans le Plan »</strong>. Tout instrument absent est classé <strong>« Hors-Plan »</strong>.
        </p>

        {/* Current Active Plan Instruments Tags */}
        <div>
          <label className={theme.label}>Instruments Actuels ({planInstruments.length})</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {planInstruments.map((symbol) => (
              <span
                key={symbol}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono border ${theme.winBadge}`}
              >
                <span>{symbol}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInstrument(symbol)}
                  className="hover:text-rose-500 transition-colors cursor-pointer p-0.5 rounded"
                  title={`Retirer ${symbol}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {planInstruments.length === 0 && (
              <span className="text-xs text-amber-500 font-semibold italic">
                Aucun instrument configuré (tous les trades seront Hors-Plan).
              </span>
            )}
          </div>
        </div>

        {/* Add Instrument Form */}
        <div>
          <label className={theme.label}>Ajouter un Instrument</label>
          <div className="flex items-center gap-2 mt-1 max-w-md">
            <input
              type="text"
              placeholder="ex: GBPUSD, US30, BTCUSD..."
              value={newInstrumentInput}
              onChange={(e) => setNewInstrumentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInstrument();
                }
              }}
              className={`flex-1 border rounded-xl px-3 py-1.5 text-xs outline-hidden uppercase font-mono font-medium ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900 placeholder-slate-400' 
                  : 'bg-[#12151D] border-[#232733] focus:border-[#FF8533] text-white placeholder-slate-500'
              }`}
            />
            <button
              type="button"
              onClick={() => handleAddInstrument()}
              disabled={!newInstrumentInput.trim()}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer btn-press text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                isLight
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'bg-[#FF8533] hover:bg-[#EA580C] text-black font-bold'
              }`}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className={`border rounded-2xl p-4 sm:p-5 space-y-4 ${theme.cardBg}`}>
        <h3 className={`text-sm font-bold pb-2.5 border-b ${theme.tableBorder} ${theme.textPrimary}`}>
          Compte & Préférences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className={theme.label}>
              Capital Initial
            </label>
            <input
              type="number"
              value={startingBalInput}
              onChange={(e) => setStartingBalInput(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-semibold outline-hidden ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900' 
                  : 'bg-[#12151D] border-[#232733] focus:border-[#FF8533] text-white'
              }`}
            />
          </div>

          <div>
            <label className={theme.label}>
              Symbole de Devise
            </label>
            <select
              value={currencyInput}
              onChange={(e) => setCurrencyInput(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-hidden ${
                isLight 
                  ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900' 
                  : 'bg-[#12151D] border-[#232733] focus:border-[#FF8533] text-white'
              }`}
            >
              <option value="$">$ (USD / CAD / AUD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
              <option value="¥">¥ (JPY)</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
        </div>

        <div className={`pt-2 border-t space-y-2 ${theme.tableBorder}`}>
          <label className={`flex items-center gap-2.5 text-xs cursor-pointer ${theme.textSecondary}`}>
            <input
              type="checkbox"
              checked={reduceMotionCheck}
              onChange={(e) => setReduceMotionCheck(e.target.checked)}
              className={`rounded w-4 h-4 ${isLight ? 'accent-violet-600' : 'accent-[#FF8533]'}`}
            />
            <span>Réduire les animations</span>
          </label>
        </div>

        <button
          type="submit"
          className={`px-4 py-2 font-semibold text-xs rounded-xl transition-all cursor-pointer btn-press text-white ${
            isLight
              ? 'bg-violet-600 hover:bg-violet-700'
              : 'bg-[#FF8533] hover:bg-[#EA580C] text-black font-bold'
          }`}
        >
          Enregistrer les Préférences
        </button>
      </form>

      {/* PWA Application Section */}
      <div className={`border rounded-2xl p-4 sm:p-5 space-y-3 ${theme.cardBg}`}>
        <div className={`flex items-center justify-between pb-2.5 border-b ${theme.tableBorder}`}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>Application Native PWA</h3>
          </div>
          {isStandalone ? (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${theme.winBadge}`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Installé</span>
            </span>
          ) : (
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${theme.badgeNeutral}`}>
              Web App
            </span>
          )}
        </div>

        <p className={`text-xs ${theme.textMuted}`}>
          Installez TradeStudio sur smartphone ou ordinateur pour un accès hors-ligne rapide.
        </p>

        {isInstallable && (
          <button
            onClick={installApp}
            className={`px-4 py-2 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer btn-press text-white ${
              isLight
                ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-[#FF8533] hover:bg-[#EA580C] text-black font-bold'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer l'application TradeStudio</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedbackMsg.type === 'success' ? theme.winBadge : theme.lossBadge
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Backup & Restore Section */}
      <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 ${theme.cardBg}`}>
        <div className={`pb-2.5 border-b flex items-center justify-between ${theme.tableBorder}`}>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-400" />
            <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
              Sauvegarde & Restauration
            </h3>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${theme.badgeNeutral}`}>
            {trades.length} trades enregistrés
          </span>
        </div>

        <p className={`text-xs ${theme.textMuted}`}>
          Exportez l'ensemble de votre journal de trading, restaurez un fichier de sauvegarde JSON ou rechargez le jeu de données de démonstration.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              exportBackupJSON(trades, settings, transactions);
              showNotification('success', 'Fichier de sauvegarde exporté avec succès.');
            }}
            className={`px-3.5 py-2.5 text-xs font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer btn-press ${theme.badgeNeutral}`}
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exporter JSON ({trades.length})</span>
          </button>

          <label className={`px-3.5 py-2.5 text-xs font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer btn-press ${theme.badgeNeutral}`}>
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurer Fichier JSON</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleBackupRestoreFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {onRestoreSampleData && (
            <button
              type="button"
              onClick={() => setShowRestoreDemoConfirm(true)}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-2 cursor-pointer btn-press ${
                isLight 
                  ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100' 
                  : 'border-[#f75605]/40 text-[#f75605] bg-[#f75605]/10 hover:bg-[#f75605]/20'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurer Données Démo</span>
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className={`border rounded-2xl p-4 sm:p-5 space-y-3 ${
        isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-[#2A1518]/40 border-[#EF4444]/30'
      }`}>
        <h3 className={`text-sm font-bold flex items-center gap-2 ${theme.lossText}`}>
          <ShieldAlert className="w-4 h-4" />
          <span>Zone de Danger</span>
        </h3>

        <p className={`text-xs ${theme.textMuted}`}>
          Supprimer définitivement l'ensemble de vos trades et transactions enregistrés en mémoire locale.
        </p>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="px-3.5 py-1.5 font-medium text-xs rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer btn-press"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Effacer Toutes les Données</span>
        </button>
      </div>

      {/* Restore Demo Confirmation Modal */}
      {showRestoreDemoConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl relative ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#161922] border-[#232733] text-slate-100'
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${theme.textPrimary}`}>
              <RefreshCw className="w-4 h-4 text-[#f75605]" />
              <span>Restaurer les données démo ?</span>
            </h3>
            <p className={`text-xs leading-relaxed ${theme.textMuted}`}>
              Cette action rechargera l'historique complet des trades de démonstration (stratégies ICT / SMC, setups FVG & Orderblocks).
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowRestoreDemoConfirm(false)}
                className={`px-3 py-1.5 font-medium rounded-xl border cursor-pointer ${theme.badgeNeutral}`}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRestoreSample}
                className={`px-3.5 py-1.5 text-white font-semibold rounded-xl cursor-pointer ${
                  isLight ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#f75605] hover:bg-[#ea580c]'
                }`}
              >
                Restaurer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl relative ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#161922] border-[#232733] text-slate-100'
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 ${theme.textPrimary}`}>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Confirmer la Réinitialisation</span>
            </h3>
            <p className={`text-xs leading-relaxed ${theme.textMuted}`}>
              Cette action supprimera l'intégralité de vos {trades.length} trades et transactions. Continuer ?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`px-3 py-1.5 font-medium rounded-xl border cursor-pointer ${theme.badgeNeutral}`}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                  showNotification('success', 'Toutes les données ont été réinitialisées.');
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
