import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trade, 
  PerformanceStats, 
  UserAppSettings, 
  MonthlyCoachSummary,
} from '../types';
import { 
  calculateTraderPerformanceScore,
  identifyYourEdgeFindings,
  identifyBiggestLeaks,
  calculateMonthlyCoachSummaries,
  identifyStructuredEdges,
  identifyTopStructuredLeaks,
  calculateWhatChanged,
  generateShortTradingProfile,
  getDetailedAnalysisBreakdown
} from '../calculations/coachEngine';
import { getThemeClasses } from '../utils/theme';
import { TradeAiReviewModal } from './TradeAiReviewModal';
import {
  Sparkles,
  Target,
  Send,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Calendar,
  X,
  Bot
} from 'lucide-react';

interface AiCoachViewProps {
  trades: Trade[];
  stats: PerformanceStats;
  settings: UserAppSettings;
  onUpdateSettings: (newSettings: UserAppSettings) => void;
  onSelectTrade: (trade: Trade) => void;
}

type CoachTab = 'overview' | 'edge-leaks' | 'monthly';

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}

export const AiCoachView: React.FC<AiCoachViewProps> = ({
  trades,
  stats,
  settings,
}) => {
  const isLight = settings.theme === 'light';
  const theme = getThemeClasses(settings);

  // 3 Primary Navigation Tabs
  const [activeTab, setActiveTab] = useState<CoachTab>('overview');

  // Progressive Disclosure States
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [showEdgeDetails, setShowEdgeDetails] = useState(false);
  const [detailedAnalysisTab, setDetailedAnalysisTab] = useState<'setups' | 'sessions' | 'assets' | 'combinations'>('setups');

  // Month Navigation for Monthly Coach
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  // Ask Your Coach Modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: `Bonjour. Je suis ton coach de trading personnel.\n\nMon analyse s'appuie directement sur tes ${trades.length} trades réels enregistrés.\n\nPose-moi une question sur ta discipline, tes erreurs, tes meilleurs setups ou ta gestion du risque.`,
      timestamp: 'Maintenant',
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Single Trade AI Review Modal
  const [selectedTradeForReview, setSelectedTradeForReview] = useState<Trade | null>(null);

  // Calculations
  const performanceScoreData = useMemo(() => {
    return calculateTraderPerformanceScore(trades, stats, settings.startingBalance);
  }, [trades, stats, settings.startingBalance]);

  const edgeFindings = useMemo(() => {
    return identifyYourEdgeFindings(trades);
  }, [trades]);

  const leakFindings = useMemo(() => {
    return identifyBiggestLeaks(trades);
  }, [trades]);

  // Redesigned Structured Edges & Leaks Data
  const structuredEdges = useMemo(() => {
    return identifyStructuredEdges(trades);
  }, [trades]);

  const structuredLeaks = useMemo(() => {
    return identifyTopStructuredLeaks(trades);
  }, [trades]);

  const whatChangedList = useMemo(() => {
    return calculateWhatChanged(trades);
  }, [trades]);

  const tradingProfileSentence = useMemo(() => {
    return generateShortTradingProfile(trades, stats, structuredEdges, structuredLeaks);
  }, [trades, stats, structuredEdges, structuredLeaks]);

  const detailedAnalysisData = useMemo(() => {
    return getDetailedAnalysisBreakdown(trades);
  }, [trades]);

  const monthlySummaries = useMemo(() => {
    return calculateMonthlyCoachSummaries(trades);
  }, [trades]);

  // Current Month Summary for Monthly Coach Tab
  const currentMonthSummary: MonthlyCoachSummary | null = useMemo(() => {
    if (monthlySummaries.length === 0) return null;
    const idx = Math.min(Math.max(0, selectedMonthIndex), monthlySummaries.length - 1);
    return monthlySummaries[idx];
  }, [monthlySummaries, selectedMonthIndex]);

  // Filtered Edges (Top 2-3 confirmed edges)
  const topEdges = useMemo(() => {
    return edgeFindings.slice(0, 3);
  }, [edgeFindings]);

  // Filtered Leaks (Top 1-2 main leaks)
  const topLeaks = useMemo(() => {
    return leakFindings.slice(0, 2);
  }, [leakFindings]);

  // Scroll chat
  useEffect(() => {
    if (isChatModalOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatModalOpen]);

  // Send message to server AI Coach
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsChatLoading(true);

    try {
      const metricsContext = {
        totalTrades: trades.length,
        winrate: stats.winrate,
        profitFactor: stats.profitFactor,
        expectancy: stats.expectancy,
        totalPnL: stats.totalPnL,
        maxDrawdownAmount: stats.maxDrawdownAmount,
        maxDrawdownPercent: stats.maxDrawdownPercent,
        score: performanceScoreData.overallScore,
        yourEdge: performanceScoreData.summary.yourEdge,
        biggestLeak: performanceScoreData.summary.biggestLeak,
        behavior: performanceScoreData.summary.behavior,
        currentFocus: performanceScoreData.summary.currentFocus,
        edges: edgeFindings.map(e => `${e.title} (${e.winrate.toFixed(1)}% WR, ${e.tradesCount} trades)`),
        leaks: leakFindings.map(l => `${l.title} (${l.problemDescription})`),
      };

      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: textToSend,
          chatHistory: chatMessages.slice(-6),
          metricsContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const coachMsg: ChatMessage = {
          id: `coach-${Date.now()}`,
          sender: 'coach',
          text: data.reply || 'Aucune réponse générée.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, coachMsg]);
      } else {
        throw new Error('Erreur serveur');
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `coach-fallback-${Date.now()}`,
        sender: 'coach',
        text: `🎯 Diagnostic\n\nSur tes ${trades.length} trades réels enregistrés, ton score global est de ${performanceScoreData.overallScore}/100.\n\n📊 Ce que montrent tes données\n\n• Point fort : ${topEdges[0]?.title || 'Setups identifiés'}\n• Focus prioritaire : ${performanceScoreData.summary.currentFocus}\n\n💡 Ce que je te conseille\n\nCapitalise sur ton edge principal et refuse systématiquement les entrées impulsives hors plan.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const initialPromptSuggestions = [
    { label: '🎯 Analyse mon plus gros leak', text: 'Analyse mon plus gros leak statistique et dis-moi quoi corriger.' },
    { label: '📈 Quel est mon meilleur setup ?', text: 'D\'après mes données réelles, quel est mon meilleur setup ?' },
    { label: '🧠 Analyse ma discipline', text: 'Analyse ma discipline d\'exécution et le respect de mon risque.' },
    { label: '📊 Fais-moi mon bilan', text: 'Fais-moi mon bilan global de performance et de points clés.' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 pb-12 font-sans select-none max-w-6xl mx-auto"
    >
      {/* 1. Header & Navigation Bar */}
      <div className={`border rounded-2xl p-4 sm:p-5 ${theme.cardBg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
              <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${
                isLight ? 'text-purple-950' : 'text-[#E8EDF2]'
              }`}>
                AI Trading Coach
              </h1>
            </div>
            <p className={`text-xs mt-0.5 ${
              isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
            }`}>
              Analyse de performance, détection d'edge & accompagnement mensuel
            </p>
          </div>

          {/* Ask Your Coach Button */}
          <button
            type="button"
            onClick={() => setIsChatModalOpen(true)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 cursor-pointer btn-press transition-all ${
              isLight 
                ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' 
                : 'bg-[#f75605]/10 text-[#f75605] border-[#f75605]/30 hover:bg-[#f75605]/20'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask Your Coach</span>
          </button>
        </div>

        {/* Navigation Tabs (Strictly 3 Sections) */}
        <div className="flex items-center gap-2 pt-4 border-t mt-4 border-slate-200/60 dark:border-slate-800/60 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer whitespace-nowrap transition-all ${
              activeTab === 'overview'
                ? theme.activeNavItem
                : `${isLight ? 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300' : 'bg-[#171E27] text-[#C5D0DC] border-[#252E38] hover:border-slate-700'}`
            }`}
          >
            Score & Vue Globale
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edge-leaks')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer whitespace-nowrap transition-all ${
              activeTab === 'edge-leaks'
                ? theme.activeNavItem
                : `${isLight ? 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300' : 'bg-[#171E27] text-[#C5D0DC] border-[#252E38] hover:border-slate-700'}`
            }`}
          >
            Your Edge & Leaks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer whitespace-nowrap transition-all ${
              activeTab === 'monthly'
                ? theme.activeNavItem
                : `${isLight ? 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300' : 'bg-[#171E27] text-[#C5D0DC] border-[#252E38] hover:border-slate-700'}`
            }`}
          >
            Monthly Coach
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT */}

      {/* ======================================================== */}
      {/* SECTION 1: SCORE & VUE GLOBALE */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Main Trader Score Card */}
          <div className={`border rounded-2xl p-5 sm:p-6 ${theme.cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
                }`}>
                  Trader Score
                </span>
                <div className="flex items-baseline gap-2.5 mt-1">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                    isLight ? 'text-slate-950' : 'text-[#E8EDF2]'
                  }`}>
                    {performanceScoreData.overallScore}
                  </span>
                  <span className={`text-lg font-bold ${
                    isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                  }`}>/ 100</span>
                </div>
                <p className={`text-xs sm:text-sm font-medium mt-2 max-w-2xl leading-relaxed ${
                  isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                }`}>
                  {performanceScoreData.hasEnoughData
                    ? performanceScoreData.summary.currentFocus || "Your current priority is improving execution and risk discipline."
                    : "Enregistrez au minimum 3 trades pour calculer votre score de performance."
                  }
                </p>
              </div>

              <div className="flex items-center">
                <span className={`px-3 py-1 text-xs font-bold rounded-xl border ${
                  performanceScoreData.overallScore >= 80 
                    ? theme.winBadge 
                    : performanceScoreData.overallScore >= 60 
                    ? isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-[#171E27] text-[#E8EDF2] border-[#252E38]'
                    : theme.lossBadge
                }`}>
                  {performanceScoreData.overallScore >= 80
                    ? 'Excellente Maîtrise'
                    : performanceScoreData.overallScore >= 60
                    ? 'Consistance en Progrès'
                    : 'Discipline Requise'}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Essential Priority Cards: Strength, Main Weakness, Current Focus */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Strength */}
            <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${theme.cardBg}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Strength
                  </span>
                </div>
                <p className={`text-xs sm:text-sm font-semibold leading-snug ${
                  isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                }`}>
                  {performanceScoreData.summary.yourEdge}
                </p>
              </div>
              <span className={`text-[10px] mt-3 pt-2 border-t ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-[#9AA8B8] border-slate-800'
              }`}>
                Point fort statistique
              </span>
            </div>

            {/* Main Weakness */}
            <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${theme.cardBg}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Main Weakness
                  </span>
                </div>
                <p className={`text-xs sm:text-sm font-semibold leading-snug ${
                  isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                }`}>
                  {performanceScoreData.summary.biggestLeak}
                </p>
              </div>
              <span className={`text-[10px] mt-3 pt-2 border-t ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-[#9AA8B8] border-slate-800'
              }`}>
                Principal frein détecté
              </span>
            </div>

            {/* Current Focus */}
            <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between ${theme.cardBg}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className={`w-3.5 h-3.5 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-violet-700' : 'text-[#f75605]'}`}>
                    Current Focus
                  </span>
                </div>
                <p className={`text-xs sm:text-sm font-semibold leading-snug ${
                  isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                }`}>
                  {performanceScoreData.summary.currentFocus}
                </p>
              </div>
              <span className={`text-[10px] mt-3 pt-2 border-t ${
                isLight ? 'text-slate-500 border-slate-100' : 'text-[#9AA8B8] border-slate-800'
              }`}>
                Action immédiate
              </span>
            </div>
          </div>

          {/* Secondary Progressive Disclosure: 5 Execution Pillars */}
          <div className={`border rounded-2xl p-4 sm:p-5 ${theme.cardBg}`}>
            <button
              type="button"
              onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
              className="w-full flex items-center justify-between text-xs font-bold cursor-pointer"
            >
              <span className={`flex items-center gap-2 ${
                isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
              }`}>
                <Sliders className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-[#8B96A3]'}`} />
                <span>View Detailed Breakdown (5 Piliers d'Exécution)</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLight ? 'text-slate-500' : 'text-[#A0AEC0]'} ${showDetailedBreakdown ? 'rotate-180' : ''}`} />
            </button>

            {showDetailedBreakdown && (
              <div className="pt-4 mt-3 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(performanceScoreData.pillars).map(([key, pillar]) => (
                  <div key={key} className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[11px] font-bold truncate ${
                        isLight ? 'text-slate-600' : 'text-[#C5D0DC]'
                      }`}>{pillar.label}</span>
                      <span className={`text-xs font-black ${
                        isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                      }`}>{pillar.score}/100</span>
                    </div>
                    {/* Compact progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full ${
                          pillar.score >= 80 ? 'bg-emerald-500' : pillar.score >= 60 ? (isLight ? 'bg-violet-600' : 'bg-[#f75605]') : 'bg-rose-500'
                        }`}
                        style={{ width: `${pillar.score}%` }}
                      />
                    </div>
                    <p className={`text-[10px] leading-tight ${
                      isLight ? 'text-slate-600' : 'text-[#B0BAC8]'
                    }`}>
                      {pillar.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: YOUR EDGE & LEAKS (REDESIGNED MINIMALIST & DATA-DRIVEN) */}
      {/* ======================================================== */}
      {activeTab === 'edge-leaks' && (
        <div className="space-y-6">
          {/* Top Section: Your Trading Profile */}
          <div className={`border rounded-2xl p-5 sm:p-6 ${theme.cardBg} space-y-2`}>
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
              <h2 className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
              }`}>
                Your Trading Profile
              </h2>
            </div>
            <p className={`text-base sm:text-lg font-semibold leading-snug ${
              isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
            }`}>
              {tradingProfileSentence}
            </p>
          </div>

          {/* Section 1: YOUR EDGE */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <div>
                <h3 className={`text-sm sm:text-base font-bold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                }`}>
                  YOUR EDGE
                </h3>
                <p className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
                }`}>
                  Ce qui fonctionne le mieux dans mon trading
                </p>
              </div>
            </div>

            {structuredEdges.length === 0 ? (
              <div className={`border rounded-2xl p-6 text-center text-xs ${
                isLight ? 'text-slate-500' : 'text-[#B0BAC8]'
              } ${theme.cardBg}`}>
                Continuez à enregistrer vos trades pour dégager vos premiers setups à avantage statistique.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {structuredEdges.map((edge) => (
                  <div
                    key={edge.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3.5 transition-all ${theme.cardBg}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}>
                          {edge.rankingBadge}
                        </span>
                        <span className={`text-[10px] font-medium ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          {edge.sampleLabel}
                        </span>
                      </div>

                      <h4 className={`text-base sm:text-lg font-bold tracking-tight ${
                        isLight ? 'text-slate-950' : 'text-[#E8EDF2]'
                      }`}>
                        EDGE — {edge.title}
                      </h4>

                      {/* Ce qui fonctionne */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          Ce qui fonctionne
                        </span>
                        <p className={`text-xs font-medium leading-relaxed ${
                          isLight ? 'text-slate-800' : 'text-[#E8EDF2]'
                        }`}>
                          {edge.whatWorks}
                        </p>
                      </div>

                      {/* La preuve */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          La preuve
                        </span>
                        <p className={`text-xs font-semibold leading-relaxed ${
                          isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}>
                          {edge.proof}
                        </p>
                      </div>

                      {/* Pourquoi c’est intéressant */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          Pourquoi c’est intéressant
                        </span>
                        <p className={`text-xs leading-relaxed ${
                          isLight ? 'text-slate-600' : 'text-[#C5D0DC]'
                        }`}>
                          {edge.whyInteresting}
                        </p>
                      </div>

                      {/* À continuer */}
                      <div className="space-y-1 pt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-violet-700' : 'text-[#f75605]'
                        }`}>
                          À continuer
                        </span>
                        <div className={`p-2.5 rounded-xl border text-xs font-medium ${
                          isLight 
                            ? 'bg-slate-50 border-slate-200 text-slate-900' 
                            : 'bg-[#171E27] border-[#252E38] text-[#E8EDF2]'
                        }`}>
                          <p className="leading-snug">
                            &gt; {edge.toContinue}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs">
                      <span className={isLight ? 'text-slate-400' : 'text-[#8B96A3]'}>
                        Gain cumulé
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {edge.totalPnL >= 0 ? '+' : ''}{edge.totalPnL.toFixed(0)}$
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: YOUR LEAKS */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between px-1">
              <div>
                <h3 className={`text-sm sm:text-base font-bold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                }`}>
                  YOUR LEAKS
                </h3>
                <p className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
                }`}>
                  Ce qui pénalise le plus mes performances
                </p>
              </div>
            </div>

            {structuredLeaks.length === 0 ? (
              <div className={`border rounded-2xl p-6 text-center text-xs ${
                isLight ? 'text-slate-500' : 'text-[#B0BAC8]'
              } ${theme.cardBg}`}>
                Aucun leak critique détecté pour le moment. Votre régularité est excellente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {structuredLeaks.map((leak) => (
                  <div
                    key={leak.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${theme.cardBg}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isLight ? 'text-rose-600' : 'text-rose-400'
                        }`}>
                          🔴 LEAK #{leak.leakNumber} — {leak.title}
                        </span>
                        <span className={`text-[10px] font-medium ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          {leak.sampleLabel}
                        </span>
                      </div>

                      {/* Ce que j’observe */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          Ce que j’observe
                        </span>
                        <p className={`text-xs font-medium leading-relaxed ${
                          isLight ? 'text-slate-800' : 'text-[#E8EDF2]'
                        }`}>
                          {leak.observe}
                        </p>
                      </div>

                      {/* La preuve */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          La preuve
                        </span>
                        <p className={`text-xs leading-relaxed ${
                          isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                        }`}>
                          {leak.proof}
                        </p>
                      </div>

                      {/* Impact */}
                      <div className="space-y-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          Impact
                        </span>
                        <p className={`text-xs font-semibold leading-relaxed ${
                          isLight ? 'text-rose-700' : 'text-rose-400'
                        }`}>
                          {leak.impact}
                        </p>
                      </div>

                      {/* Ce que tu dois changer */}
                      <div className="space-y-1 pt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-violet-700' : 'text-[#f75605]'
                        }`}>
                          Ce que tu dois changer
                        </span>
                        <div className={`p-3 rounded-xl border text-xs font-medium ${
                          isLight 
                            ? 'bg-violet-50/70 border-violet-200 text-violet-950' 
                            : 'bg-[#171E27] border-[#252E38] text-[#f75605]'
                        }`}>
                          <p className="leading-snug">
                            &gt; {leak.action}
                          </p>
                        </div>
                      </div>

                      {/* Pourquoi */}
                      <div className="space-y-0.5 pt-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                        }`}>
                          Pourquoi
                        </span>
                        <p className={`text-xs leading-relaxed italic ${
                          isLight ? 'text-slate-600' : 'text-[#A0AEC0]'
                        }`}>
                          {leak.why}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: What Changed? (Optional, shown only if changes detected) */}
          {whatChangedList.length > 0 && (
            <div className={`border rounded-2xl p-5 ${theme.cardBg} space-y-2.5`}>
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-[#A0AEC0]'}`} />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-700' : 'text-[#A0AEC0]'
                }`}>
                  What Changed?
                </h4>
              </div>
              <div className="space-y-2 pt-1">
                {whatChangedList.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className={`font-bold mt-0.5 ${
                      isLight ? 'text-violet-600' : 'text-[#f75605]'
                    }`}>
                      →
                    </span>
                    <span className={`leading-relaxed ${
                      isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                    }`}>
                      {change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Progressive Disclosure: View Detailed Analysis */}
          <div className={`border rounded-2xl overflow-hidden ${theme.cardBg}`}>
            <button
              type="button"
              onClick={() => setShowEdgeDetails(!showEdgeDetails)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-xs font-bold cursor-pointer transition-colors hover:opacity-90"
            >
              <span className={`flex items-center gap-2.5 ${
                isLight ? 'text-slate-800' : 'text-[#E8EDF2]'
              }`}>
                <Sliders className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
                <span>View Detailed Analysis (Setups, Sessions, Actifs & Combinaisons)</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${
                isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
              } ${showEdgeDetails ? 'rotate-180' : ''}`} />
            </button>

            {showEdgeDetails && (
              <div className="p-4 sm:p-5 pt-0 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                {/* Sub-tabs for Detailed Analysis */}
                <div className="flex items-center gap-1.5 pt-3 overflow-x-auto pb-1">
                  {[
                    { id: 'setups', label: 'Par Setup' },
                    { id: 'sessions', label: 'Par Session' },
                    { id: 'assets', label: 'Par Actif' },
                    { id: 'combinations', label: 'Combinaisons' },
                  ].map((tab) => {
                    const active = detailedAnalysisTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDetailedAnalysisTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          active
                            ? isLight
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-[#f75605] text-white shadow-xs'
                            : isLight
                              ? 'text-slate-600 hover:bg-slate-100'
                              : 'text-[#C5D0DC] hover:bg-[#171E27]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-tab 1: Setups */}
                {detailedAnalysisTab === 'setups' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-[#8B96A3]'}`}>
                          <th className="py-2.5 px-3 font-semibold">Setup</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Trades</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Win Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Total R</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Profit Factor</th>
                          <th className="py-2.5 px-3 font-semibold text-right">PnL Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {detailedAnalysisData.setups.map((s, idx) => (
                          <tr key={idx} className={`hover:bg-slate-500/5 ${isLight ? 'text-slate-800' : 'text-[#E8EDF2]'}`}>
                            <td className="py-2.5 px-3 font-medium">{s.name}</td>
                            <td className="py-2.5 px-3 text-center">{s.count}</td>
                            <td className="py-2.5 px-3 text-center font-semibold">{s.winrate.toFixed(0)}%</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${s.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalR >= 0 ? '+' : ''}{s.totalR.toFixed(1)}R
                            </td>
                            <td className="py-2.5 px-3 text-right">{s.profitFactor > 0 ? s.profitFactor.toFixed(2) : '-'}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${s.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalPnL >= 0 ? '+' : ''}{s.totalPnL.toFixed(0)}$
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab 2: Sessions */}
                {detailedAnalysisTab === 'sessions' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-[#8B96A3]'}`}>
                          <th className="py-2.5 px-3 font-semibold">Session / Killzone</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Trades</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Win Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Total R</th>
                          <th className="py-2.5 px-3 font-semibold text-right">PnL Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {detailedAnalysisData.sessions.map((s, idx) => (
                          <tr key={idx} className={`hover:bg-slate-500/5 ${isLight ? 'text-slate-800' : 'text-[#E8EDF2]'}`}>
                            <td className="py-2.5 px-3 font-medium">{s.name}</td>
                            <td className="py-2.5 px-3 text-center">{s.count}</td>
                            <td className="py-2.5 px-3 text-center font-semibold">{s.winrate.toFixed(0)}%</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${s.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalR >= 0 ? '+' : ''}{s.totalR.toFixed(1)}R
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${s.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalPnL >= 0 ? '+' : ''}{s.totalPnL.toFixed(0)}$
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab 3: Actifs */}
                {detailedAnalysisTab === 'assets' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-[#8B96A3]'}`}>
                          <th className="py-2.5 px-3 font-semibold">Instrument / Paire</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Trades</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Win Rate</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Total R</th>
                          <th className="py-2.5 px-3 font-semibold text-right">PnL Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {detailedAnalysisData.assets.map((s, idx) => (
                          <tr key={idx} className={`hover:bg-slate-500/5 ${isLight ? 'text-slate-800' : 'text-[#E8EDF2]'}`}>
                            <td className="py-2.5 px-3 font-medium">{s.name}</td>
                            <td className="py-2.5 px-3 text-center">{s.count}</td>
                            <td className="py-2.5 px-3 text-center font-semibold">{s.winrate.toFixed(0)}%</td>
                            <td className={`py-2.5 px-3 text-right font-semibold ${s.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalR >= 0 ? '+' : ''}{s.totalR.toFixed(1)}R
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${s.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {s.totalPnL >= 0 ? '+' : ''}{s.totalPnL.toFixed(0)}$
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-tab 4: Combinaisons */}
                {detailedAnalysisTab === 'combinations' && (
                  <div className="overflow-x-auto">
                    {detailedAnalysisData.combinations.length === 0 ? (
                      <p className={`text-xs py-4 text-center ${isLight ? 'text-slate-500' : 'text-[#B0BAC8]'}`}>
                        Pas encore assez de confluences récurrentes pour générer le tableau des combinaisons.
                      </p>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-[#8B96A3]'}`}>
                            <th className="py-2.5 px-3 font-semibold">Confluence (Setup + Session + Symbole)</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Trades</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Win Rate</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Total R</th>
                            <th className="py-2.5 px-3 font-semibold text-right">PnL Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                          {detailedAnalysisData.combinations.map((s, idx) => (
                            <tr key={idx} className={`hover:bg-slate-500/5 ${isLight ? 'text-slate-800' : 'text-[#E8EDF2]'}`}>
                              <td className="py-2.5 px-3 font-medium">{s.name}</td>
                              <td className="py-2.5 px-3 text-center">{s.count}</td>
                              <td className="py-2.5 px-3 text-center font-semibold">{s.winrate.toFixed(0)}%</td>
                              <td className={`py-2.5 px-3 text-right font-semibold ${s.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {s.totalR >= 0 ? '+' : ''}{s.totalR.toFixed(1)}R
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${s.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {s.totalPnL >= 0 ? '+' : ''}{s.totalPnL.toFixed(0)}$
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: MONTHLY COACH */}
      {/* ======================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {monthlySummaries.length === 0 ? (
            <div className={`border rounded-2xl p-8 text-center text-xs ${
              isLight ? 'text-slate-500' : 'text-[#B0BAC8]'
            } ${theme.cardBg}`}>
              Aucun trade enregistré pour le moment. Ajoutez des trades pour générer l'analyse mensuelle.
            </div>
          ) : currentMonthSummary ? (
            <>
              {/* Month Navigation: ‹ August 2026 › */}
              <div className={`border rounded-2xl p-4 flex items-center justify-between ${theme.cardBg}`}>
                <button
                  type="button"
                  onClick={() => setSelectedMonthIndex((prev) => Math.min(monthlySummaries.length - 1, prev + 1))}
                  disabled={selectedMonthIndex >= monthlySummaries.length - 1}
                  className={`p-2 rounded-xl border text-xs font-bold disabled:opacity-30 cursor-pointer btn-press ${
                    isLight 
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'border-[#252E38] text-[#E8EDF2] hover:bg-[#171E27]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
                  <span className={`text-sm sm:text-base font-bold tracking-tight ${
                    isLight ? 'text-purple-950' : 'text-[#E8EDF2]'
                  }`}>
                    {currentMonthSummary.monthLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMonthIndex((prev) => Math.max(0, prev - 1))}
                  disabled={selectedMonthIndex <= 0}
                  className={`p-2 rounded-xl border text-xs font-bold disabled:opacity-30 cursor-pointer btn-press ${
                    isLight 
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'border-[#252E38] text-[#E8EDF2] hover:bg-[#171E27]'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Monthly Summary Card (Only Essential Numbers) */}
              <div className={`border rounded-2xl p-5 ${theme.cardBg} space-y-3`}>
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
                }`}>
                  Monthly Summary
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                  <div className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <span className={`text-[11px] font-medium ${
                      isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
                    }`}>Trades</span>
                    <p className={`text-base sm:text-lg font-black mt-0.5 ${
                      isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                    }`}>
                      {currentMonthSummary.tradesCount}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <span className={`text-[11px] font-medium ${
                      isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
                    }`}>Win Rate</span>
                    <p className={`text-base sm:text-lg font-black mt-0.5 ${
                      isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                    }`}>
                      {currentMonthSummary.winrate.toFixed(1)}%
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <span className={`text-[11px] font-medium ${
                      isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
                    }`}>Total R</span>
                    <p className={`text-base sm:text-lg font-black mt-0.5 ${
                      currentMonthSummary.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {currentMonthSummary.totalR >= 0 ? '+' : ''}{currentMonthSummary.totalR.toFixed(1)}R
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <span className={`text-[11px] font-medium ${
                      isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
                    }`}>Best Edge</span>
                    <p className={`text-xs sm:text-sm font-bold mt-0.5 truncate ${
                      isLight ? 'text-slate-900' : 'text-[#E8EDF2]'
                    }`}>
                      {currentMonthSummary.bestEdge}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <span className={`text-[11px] font-medium ${
                      isLight ? 'text-slate-500' : 'text-[#C5D0DC]'
                    }`}>Main Leak</span>
                    <p className="text-xs sm:text-sm font-bold mt-0.5 truncate text-rose-600 dark:text-rose-400">
                      {currentMonthSummary.mainLeak}
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly Coach Insight */}
              <div className={`border rounded-2xl p-5 ${theme.cardBg} space-y-4`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                  <Sparkles className={`w-4 h-4 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
                  <h3 className={`text-sm font-bold ${
                    isLight ? 'text-purple-950' : 'text-[#E8EDF2]'
                  }`}>
                    Coach Insight
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* What went well */}
                  <div className={`p-4 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        What went well
                      </span>
                    </div>
                    <ul className={`space-y-1.5 text-xs ${
                      isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                    }`}>
                      {currentMonthSummary.whatWentWell.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What hurt performance */}
                  <div className={`p-4 rounded-xl border ${theme.cardSecondaryBg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        What hurt performance
                      </span>
                    </div>
                    <ul className={`space-y-1.5 text-xs ${
                      isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                    }`}>
                      {currentMonthSummary.whatHurtPerformance.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Behavior */}
                <div className={`p-4 rounded-xl border ${theme.cardSecondaryBg}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Activity className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-[#A0AEC0]'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-[#A0AEC0]'
                    }`}>
                      Behavior
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    isLight ? 'text-slate-700' : 'text-[#DDE4EC]'
                  }`}>
                    {currentMonthSummary.behavior}
                  </p>
                </div>

                {/* Next Month Focus */}
                <div className={`p-4 rounded-xl border ${
                  isLight 
                    ? 'bg-violet-50/70 border-violet-200/80 text-violet-950' 
                    : 'bg-[#f75605]/10 border-[#f75605]/30 text-[#E8EDF2]'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Target className={`w-3.5 h-3.5 ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-violet-700' : 'text-[#f75605]'
                    }`}>
                      Next Month Focus
                    </span>
                  </div>
                  <p className={`text-xs font-semibold leading-relaxed ${
                    isLight ? 'text-purple-950' : 'text-[#E8EDF2]'
                  }`}>
                    {currentMonthSummary.nextMonthFocus}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ======================================================== */}
      {/* CHAT MODAL: "Ask Your Coach" */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isChatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatModalOpen(false)}
              className={`fixed inset-0 ${theme.modalOverlay} backdrop-blur-xs`}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`border rounded-2xl w-full max-w-5xl h-[84vh] max-h-[880px] min-h-[520px] flex flex-col relative z-10 shadow-2xl overflow-hidden ${
                isLight ? 'bg-white border-purple-200/90 text-slate-900' : 'bg-[#0F141C] border-[#222A36] text-[#E8EDF2]'
              }`}
            >
              {/* Header */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between border-slate-200/70 dark:border-slate-800/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="text-2xl select-none">🧠</div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#E8EDF2] tracking-tight">
                        AI Trading Coach
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En ligne
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#8B96A3] mt-0.5">
                      Your personal trading performance coach
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsChatModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A222D] transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-6">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`rounded-2xl p-4 sm:p-5 leading-relaxed text-xs sm:text-sm ${
                        msg.sender === 'user'
                          ? isLight
                            ? 'bg-violet-600 text-white rounded-tr-xs font-medium max-w-xl shadow-xs'
                            : 'bg-[#f75605] text-white rounded-tr-xs font-medium max-w-xl shadow-xs'
                          : isLight
                          ? 'bg-slate-50 text-slate-800 rounded-tl-xs border border-slate-200/90 max-w-3xl shadow-xs'
                          : 'bg-[#151C26] text-[#E8EDF2] rounded-tl-xs border border-[#232D3B] max-w-3xl shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.text
                          .replace(/\*\*(.*?)\*\*/g, '$1')
                          .replace(/__(.*?)__/g, '$1')
                          .replace(/^\s*#{1,6}\s+/gm, '')
                          .replace(/^\s*>\s+/gm, '')}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-[#8B96A3] mt-1.5 px-1 font-medium">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {/* Suggestions rapides (affichées au départ et disparaissent dès que l'utilisateur écrit) */}
                {!chatMessages.some((m) => m.sender === 'user') && (
                  <div className="pt-2 pb-1 space-y-2.5">
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isLight ? 'text-slate-400' : 'text-[#8B96A3]'
                    }`}>
                      Suggestions rapides
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                      {initialPromptSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(suggestion.text)}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between ${
                            isLight
                              ? 'bg-slate-50/80 border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 text-slate-700'
                              : 'bg-[#151C26] border-[#232D3B] hover:border-[#f75605]/50 hover:bg-[#1A2330] text-[#DDE4EC]'
                          }`}
                        >
                          <span>{suggestion.label}</span>
                          <span className={`text-[10px] ${isLight ? 'text-violet-600' : 'text-[#f75605]'}`}>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isChatLoading && (
                  <div className="flex items-center gap-2.5 text-slate-400 dark:text-[#A0AEC0] text-xs sm:text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 dark:text-[#f75605]" />
                    <span>Le coach analyse tes données...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3.5 sm:p-5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5 flex-shrink-0 bg-slate-50/50 dark:bg-[#0D1219]/60"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pose une question à ton coach…"
                  className={`flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border outline-none transition-colors ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500'
                      : 'bg-[#151C26] border-[#252E38] text-[#E8EDF2] placeholder:text-[#8B96A3] focus:border-[#f75605]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className={`px-4 sm:px-5 py-3 rounded-xl text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-all ${
                    isLight ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#f75605] hover:bg-[#ea580c]'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trade AI Review Modal (Quality vs Result) */}
      {selectedTradeForReview && (
        <TradeAiReviewModal
          trade={selectedTradeForReview}
          allTrades={trades}
          onClose={() => setSelectedTradeForReview(null)}
          settings={settings}
        />
      )}
    </motion.div>
  );
};
