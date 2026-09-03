import React, { useState } from 'react';
import { NewTradeInput, TradeDirection, TradeStatus, TradingKillzone, EmotionType, MistakeType } from '../types/trade';
import { normalizeSymbol, normalizeNumber } from '../lib/normalization';
import { useSetups } from '../hooks/useSetups';
import { X, Plus, AlertCircle, Layers } from 'lucide-react';

interface CreateTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trade: NewTradeInput) => Promise<void>;
}

export const CreateTradeModal: React.FC<CreateTradeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { setups } = useSetups();

  // Basic Details
  const [ticket, setTicket] = useState('');
  const [symbolRaw, setSymbolRaw] = useState('XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [status, setStatus] = useState<TradeStatus>('CLOSED');
  const [openedAt, setOpenedAt] = useState(() => new Date(Date.now() - 3600000).toISOString().slice(0, 16));
  const [closedAt, setClosedAt] = useState(() => new Date().toISOString().slice(0, 16));

  // Execution Quotes
  const [entryPrice, setEntryPrice] = useState('2420.00');
  const [exitPrice, setExitPrice] = useState('2438.00');
  const [stopLoss, setStopLoss] = useState('2412.00');
  const [takeProfit, setTakeProfit] = useState('2440.00');
  const [quantity, setQuantity] = useState('0.5');

  // Accounting & Risk
  const [grossPnL, setGrossPnL] = useState('900.00');
  const [commission, setCommission] = useState('-4.50');
  const [swap, setSwap] = useState('0.00');
  const [initialRiskAmount, setInitialRiskAmount] = useState('400.00');
  const [balanceBefore, setBalanceBefore] = useState('10000.00');

  // Metas & Setup Context
  const [session, setSession] = useState<TradingKillzone>('LONDON');
  const [timeframe, setTimeframe] = useState('M15');
  const [setupName, setSetupName] = useState('Golden FVG');
  const [setupId, setSetupId] = useState('setup-golden-fvg');

  // ICT / SMC
  const [htfBias, setHtfBias] = useState<'BULLISH' | 'BEARISH' | 'NEUTRAL'>('BULLISH');
  const [killzone, setKillzone] = useState<'LONDON_OPEN' | 'NY_AM' | 'NY_PM' | 'ASIA' | 'OFF_HOURS'>('LONDON_OPEN');
  const [liquidityTaken, setLiquidityTaken] = useState('Asian Low Sweep');
  const [irlErl, setIrlErl] = useState<'IRL_TO_ERL' | 'ERL_TO_IRL' | 'CONSOLIDATION'>('IRL_TO_ERL');
  const [mss, setMss] = useState(true);
  const [cisd, setCisd] = useState(true);
  const [displacement, setDisplacement] = useState(true);
  const [fvg, setFvg] = useState(true);
  const [ifvg, setIfvg] = useState(false);
  const [ob, setOb] = useState(false);

  // Psychology & Review
  const [notes, setNotes] = useState('Clean FVG tap following Asian low liquidity purge.');
  const [emotion, setEmotion] = useState<EmotionType>('DISCIPLINED');
  const [mistake, setMistake] = useState<MistakeType>('NONE');
  const [tags, setTags] = useState('Gold, FVG, LondonKillzone');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizedSymbol = normalizeSymbol(symbolRaw);

  const handleSetupSelect = (selectedId: string) => {
    setSetupId(selectedId);
    const found = setups.find((s) => s.id === selectedId);
    if (found) {
      setSetupName(found.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const openIso = new Date(openedAt).toISOString();
      const closeIso = status === 'CLOSED' && closedAt ? new Date(closedAt).toISOString() : null;

      const newTrade: NewTradeInput = {
        ticket: ticket.trim() || null,
        symbol: normalizedSymbol,
        direction,
        status,
        openedAt: openIso,
        closedAt: closeIso,
        timezone: 'UTC',

        entryPrice: normalizeNumber(entryPrice),
        exitPrice: status === 'CLOSED' ? normalizeNumber(exitPrice) : null,
        stopLoss: normalizeNumber(stopLoss),
        takeProfit: normalizeNumber(takeProfit),

        quantity: normalizeNumber(quantity),
        lotSize: normalizeNumber(quantity),
        contractSize: normalizedSymbol.includes('XAU') ? 100 : 100000,

        grossPnL: normalizeNumber(grossPnL),
        commission: normalizeNumber(commission),
        swap: normalizeNumber(swap),
        netPnL: null, // calculated in repository

        initialRiskAmount: normalizeNumber(initialRiskAmount),
        riskPercent: null,
        rMultiple: null,

        balanceBefore: normalizeNumber(balanceBefore),
        balanceAfter: null,

        session,
        timeframe: timeframe || null,
        setup: setupName.trim() || null,
        setupId: setupId || null,

        htfBias,
        killzone,
        liquidityTaken: liquidityTaken.trim() || null,
        irlErl,
        mss,
        cisd,
        displacement,
        fvg,
        ifvg,
        ob,

        notes: notes.trim() || null,
        emotion: emotion || 'NEUTRAL',
        mistake: mistake || 'NONE',

        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),

        screenshotBefore: null,
        screenshotAfter: null,
      };

      await onSubmit(newTrade);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      id="modal-create-trade"
    >
      <div className="bg-white dark:bg-[#101827] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Log New Execution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Record trade with setup context, execution mechanics, and financial risk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Core Instrument & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Symbol / Pair *
              </label>
              <input
                type="text"
                required
                value={symbolRaw}
                onChange={(e) => setSymbolRaw(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as TradeDirection)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="BUY">BUY (Long)</option>
                <option value="SELL">SELL (Short)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Position Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TradeStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="CLOSED">CLOSED</option>
                <option value="OPEN">OPEN (Running)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Ticket / Order #
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-normal"
              />
            </div>
          </div>

          {/* Section 2: Setup & SMC Context */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                Trading Setup &amp; SMC Context
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Setup Model *
                </label>
                <select
                  value={setupId}
                  onChange={(e) => handleSetupSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {setups.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Killzone Killzone
                </label>
                <select
                  value={killzone}
                  onChange={(e) => setKillzone(e.target.value as typeof killzone)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="LONDON_OPEN">London Open (07:00 - 10:00 UTC)</option>
                  <option value="NY_AM">New York AM (13:30 - 16:00 UTC)</option>
                  <option value="NY_PM">New York PM (18:00 - 20:00 UTC)</option>
                  <option value="ASIA">Asia / Tokyo (00:00 - 04:00 UTC)</option>
                  <option value="OFF_HOURS">Off Hours / Non-Killzone</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  HTF Narrative Bias
                </label>
                <select
                  value={htfBias}
                  onChange={(e) => setHtfBias(e.target.value as typeof htfBias)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="BULLISH">Bullish (HTF Discount Expansion)</option>
                  <option value="BEARISH">Bearish (HTF Premium Expansion)</option>
                  <option value="NEUTRAL">Neutral / Range</option>
                </select>
              </div>
            </div>

            {/* SMC Technical Checkboxes */}
            <div className="pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-2">
                Confluence Elements Validated:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { label: 'Displacement', val: displacement, set: setDisplacement },
                  { label: 'MSS', val: mss, set: setMss },
                  { label: 'CISD', val: cisd, set: setCisd },
                  { label: 'FVG', val: fvg, set: setFvg },
                  { label: 'IFVG', val: ifvg, set: setIfvg },
                  { label: 'Order Block', val: ob, set: setOb },
                ].map((item) => (
                  <label
                    key={item.label}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                      item.val
                        ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-normal'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={(e) => item.set(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Prices & Execution */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Entry Price *
              </label>
              <input
                type="text"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Exit Price
              </label>
              <input
                type="text"
                disabled={status === 'OPEN'}
                value={status === 'OPEN' ? '' : exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Stop Loss
              </label>
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Take Profit
              </label>
              <input
                type="text"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Position Size (Lots)
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>
          </div>

          {/* Section 4: Financials & Fees */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                Gross P&amp;L ($)
              </label>
              <input
                type="text"
                value={grossPnL}
                onChange={(e) => setGrossPnL(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                Commission ($)
              </label>
              <input
                type="text"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                Initial Risk Amount ($)
              </label>
              <input
                type="text"
                value={initialRiskAmount}
                onChange={(e) => setInitialRiskAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                Account Balance ($)
              </label>
              <input
                type="text"
                value={balanceBefore}
                onChange={(e) => setBalanceBefore(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 tabular-nums font-medium"
              />
            </div>
          </div>

          {/* Section 5: Psychology & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Emotional State
              </label>
              <select
                value={emotion || 'DISCIPLINED'}
                onChange={(e) => setEmotion(e.target.value as EmotionType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="DISCIPLINED">Disciplined / Patient</option>
                <option value="CONFIDENT">Confident</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="FOMO">FOMO</option>
                <option value="FEARFUL">Fearful / Hesitant</option>
                <option value="REVENGE">Revenge Trading</option>
                <option value="ANXIOUS">Anxious</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Rule Violation / Mistake
              </label>
              <select
                value={mistake || 'NONE'}
                onChange={(e) => setMistake(e.target.value as MistakeType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="NONE">None (Strict Execution)</option>
                <option value="FOMO">FOMO (Chased Entry)</option>
                <option value="EARLY_EXIT">Early Exit</option>
                <option value="OVERSIZED">Oversized Position</option>
                <option value="NO_STOP_LOSS">No Stop Loss Defined</option>
                <option value="MOVED_SL">Moved Stop Loss Further</option>
                <option value="RULE_VIOLATION">Plan / Rule Invalidation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Notes &amp; Qualitative Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record execution details, confluence notes, market conditions..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-normal"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving to Database...' : 'Save Trade Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

