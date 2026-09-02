import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Filter,
  TrendingUp,
  TrendingDown,
  Compass,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sliders,
  Flame,
  Calendar,
  Globe,
  Award,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Calculator,
  Target,
  BarChart2,
} from 'lucide-react';
import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import {
  calculateMyEdgeDeepAudit,
  DimensionPerformance,
  SetupPairSessionCombo,
  EdgeScoreBreakdown,
} from '../lib/calculations/edge';
import { formatCurrency, formatRMultiple, formatPercent, formatDecimal } from '../lib/formatting';
import { TradeDetailModal } from './TradeDetailModal';

interface MyEdgeViewProps {
  trades?: Trade[];
  setups?: Setup[];
  currency?: string;
  onOpenSetupModal?: () => void;
  onOpenSetupsModal?: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

type EdgeTab = 'verdict' | 'combos' | 'setups' | 'pairs' | 'sessions' | 'directions';

export const MyEdgeView: React.FC<MyEdgeViewProps> = ({
  trades = [],
  setups = [],
  currency = 'EUR',
  onOpenSetupModal,
  onOpenSetupsModal,
  onSelectTrade,
}) => {
  const safeTrades = trades || [];
  const safeSetups = setups || [];
  const handleOpenSetups = onOpenSetupModal || onOpenSetupsModal || (() => {});

  // 6 Interactive Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedSetup, setSelectedSetup] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<EdgeTab>('verdict');

  // Edge Score Explainer Modal/Drawer
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<{
    title: string;
    breakdown: EdgeScoreBreakdown;
  } | null>(null);

  // Trade drill-down
  const [activeTradeDetail, setActiveTradeDetail] = useState<Trade | null>(null);
  const [drillDownCluster, setDrillDownCluster] = useState<{
    title: string;
    trades: Trade[];
  } | null>(null);

  // Available unique values for dropdowns
  const availableSymbols = useMemo(() => {
    const symbols = new Set<string>();
    safeTrades.forEach((t) => t?.symbol && symbols.add(t.symbol.toUpperCase().trim()));
    return Array.from(symbols).sort();
  }, [safeTrades]);

  const availableSetupsList = useMemo(() => {
    const set = new Set<string>();
    safeTrades.forEach((t) => {
      const s = t.setup?.trim() || t.setupId;
      if (s) set.add(s);
    });
    safeSetups.forEach((s) => s?.name && set.add(s.name));
    return Array.from(set).sort();
  }, [safeTrades, safeSetups]);

  // Dynamically filter trades according to all 6 criteria
  const filteredTrades = useMemo(() => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const EPSILON = 0.0001;

    return safeTrades.filter((t) => {
      if (!t) return false;
      const tradeTime = new Date(t.closedAt || t.openedAt).getTime();

      // 1. Period
      if (selectedPeriod === '7D' && now - tradeTime > 7 * oneDayMs) return false;
      if (selectedPeriod === '30D' && now - tradeTime > 30 * oneDayMs) return false;
      if (selectedPeriod === 'MONTH') {
        const d = new Date(tradeTime);
        const cur = new Date();
        if (d.getMonth() !== cur.getMonth() || d.getFullYear() !== cur.getFullYear()) return false;
      }
      if (selectedPeriod === 'YEAR') {
        const d = new Date(tradeTime);
        const cur = new Date();
        if (d.getFullYear() !== cur.getFullYear()) return false;
      }

      // 2. Pair / Symbol
      if (
        selectedSymbol !== 'ALL' &&
        (t.symbol || '').toUpperCase().trim() !== selectedSymbol
      ) {
        return false;
      }

      // 3. Setup
      if (selectedSetup !== 'ALL') {
        const s = t.setup?.trim() || t.setupId;
        if (s !== selectedSetup) return false;
      }

      // 4. Session
      if (selectedSession !== 'ALL') {
        const sess = (t.session || '').toUpperCase().trim();
        if (sess !== selectedSession) return false;
      }

      // 5. Direction
      if (selectedDirection !== 'ALL' && t.direction !== selectedDirection) return false;

      // 6. Result (WIN, LOSS, BREAKEVEN)
      if (selectedResult !== 'ALL') {
        const pnl = t.netPnL ?? 0;
        if (selectedResult === 'WIN' && pnl <= EPSILON) return false;
        if (selectedResult === 'LOSS' && pnl >= -EPSILON) return false;
        if (selectedResult === 'BREAKEVEN' && Math.abs(pnl) > EPSILON) return false;
      }

      return true;
    });
  }, [
    safeTrades,
    selectedPeriod,
    selectedSymbol,
    selectedSetup,
    selectedSession,
    selectedDirection,
    selectedResult,
  ]);

  // Run deep statistical edge audit
  const audit = useMemo(() => {
    return calculateMyEdgeDeepAudit(filteredTrades, safeSetups);
  }, [filteredTrades, safeSetups]);

  const {
    setups: setupStats,
    pairs: pairStats,
    sessions: sessionStats,
    directions: dirStats,
    combinations: comboStats,
    verdict,
  } = audit;

  // Open drill-down for any item
  const inspectClusterTrades = (title: string, filterFn: (t: Trade) => boolean) => {
    const matching = filteredTrades.filter(filterFn);
    setDrillDownCluster({ title, trades: matching });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 65) return 'text-[#FDBA74] bg-[#F97316]/10 border-[#F97316]/30';
    if (score >= 45) return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    if (score >= 25) return 'text-[#EA580C] bg-[#EA580C]/10 border-[#EA580C]/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-[#F5F5F5] font-sans select-none pb-12" id="view-my-edge">
      {/* 1. TOP HEADER & QUESTION MOTHER CARD */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] p-6 shadow-sm dark:shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#181C25] text-[#F97316] border border-slate-200 dark:border-[#292E38] shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
                  <span>My Edge</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-[#181C25] text-[#F97316] dark:text-[#FDBA74] border border-slate-200 dark:border-[#292E38] font-bold">
                    Basé sur vos {filteredTrades.length} trades réels
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#9299A8] font-normal mt-0.5">
                  Identification mathématique transparente des conditions de marché où votre rentabilité est statistiquement prouvée
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFormulaModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#181C25] hover:bg-slate-100 dark:hover:bg-[#292E38] text-slate-700 dark:text-[#F5F5F5] border border-slate-200 dark:border-[#292E38] text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-[#F97316]" />
              <span>Transparence Edge Score</span>
            </button>
            <button
              onClick={handleOpenSetups}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Gérer les Setups</span>
            </button>
          </div>
        </div>

        {/* Central Core Question & Key Takeaway Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-[#F97316] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#EA580C] dark:text-[#FDBA74] block">
                Verdict Stratégique — Dans quelles conditions votre stratégie fonctionne-t-elle le mieux ?
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-[#F5F5F5] mt-1">
                {verdict.keyTakeaway}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] text-center">
              <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Meilleure Paire</span>
              <span className="text-xs font-bold text-[#F97316]">
                {verdict.bestPair ? verdict.bestPair.label : 'N/A'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] text-center">
              <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Meilleure Session</span>
              <span className="text-xs font-bold text-[#EA580C] dark:text-[#FDBA74]">
                {verdict.bestSession ? verdict.bestSession.label : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC MULTI-DIMENSIONAL FILTERS BAR (6 FILTRES SYNCHRONISÉS) */}
      <div className="p-4 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#9299A8] mr-1">
          <Filter className="w-3.5 h-3.5 text-[#F97316]" />
          <span>Filtres Edge :</span>
        </div>

        {/* 1. Period */}
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Période : Toute</option>
          <option value="7D">7 derniers jours</option>
          <option value="30D">30 derniers jours</option>
          <option value="MONTH">Ce mois-ci</option>
          <option value="YEAR">Cette année</option>
        </select>

        {/* 2. Pair / Symbol */}
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Toutes les paires ({availableSymbols.length})</option>
          {availableSymbols.map((sym) => (
            <option key={sym} value={sym}>
              {sym}
            </option>
          ))}
        </select>

        {/* 3. Setup */}
        <select
          value={selectedSetup}
          onChange={(e) => setSelectedSetup(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Tous les setups ({availableSetupsList.length})</option>
          {availableSetupsList.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* 4. Session */}
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Toutes les sessions</option>
          <option value="LONDON">Londres (London)</option>
          <option value="NEW_YORK">New York</option>
          <option value="TOKYO">Tokyo / Asie</option>
          <option value="SYDNEY">Sydney</option>
        </select>

        {/* 5. Direction */}
        <select
          value={selectedDirection}
          onChange={(e) => setSelectedDirection(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Toutes directions (BUY &amp; SELL)</option>
          <option value="BUY">Achats uniquement (BUY)</option>
          <option value="SELL">Ventes uniquement (SELL)</option>
        </select>

        {/* 6. Result (WIN / LOSS / BE) */}
        <select
          value={selectedResult}
          onChange={(e) => setSelectedResult(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-slate-900 dark:text-[#F5F5F5] focus:ring-2 focus:ring-[#F97316] outline-none cursor-pointer"
        >
          <option value="ALL">Tous résultats (Gains, Pertes, BE)</option>
          <option value="WIN">Gagnants uniquement</option>
          <option value="LOSS">Perdants uniquement</option>
          <option value="BREAKEVEN">Breakeven uniquement</option>
        </select>

        {(selectedPeriod !== 'ALL' ||
          selectedSession !== 'ALL' ||
          selectedDirection !== 'ALL' ||
          selectedSymbol !== 'ALL' ||
          selectedSetup !== 'ALL' ||
          selectedResult !== 'ALL') && (
          <button
            onClick={() => {
              setSelectedPeriod('ALL');
              setSelectedSession('ALL');
              setSelectedDirection('ALL');
              setSelectedSymbol('ALL');
              setSelectedSetup('ALL');
              setSelectedResult('ALL');
            }}
            className="text-xs text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline ml-auto font-semibold cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* 3. SAMPLE SIZE WARNING & STATISTICAL METHODOLOGY BANNER */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-[#9299A8] leading-relaxed">
          <strong className="text-slate-900 dark:text-[#F5F5F5] font-semibold">Méthodologie Statistique &amp; Edge Score : </strong>
          L&apos;Edge Score (sur 100) est calculé selon 4 piliers mathématiques stricts : <strong>Espérance R</strong> (30 pts), <strong>Profit Factor</strong> (25 pts), <strong>Efficience Win Rate / RR</strong> (25 pts) et <strong>Robustesse de l&apos;échantillon</strong> (20 pts). Un échantillon inférieur à 5 trades est pénalisé pour éviter tout faux positif.
        </div>
      </div>

      {/* 4. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#292E38] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verdict')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'verdict'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Synthèse &amp; Verdict</span>
        </button>

        <button
          onClick={() => setActiveTab('combos')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'combos'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Combinaisons Setup × Paire × Session</span>
        </button>

        <button
          onClick={() => setActiveTab('setups')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'setups'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Par Setup ({setupStats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pairs')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pairs'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Par Paire ({pairStats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Par Session / Killzone</span>
        </button>

        <button
          onClick={() => setActiveTab('directions')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'directions'
              ? 'bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-[#F97316]/40 shadow-xs'
              : 'text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Buy vs Sell</span>
        </button>
      </div>

      {/* 5. TAB 1: SYNTHÈSE & VERDICT EXÉCUTIF */}
      {activeTab === 'verdict' && (
        <div className="space-y-6">
          {/* Top 4 Performance Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: BEST SETUP */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-[#9299A8] font-medium">Meilleur Setup</span>
                  {verdict.bestSetup && (
                    <button
                      onClick={() =>
                        setSelectedScoreBreakdown({
                          title: verdict.bestSetup!.label,
                          breakdown: verdict.bestSetup!.edgeScore,
                        })
                      }
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${getScoreColor(
                        verdict.bestSetup.edgeScore.totalScore
                      )}`}
                    >
                      Score : {verdict.bestSetup.edgeScore.totalScore}/100
                    </button>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5] truncate">
                  {verdict.bestSetup ? verdict.bestSetup.label : 'Données insuffisantes'}
                </div>
              </div>

              {verdict.bestSetup && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#292E38] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Win Rate :</span>
                    <span className="font-bold text-[#F97316]">{verdict.bestSetup.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Net :</span>
                    <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">
                      +{formatCurrency(verdict.bestSetup.totalNetPnL, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Expectancy :</span>
                    <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                      +{formatCurrency(verdict.bestSetup.monetaryExpectancy, currency)}/trade
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: MEILLEURE PAIRE */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-[#9299A8] font-medium">Meilleure Paire</span>
                  {verdict.bestPair && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-slate-200 dark:border-[#292E38]">
                      n = {verdict.bestPair.sampleSize}
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
                  {verdict.bestPair ? verdict.bestPair.label : 'N/A'}
                </div>
              </div>

              {verdict.bestPair && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#292E38] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Win Rate :</span>
                    <span className="font-bold text-[#F97316]">{verdict.bestPair.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Net :</span>
                    <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">
                      +{formatCurrency(verdict.bestPair.totalNetPnL, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Profit Factor :</span>
                    <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                      {verdict.bestPair.profitFactor ? verdict.bestPair.profitFactor.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: MEILLEURE SESSION */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-[#9299A8] font-medium">Meilleure Session</span>
                  {verdict.bestSession && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#181C25] text-[#EA580C] dark:text-[#FDBA74] border border-slate-200 dark:border-[#292E38]">
                      n = {verdict.bestSession.sampleSize}
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
                  {verdict.bestSession ? verdict.bestSession.label : 'N/A'}
                </div>
              </div>

              {verdict.bestSession && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#292E38] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Win Rate :</span>
                    <span className="font-bold text-[#F97316]">{verdict.bestSession.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Net :</span>
                    <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">
                      +{formatCurrency(verdict.bestSession.totalNetPnL, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Gains bruts :</span>
                    <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                      +{formatCurrency(verdict.bestSession.grossProfit, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 4: BUY VS SELL VERDICT */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-[#9299A8] block mb-1.5">Biais Directionnel</span>
                <div className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
                  {verdict.buyPerformance && verdict.sellPerformance
                    ? verdict.buyPerformance.totalNetPnL >= verdict.sellPerformance.totalNetPnL
                      ? 'BUY (Achats dominants)'
                      : 'SELL (Ventes dominantes)'
                    : 'Équilibré'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#292E38] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">BUY :</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                    {verdict.buyPerformance?.winRate}% WR ({verdict.buyPerformance?.sampleSize} tr.)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">SELL :</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                    {verdict.sellPerformance?.winRate}% WR ({verdict.sellPerformance?.sampleSize} tr.)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Diff :</span>
                  <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">
                    {formatCurrency(
                      (verdict.buyPerformance?.totalNetPnL || 0) -
                        (verdict.sellPerformance?.totalNetPnL || 0),
                      currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recurring Conditions of Performance Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <span>Conditions Récurrentes de Performance</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {verdict.recurringConditions.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-900 dark:text-[#F5F5F5] font-medium leading-relaxed">{cond}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Combinations Table Preview */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                  Top Combinaisons Gagnantes (Setup × Paire × Session)
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9299A8] font-normal">
                  Identifiez exactement la confluence multi-facteurs la plus rentable et son Edge Score transparent
                </p>
              </div>
              <button
                onClick={() => setActiveTab('combos')}
                className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline cursor-pointer"
              >
                Voir toutes les combinaisons →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-[#9299A8] uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Combinaison</th>
                    <th className="pb-3 font-semibold text-center">Échantillon (n)</th>
                    <th className="pb-3 font-semibold text-center">Win Rate</th>
                    <th className="pb-3 font-semibold text-right">P&amp;L Net</th>
                    <th className="pb-3 font-semibold text-right">Total R</th>
                    <th className="pb-3 font-semibold text-center">Edge Score</th>
                    <th className="pb-3 font-semibold text-center">Fiabilité</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#292E38]/60">
                  {comboStats.slice(0, 5).map((combo, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#181C25]/60 transition">
                      <td className="py-3 font-semibold text-slate-900 dark:text-[#F5F5F5]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-slate-200 dark:border-[#292E38] font-bold">
                            {combo.pair}
                          </span>
                          <span className="text-slate-400 dark:text-[#9299A8]">+</span>
                          <span className="text-slate-900 dark:text-[#F5F5F5]">{combo.session}</span>
                          <span className="text-slate-400 dark:text-[#9299A8]">+</span>
                          <span className="text-[#EA580C] dark:text-[#FDBA74]">{combo.setup}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center font-bold tabular-nums text-slate-900 dark:text-[#F5F5F5]">
                        {combo.sampleSize} trades
                      </td>
                      <td className="py-3 text-center font-bold tabular-nums text-[#F97316]">
                        {combo.winRate}%
                      </td>
                      <td
                        className={`py-3 text-right font-bold tabular-nums ${
                          combo.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {combo.totalNetPnL >= 0 ? '+' : ''}
                        {formatCurrency(combo.totalNetPnL, currency)}
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums text-slate-900 dark:text-[#F5F5F5]">
                        {combo.totalR !== null ? `${combo.totalR > 0 ? '+' : ''}${combo.totalR}R` : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() =>
                            setSelectedScoreBreakdown({
                              title: `${combo.pair} + ${combo.session} + ${combo.setup}`,
                              breakdown: combo.edgeScore,
                            })
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${getScoreColor(
                            combo.edgeScore.totalScore
                          )}`}
                        >
                          {combo.edgeScore.totalScore}/100
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            combo.confidenceTier === 'CONFIRMED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : combo.confidenceTier === 'DEVELOPING'
                              ? 'bg-[#F59E0B]/10 text-amber-700 dark:text-[#F59E0B] border border-[#F59E0B]/30'
                              : 'bg-slate-100 dark:bg-[#181C25] text-slate-500 dark:text-[#9299A8] border border-slate-200 dark:border-[#292E38]'
                          }`}
                        >
                          {combo.confidenceTier === 'CONFIRMED'
                            ? 'Confirmé'
                            : combo.confidenceTier === 'DEVELOPING'
                            ? 'Développement'
                            : 'Échantillon faible'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() =>
                            inspectClusterTrades(
                              `${combo.pair} + ${combo.session} + ${combo.setup}`,
                              (t) =>
                                (t.symbol || '').toUpperCase().trim() === combo.pair &&
                                (t.session || 'Toutes') === combo.session &&
                                (t.setup?.trim() || t.setupId || 'Général') === combo.setup
                            )
                          }
                          className="text-xs text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline font-bold cursor-pointer"
                        >
                          Inspecter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: COMBINAISONS DÉTAILLÉES (SETUP × PAIRE × SESSION) */}
      {activeTab === 'combos' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                Toutes les Combinaisons Détectées ({comboStats.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9299A8] font-normal">
                Échantillon complet classé par rentabilité nette avec Edge Score explicable
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-[#9299A8] uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Paire</th>
                  <th className="pb-3 font-semibold">Session</th>
                  <th className="pb-3 font-semibold">Setup</th>
                  <th className="pb-3 font-semibold text-center">Trades (n)</th>
                  <th className="pb-3 font-semibold text-center">Win Rate</th>
                  <th className="pb-3 font-semibold text-right">P&amp;L Net</th>
                  <th className="pb-3 font-semibold text-right">Total R</th>
                  <th className="pb-3 font-semibold text-center">Edge Score</th>
                  <th className="pb-3 font-semibold text-center">Statut Échantillon</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#292E38]/60">
                {comboStats.map((combo, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#181C25]/60 transition">
                    <td className="py-3 font-bold text-[#F97316]">{combo.pair}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-[#F5F5F5]">{combo.session}</td>
                    <td className="py-3 font-semibold text-[#EA580C] dark:text-[#FDBA74]">{combo.setup}</td>
                    <td className="py-3 text-center font-bold tabular-nums text-slate-900 dark:text-[#F5F5F5]">
                      {combo.sampleSize}
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-[#F97316]">
                      {combo.winRate}%
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${
                        combo.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {combo.totalNetPnL >= 0 ? '+' : ''}
                      {formatCurrency(combo.totalNetPnL, currency)}
                    </td>
                    <td className="py-3 text-right font-bold tabular-nums text-slate-900 dark:text-[#F5F5F5]">
                      {combo.totalR !== null ? `${combo.totalR > 0 ? '+' : ''}${combo.totalR}R` : '—'}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() =>
                          setSelectedScoreBreakdown({
                            title: `${combo.pair} + ${combo.session} + ${combo.setup}`,
                            breakdown: combo.edgeScore,
                          })
                        }
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${getScoreColor(
                          combo.edgeScore.totalScore
                        )}`}
                      >
                        {combo.edgeScore.totalScore}/100
                      </button>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          combo.confidenceTier === 'CONFIRMED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : combo.confidenceTier === 'DEVELOPING'
                            ? 'bg-[#F59E0B]/10 text-amber-700 dark:text-[#F59E0B] border border-[#F59E0B]/30'
                            : 'bg-slate-100 dark:bg-[#181C25] text-slate-500 dark:text-[#9299A8] border border-slate-200 dark:border-[#292E38]'
                        }`}
                      >
                        {combo.confidenceTier === 'CONFIRMED'
                          ? 'Confirmé (≥15)'
                          : combo.confidenceTier === 'DEVELOPING'
                          ? 'Développement (5-14)'
                          : 'Faible (<5)'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          inspectClusterTrades(
                            `${combo.pair} + ${combo.session} + ${combo.setup}`,
                            (t) =>
                              (t.symbol || '').toUpperCase().trim() === combo.pair &&
                              (t.session || 'Toutes') === combo.session &&
                              (t.setup?.trim() || t.setupId || 'Général') === combo.setup
                          )
                        }
                        className="text-xs text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline font-bold cursor-pointer"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: ANALYSE PAR SETUP */}
      {activeTab === 'setups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setupStats.map((st) => (
            <div
              key={st.key}
              className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#9299A8]">
                    {st.category || 'Setup'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedScoreBreakdown({
                          title: st.label,
                          breakdown: st.edgeScore,
                        })
                      }
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${getScoreColor(
                        st.edgeScore.totalScore
                      )}`}
                    >
                      Edge Score : {st.edgeScore.totalScore}/100
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        st.confidenceTier === 'CONFIRMED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : st.confidenceTier === 'DEVELOPING'
                          ? 'bg-[#F59E0B]/10 text-amber-700 dark:text-[#F59E0B] border border-[#F59E0B]/30'
                          : 'bg-slate-100 dark:bg-[#181C25] text-slate-500 dark:text-[#9299A8] border border-slate-200 dark:border-[#292E38]'
                      }`}
                    >
                      n = {st.sampleSize}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">{st.label}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-[#292E38] text-center">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Win Rate</span>
                  <span className="text-sm font-bold text-[#F97316]">{st.winRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Profit Factor</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-[#F5F5F5]">
                    {st.profitFactor ? st.profitFactor.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Expectancy</span>
                  <span className="text-sm font-bold text-[#EA580C] dark:text-[#FDBA74]">
                    {st.rExpectancy !== null
                      ? `${st.rExpectancy > 0 ? '+' : ''}${st.rExpectancy}R`
                      : formatCurrency(st.monetaryExpectancy, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Net :</span>
                  <span
                    className={`font-bold tabular-nums ${
                      st.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {st.totalNetPnL >= 0 ? '+' : ''}
                    {formatCurrency(st.totalNetPnL, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Total R réalisé :</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                    {st.totalR !== null ? `${st.totalR > 0 ? '+' : ''}${st.totalR}R` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Gains / Pertes :</span>
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-medium">
                    {st.wins}W / {st.losses}L ({st.breakevens} BE)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#292E38] flex items-center justify-between">
                <button
                  onClick={() =>
                    setSelectedScoreBreakdown({
                      title: st.label,
                      breakdown: st.edgeScore,
                    })
                  }
                  className="text-[11px] text-slate-500 dark:text-[#9299A8] hover:text-[#F97316] font-medium cursor-pointer"
                >
                  Pourquoi ce score ? →
                </button>
                <button
                  onClick={() =>
                    inspectClusterTrades(st.label, (t) => {
                      const s = t.setup?.trim() || t.setupId || 'Non défini / Général';
                      return s === st.key || s === st.label;
                    })
                  }
                  className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline cursor-pointer"
                >
                  Voir trades
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. TAB 4: ANALYSE PAR PAIRE */}
      {activeTab === 'pairs' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
            Classement de Performance par Paire / Actif ({pairStats.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-[#9299A8] uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Symbole</th>
                  <th className="pb-3 font-semibold text-center">Trades (n)</th>
                  <th className="pb-3 font-semibold text-center">Win Rate</th>
                  <th className="pb-3 font-semibold text-right">P&amp;L Net</th>
                  <th className="pb-3 font-semibold text-right">Gains Bruts</th>
                  <th className="pb-3 font-semibold text-right">Pertes Brutes</th>
                  <th className="pb-3 font-semibold text-center">Profit Factor</th>
                  <th className="pb-3 font-semibold text-right">Gain Moyen</th>
                  <th className="pb-3 font-semibold text-right">Perte Moyenne</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#292E38]/60">
                {pairStats.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50 dark:hover:bg-[#181C25]/60 transition">
                    <td className="py-3 font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#181C25] text-[#F97316] border border-slate-200 dark:border-[#292E38] font-bold">
                        {p.label}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-slate-900 dark:text-[#F5F5F5]">
                      {p.sampleSize}
                    </td>
                    <td className="py-3 text-center font-bold tabular-nums text-[#F97316]">
                      {p.winRate}%
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${
                        p.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {p.totalNetPnL >= 0 ? '+' : ''}
                      {formatCurrency(p.totalNetPnL, currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatCurrency(p.grossProfit, currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatCurrency(p.grossLoss, currency)}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-900 dark:text-[#F5F5F5] tabular-nums">
                      {p.profitFactor ? p.profitFactor.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 text-right text-slate-900 dark:text-[#F5F5F5] tabular-nums">
                      +{formatCurrency(p.avgWin, currency)}
                    </td>
                    <td className="py-3 text-right text-slate-500 dark:text-[#9299A8] tabular-nums">
                      -{formatCurrency(p.avgLoss, currency)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          inspectClusterTrades(
                            p.label,
                            (t) => (t.symbol || '').toUpperCase().trim() === p.key
                          )
                        }
                        className="text-xs text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline font-bold cursor-pointer"
                      >
                        Inspecter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. TAB 5: ANALYSE PAR SESSION / KILLZONE */}
      {activeTab === 'sessions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
            Performance par Session &amp; Killzone ({sessionStats.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessionStats.map((s) => (
              <div
                key={s.key}
                className="p-5 rounded-3xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-[#9299A8] font-medium">Session</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-[#12151D] text-[#EA580C] dark:text-[#FDBA74] border border-slate-200 dark:border-[#292E38]">
                      n = {s.sampleSize}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">{s.label}</h3>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Win Rate :</span>
                    <span className="font-bold text-[#F97316]">{s.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Net :</span>
                    <span
                      className={`font-bold tabular-nums ${
                        s.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {s.totalNetPnL >= 0 ? '+' : ''}
                      {formatCurrency(s.totalNetPnL, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Profit Factor :</span>
                    <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                      {s.profitFactor ? s.profitFactor.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-[#9299A8]">Répartition :</span>
                    <span className="text-slate-900 dark:text-[#F5F5F5] font-medium">
                      {s.wins}W / {s.losses}L
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-[#292E38] flex justify-end">
                  <button
                    onClick={() =>
                      inspectClusterTrades(s.label, (t) => {
                        let sess = (t.session || 'AUTRE').toUpperCase().trim();
                        if (sess === 'LONDON' || sess === 'LONDRES') sess = 'Londres (London)';
                        else if (sess === 'NEW_YORK' || sess === 'NEW YORK' || sess === 'NY')
                          sess = 'New York';
                        else if (sess === 'TOKYO' || sess === 'ASIE' || sess === 'ASIA')
                          sess = 'Tokyo (Asie)';
                        else if (sess === 'SYDNEY') sess = 'Sydney';
                        else sess = t.session || 'Standard / Non spécifié';
                        return sess === s.key;
                      })
                    }
                    className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline cursor-pointer"
                  >
                    Voir trades
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. TAB 6: BUY VS SELL */}
      {activeTab === 'directions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dirStats.map((d) => (
            <div
              key={d.key}
              className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      d.key === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {d.key}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5]">{d.label}</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-[#9299A8] font-medium">
                  {d.sampleSize} trades enregistrés
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-100 dark:border-[#292E38] text-center">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Win Rate</span>
                  <span className="text-lg font-bold text-[#F97316]">{d.winRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">Profit Factor</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
                    {d.profitFactor ? d.profitFactor.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-[#9299A8] block font-normal">P&amp;L Net</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      d.totalNetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {d.totalNetPnL >= 0 ? '+' : ''}
                    {formatCurrency(d.totalNetPnL, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Total Gains bruts :</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(d.grossProfit, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Total Pertes brutes :</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    -{formatCurrency(d.grossLoss, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Moyenne par trade :</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F5F5F5]">
                    {formatCurrency(d.avgReturn, currency)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#292E38] flex justify-end">
                <button
                  onClick={() =>
                    inspectClusterTrades(
                      d.label,
                      (t) => (t.direction === 'SELL' ? 'SELL' : 'BUY') === d.key
                    )
                  }
                  className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline cursor-pointer"
                >
                  Inspecter les trades {d.key}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 11. TRANSPARENT EDGE SCORE FORMULA MODAL */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#292E38] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">Transparence de l&apos;Edge Score</h3>
                  <p className="text-xs text-slate-500 dark:text-[#9299A8]">
                    Calcul mathématique objectif sur 100 points, sans algorithme arbitraire
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#9299A8] dark:hover:text-[#F5F5F5] text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800 dark:text-[#F5F5F5]">
              <p className="leading-relaxed text-slate-600 dark:text-[#9299A8]">
                L&apos;Edge Score quantifie la qualité réelle d&apos;un setup ou d&apos;une condition de marché en combinant 4 piliers mathématiques fondamentaux :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">1. Espérance Mathématique (Expectancy)</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F97316]/10 text-[#EA580C] dark:text-[#FDBA74] border border-[#F97316]/30 font-bold">30 pts</span>
                  </div>
                  <p className="text-slate-500 dark:text-[#9299A8] text-[11px]">
                    Mesure le gain net moyen par unité de risque (R) ou en devise sur le long terme (E &gt; 0.5R pour le score maximal).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">2. Facteur de Profit (Profit Factor)</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F97316]/10 text-[#EA580C] dark:text-[#FDBA74] border border-[#F97316]/30 font-bold">25 pts</span>
                  </div>
                  <p className="text-slate-500 dark:text-[#9299A8] text-[11px]">
                    Ratio exact Gains bruts / Pertes brutes. Score maximal si PF &ge; 2.50, nul si PF &lt; 1.0.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">3. Efficience Win Rate × R/R</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F97316]/10 text-[#EA580C] dark:text-[#FDBA74] border border-[#F97316]/30 font-bold">25 pts</span>
                  </div>
                  <p className="text-slate-500 dark:text-[#9299A8] text-[11px]">
                    Compare le Win Rate effectif au seuil neutre de rentabilité (100 / (1 + RR)).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">4. Robustesse Statistique (Sample Size)</span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#F97316]/10 text-[#EA580C] dark:text-[#FDBA74] border border-[#F97316]/30 font-bold">20 pts</span>
                  </div>
                  <p className="text-slate-500 dark:text-[#9299A8] text-[11px]">
                    Pénalise les séries courtes (n &lt; 5 trades = max 3 pts) pour éviter de confondre chance ponctuelle et réel avantage.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#292E38] flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. INDIVIDUAL SCORE BREAKDOWN POPUP */}
      {selectedScoreBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#292E38] pb-4">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-[#9299A8] uppercase font-semibold">
                  Décomposition de l&apos;Edge Score
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#F5F5F5]">
                  {selectedScoreBreakdown.title}
                </h3>
              </div>
              <div
                className={`px-3 py-1 rounded-xl text-sm font-bold border ${getScoreColor(
                  selectedScoreBreakdown.breakdown.totalScore
                )}`}
              >
                {selectedScoreBreakdown.breakdown.totalScore} / 100 · {selectedScoreBreakdown.breakdown.ratingLabel}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-semibold">1. Espérance Mathématique (Expectancy) :</span>
                  <span className="font-bold text-[#F97316]">
                    {selectedScoreBreakdown.breakdown.expectancyPoints} / 30 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#12151D] h-1.5 rounded-full overflow-hidden border border-slate-300 dark:border-[#292E38]">
                  <div
                    className="bg-[#F97316] h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.expectancyPoints / 30) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-semibold">2. Facteur de Profit (Profit Factor) :</span>
                  <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">
                    {selectedScoreBreakdown.breakdown.profitFactorPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#12151D] h-1.5 rounded-full overflow-hidden border border-slate-300 dark:border-[#292E38]">
                  <div
                    className="bg-[#EA580C] dark:bg-[#FDBA74] h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.profitFactorPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-semibold">3. Efficience Win Rate / RR :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedScoreBreakdown.breakdown.winRateEfficiencyPoints} / 25 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#12151D] h-1.5 rounded-full overflow-hidden border border-slate-300 dark:border-[#292E38]">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.winRateEfficiencyPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-semibold">4. Fiabilité Statistique (Sample Size) :</span>
                  <span className="font-bold text-amber-600 dark:text-[#F59E0B]">
                    {selectedScoreBreakdown.breakdown.sampleConfidencePoints} / 20 pts
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#12151D] h-1.5 rounded-full overflow-hidden border border-slate-300 dark:border-[#292E38]">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${(selectedScoreBreakdown.breakdown.sampleConfidencePoints / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Explanations list */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#9299A8]">Justifications mathématiques :</span>
              <ul className="space-y-1 text-xs text-slate-800 dark:text-[#F5F5F5]">
                {selectedScoreBreakdown.breakdown.explanations.map((exp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#F97316] font-bold">•</span>
                    <span>{exp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-[#292E38] flex justify-end">
              <button
                onClick={() => setSelectedScoreBreakdown(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#181C25] dark:hover:bg-[#292E38] text-slate-900 dark:text-[#F5F5F5] border border-slate-200 dark:border-[#292E38] rounded-2xl text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. DRILL-DOWN MODAL / TABLE OVERLAY */}
      {drillDownCluster && (
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                Trades Loggés — &quot;{drillDownCluster.title}&quot; ({drillDownCluster.trades.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9299A8] font-normal">
                Inspection individuelle des positions réelles
              </p>
            </div>
            <button
              onClick={() => setDrillDownCluster(null)}
              className="text-xs text-slate-500 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5] font-semibold cursor-pointer"
            >
              Fermer l&apos;inspection ✕
            </button>
          </div>

          {drillDownCluster.trades.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-[#9299A8]">
              Aucun trade correspondant dans la sélection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#292E38] text-slate-500 dark:text-[#9299A8] uppercase text-[10px] tracking-wider">
                    <th className="pb-2.5 font-semibold">Symbole</th>
                    <th className="pb-2.5 font-semibold">Sens</th>
                    <th className="pb-2.5 font-semibold">Session</th>
                    <th className="pb-2.5 font-semibold">Date Clôture</th>
                    <th className="pb-2.5 font-semibold text-right">P&amp;L Net</th>
                    <th className="pb-2.5 font-semibold text-right">R-Multiple</th>
                    <th className="pb-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#292E38]/60">
                  {drillDownCluster.trades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#181C25]/60 transition">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-[#F5F5F5]">{t.symbol}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            t.direction === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-900 dark:text-[#F5F5F5] font-medium">{t.session || '—'}</td>
                      <td className="py-2.5 text-slate-500 dark:text-[#9299A8] tabular-nums">
                        {t.closedAt ? new Date(t.closedAt).toLocaleDateString('fr-FR') : 'Ouvert'}
                      </td>
                      <td
                        className={`py-2.5 text-right tabular-nums font-bold ${
                          (t.netPnL ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {(t.netPnL ?? 0) >= 0 ? '+' : ''}
                        {formatCurrency(t.netPnL ?? 0, currency)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-semibold text-slate-900 dark:text-[#F5F5F5]">
                        {t.rMultiple !== null && t.rMultiple !== undefined
                          ? `${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple.toFixed(2)}R`
                          : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => {
                            if (onSelectTrade) onSelectTrade(t);
                            setActiveTradeDetail(t);
                          }}
                          className="text-xs text-[#F97316] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:underline font-bold cursor-pointer"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 14. TRADE DETAIL MODAL */}
      {activeTradeDetail && (
        <TradeDetailModal
          trade={activeTradeDetail}
          currency={currency}
          onClose={() => setActiveTradeDetail(null)}
        />
      )}
    </div>
  );
};
