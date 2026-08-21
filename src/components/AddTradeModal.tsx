import React, { useState, useEffect } from 'react';
import { Trade, UserAppSettings, TradeSide } from '../types';
import { getThemeClasses } from '../utils/theme';
import { X, Plus, Calculator, Compass } from 'lucide-react';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Trade) => void;
  settings: UserAppSettings;
}

export const PRESET_SETUPS = [
  'FVG',
  'CRT',
  'FVG dans FVG',
  'Orderblock',
  'IFVG',
  'GAP',
  'Inverted GAP',
  'VI',
  'Autre',
];

export const SESSIONS_LIST = [
  'London',
  'New York',
  'Asia',
  'London Close',
  'Hors Kill Zone',
];

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  settings,
}) => {
  if (!isOpen) return null;

  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [time, setTime] = useState('09:30');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [side, setSide] = useState<TradeSide>('BUY');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lotSize, setLotSize] = useState('1.0');
  const [netPnL, setNetPnL] = useState('');
  const [commission, setCommission] = useState('');
  const [swap, setSwap] = useState('');
  const [rMultiple, setRMultiple] = useState('');
  const [killzone, setKillzone] = useState('London');
  const [selectedSetupPreset, setSelectedSetupPreset] = useState('FVG');
  const [customSetup, setCustomSetup] = useState('');
  const [confluenceDxy, setConfluenceDxy] = useState<boolean>(true);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [preTradePlan, setPreTradePlan] = useState('');
  const [postTradeReview, setPostTradeReview] = useState('');

  // Auto calculate R Multiple when entry, SL, lotSize, and netPnL are available
  useEffect(() => {
    if (entry && stopLoss && netPnL) {
      const eVal = parseFloat(entry);
      const slVal = parseFloat(stopLoss);
      const pnlVal = parseFloat(netPnL);
      const lotVal = lotSize ? parseFloat(lotSize) : 1;

      if (!isNaN(eVal) && !isNaN(slVal) && !isNaN(pnlVal)) {
        const slDistance = Math.abs(eVal - slVal);
        if (slDistance > 0) {
          const riskDollars = slDistance * (lotVal > 0 ? lotVal : 1);
          if (riskDollars > 0) {
            const calculatedR = (pnlVal / riskDollars).toFixed(2);
            setRMultiple(calculatedR);
          }
        }
      }
    }
  }, [entry, stopLoss, lotSize, netPnL]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol || !date || netPnL === '') {
      alert('Veuillez remplir au moins la Date, le Symbole et le PnL Net.');
      return;
    }

    const pnlVal = parseFloat(netPnL);
    const parsedEntry = entry !== '' ? parseFloat(entry) : undefined;
    const parsedExit = exit !== '' ? parseFloat(exit) : undefined;
    const parsedSL = stopLoss !== '' ? parseFloat(stopLoss) : undefined;
    const parsedTP = takeProfit !== '' ? parseFloat(takeProfit) : undefined;
    const parsedLot = lotSize !== '' ? parseFloat(lotSize) : undefined;
    const parsedComm = commission !== '' ? parseFloat(commission) : undefined;
    const parsedSwap = swap !== '' ? parseFloat(swap) : undefined;
    
    // Determine R multiple:
    let parsedR = rMultiple !== '' ? parseFloat(rMultiple) : undefined;
    if (parsedR === undefined && parsedEntry !== undefined && parsedSL !== undefined) {
      const slDist = Math.abs(parsedEntry - parsedSL);
      const risk = slDist * (parsedLot || 1);
      if (risk > 0) {
        parsedR = Number((pnlVal / risk).toFixed(2));
      }
    }

    const finalSetup = selectedSetupPreset === 'Autre' ? (customSetup.trim() || 'Autre') : selectedSetupPreset;

    const tagList = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const newTrade: Trade = {
      id: `manual-${Date.now()}`,
      date,
      time: time || undefined,
      symbol: symbol.toUpperCase().trim(),
      side,
      entry: parsedEntry,
      exit: parsedExit,
      stopLoss: parsedSL,
      takeProfit: parsedTP,
      lotSize: parsedLot,
      commission: parsedComm,
      swap: parsedSwap,
      netPnL: pnlVal,
      rMultiple: parsedR,
      confluenceDxy,
      outcome: pnlVal > 0 ? 'Win' : pnlVal < 0 ? 'Loss' : 'BE',
      killzone: killzone || undefined,
      setup: finalSetup || undefined,
      tags: tagList.length > 0 ? tagList : undefined,
      notes: notes || undefined,
      preTradePlan: preTradePlan || undefined,
      postTradeReview: postTradeReview || undefined,
      source: 'Manual Entry',
      createdAt: new Date().toISOString(),
    };

    onSaveTrade(newTrade);
    onClose();
  };

  const inputClass = `w-full border rounded-xl px-3 py-2 text-xs outline-hidden transition-colors ${
    isLight 
      ? 'bg-slate-50 border-slate-200 focus:border-violet-500 text-slate-900 placeholder-slate-400' 
      : 'bg-[#0E131A] border-[#252E38] focus:border-[#f75605] text-[#E8EDF2] placeholder-[#8B96A3]'
  }`;

  const calculatedRiskAmount = (entry && stopLoss) 
    ? (Math.abs(parseFloat(entry) - parseFloat(stopLoss)) * (lotSize ? parseFloat(lotSize) : 1))
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150 font-sans">
      <div className={`rounded-t-2xl md:rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl relative max-h-[88vh] md:max-h-[90vh] overflow-y-auto border ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#121820] border-[#252E38] text-[#E8EDF2]'
      }`}>
        <button
          onClick={onClose}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors cursor-pointer absolute top-4 right-4 ${theme.badgeNeutral}`}
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className={`text-base font-bold tracking-tight flex items-center gap-1.5 ${theme.textPrimary}`}>
            <Plus className="w-4 h-4 text-slate-400" />
            <span>Ajouter un Trade Manuel</span>
          </h3>
          <p className={`text-xs mt-0.5 ${theme.textMuted}`}>
            Saisie rapide avec calcul de multiple R et confluences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Date, Time, Symbol, Side */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={theme.label}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={theme.label}>Heure</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={theme.label}>Symbole *</label>
              <input
                type="text"
                placeholder="EURUSD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className={`${inputClass} uppercase font-mono font-semibold`}
              />
            </div>

            <div>
              <label className={theme.label}>Sens *</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as TradeSide)}
                className={`${inputClass} font-semibold`}
              >
                <option value="BUY">BUY (Long)</option>
                <option value="SELL">SELL (Short)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Entry, Exit, SL, TP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={theme.label}>Prix Entrée</label>
              <input
                type="number"
                step="any"
                placeholder="1.0850"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className={theme.label}>Prix Sortie</label>
              <input
                type="number"
                step="any"
                placeholder="1.0895"
                value={exit}
                onChange={(e) => setExit(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className={theme.label}>Stop Loss</label>
              <input
                type="number"
                step="any"
                placeholder="1.0830"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className={theme.label}>Take Profit</label>
              <input
                type="number"
                step="any"
                placeholder="1.0910"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {/* Row 3: Net PnL, Lot Size, R Multiple, Killzone */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className={theme.label}>PnL Net ({settings.currencySymbol}) *</label>
              <input
                type="number"
                step="any"
                placeholder="+75.00"
                value={netPnL}
                onChange={(e) => setNetPnL(e.target.value)}
                required
                className={`${inputClass} font-mono font-bold`}
              />
            </div>

            <div>
              <label className={theme.label}>Lots</label>
              <input
                type="number"
                step="any"
                placeholder="1.0"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className={theme.label}>Multiple R</label>
              <input
                type="number"
                step="any"
                placeholder="2.5"
                value={rMultiple}
                onChange={(e) => setRMultiple(e.target.value)}
                className={`${inputClass} font-mono font-bold`}
              />
            </div>

            <div>
              <label className={theme.label}>Session</label>
              <select
                value={killzone}
                onChange={(e) => setKillzone(e.target.value)}
                className={inputClass}
              >
                {SESSIONS_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculated Risk helper */}
          {calculatedRiskAmount !== null && !isNaN(calculatedRiskAmount) && calculatedRiskAmount > 0 && (
            <div className={`p-2 rounded-xl text-xs flex items-center justify-between border ${theme.innerBg}`}>
              <span className={`flex items-center gap-1.5 font-medium ${theme.textSecondary}`}>
                <Calculator className="w-3.5 h-3.5 text-slate-400" />
                Risque : <strong>{settings.currencySymbol}{calculatedRiskAmount.toFixed(2)}</strong>
              </span>
              {rMultiple && (
                <span className={`font-mono font-bold ${parseFloat(rMultiple) >= 0 ? theme.winText : theme.lossText}`}>
                  {parseFloat(rMultiple) >= 0 ? '+' : ''}{rMultiple}R
                </span>
              )}
            </div>
          )}

          {/* Row 4: Setup & Confluence DXY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={theme.label}>Setup *</label>
              <select
                value={selectedSetupPreset}
                onChange={(e) => setSelectedSetupPreset(e.target.value)}
                className={inputClass}
              >
                {PRESET_SETUPS.map((setupName) => (
                  <option key={setupName} value={setupName}>{setupName}</option>
                ))}
              </select>

              {selectedSetupPreset === 'Autre' && (
                <input
                  type="text"
                  placeholder="Nom du setup..."
                  value={customSetup}
                  onChange={(e) => setCustomSetup(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              )}
            </div>

            {/* Confluence DXY Selector */}
            <div>
              <label className={theme.label}>Confluence DXY</label>
              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={() => setConfluenceDxy(true)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    confluenceDxy ? theme.winBadge : theme.badgeNeutral
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>Oui (Aligné)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfluenceDxy(false)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    !confluenceDxy ? 'bg-slate-700/60 text-slate-200 border-slate-600' : theme.badgeNeutral
                  }`}
                >
                  <span>Non</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={theme.label}>Tags (séparés par des virgules)</label>
            <input
              type="text"
              placeholder="ex: Setup A+, HTF Key Level, SMT"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Journal Plans / Review */}
          <div className="space-y-2">
            <div>
              <label className={theme.label}>Plan Avant Trade</label>
              <textarea
                rows={2}
                placeholder="Sweep liquidité + MSS 5m..."
                value={preTradePlan}
                onChange={(e) => setPreTradePlan(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={theme.label}>Analyse Post-Trade</label>
              <textarea
                rows={2}
                placeholder="Exécution conforme au plan..."
                value={postTradeReview}
                onChange={(e) => setPostTradeReview(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-end gap-2 ${theme.tableBorder}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 font-medium text-xs rounded-xl border transition-colors cursor-pointer ${theme.badgeNeutral}`}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 font-semibold text-xs rounded-xl transition-all cursor-pointer btn-press ${theme.btnPrimary}`}
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
