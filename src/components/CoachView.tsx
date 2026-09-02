import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import { formatCurrency, formatPercent } from '../lib/formatting';
import { useAICoach } from '../hooks/useAICoach';
import {
  Bot,
  Brain,
  ShieldAlert,
  Award,
  AlertTriangle,
  Send,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Activity,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoachViewProps {
  trades?: Trade[];
  setups?: Setup[];
  currency?: string;
  initialBalance?: number;
}

export const CoachView: React.FC<CoachViewProps> = ({
  trades = [],
  setups = [],
  currency = 'EUR',
  initialBalance = 10000,
}) => {
  const safeTrades = useMemo(() => trades || [], [trades]);
  const safeSetups = useMemo(() => setups || [], [setups]);

  const { messages, isLoading, error, sendMessage, clearHistory } = useAICoach(
    safeTrades,
    safeSetups,
    initialBalance
  );

  const [inputPrompt, setInputPrompt] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle submit
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    sendMessage(inputPrompt);
    setInputPrompt('');
  };

  // Quick Prompt Chips
  const quickPrompts = [
    { label: '🏆 Meilleur Setup', query: 'Quel est mon meilleur setup ?' },
    { label: '🎯 Meilleure Paire', query: 'Sur quelle paire suis-je le plus performant ?' },
    { label: '⏰ Killzone Optimale', query: 'Quelle Killzone fonctionne le mieux pour moi ?' },
    { label: '🛡️ Comportement post-perte', query: 'Quels sont mes comportements récurrents après une perte ?' },
    { label: '🧠 Mon Edge est-il confirmé ?', query: 'Est-ce que mon Edge est suffisamment confirmé ?' },
    { label: '🔍 5 derniers trades', query: 'Analyse mes 5 derniers trades.' },
    { label: '📅 Comparer cette semaine', query: 'Compare cette semaine avec la précédente.' },
    { label: '⚠️ Points à améliorer', query: 'Quels points et erreurs dois-je améliorer en priorité ?' },
  ];

  // Mistake aggregation
  const mistakeStats = useMemo(() => {
    const counts: Record<string, { count: number; totalCost: number }> = {};

    safeTrades.forEach((t) => {
      if (!t) return;
      const mistake = t.mistake || 'NONE';
      if (mistake === 'NONE') return;
      if (!counts[mistake]) {
        counts[mistake] = { count: 0, totalCost: 0 };
      }
      counts[mistake].count++;
      if (t.netPnL !== null && t.netPnL !== undefined && t.netPnL < 0) {
        counts[mistake].totalCost += Math.abs(t.netPnL);
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [safeTrades]);

  // Discipline & Adherence Rate
  const disciplineRate = useMemo(() => {
    const closed = safeTrades.filter((t) => t && t.status === 'CLOSED');
    if (closed.length === 0) return 100;
    const cleanTrades = closed.filter((t) => !t.mistake || t.mistake === 'NONE').length;
    return Math.round((cleanTrades / closed.length) * 100);
  }, [safeTrades]);

  // Post-Loss analysis metrics
  const postLossMetrics = useMemo(() => {
    const closed = safeTrades
      .filter((t) => t && t.status === 'CLOSED' && t.netPnL !== null)
      .sort((a, b) => new Date(a.closedAt || a.openedAt).getTime() - new Date(b.closedAt || b.openedAt).getTime());

    let postLossTrades = 0;
    let postLossWins = 0;
    let postLossMistakes = 0;

    for (let i = 1; i < closed.length; i++) {
      const prev = closed[i - 1];
      const cur = closed[i];
      if (prev.netPnL !== null && prev.netPnL < -0.0001) {
        postLossTrades++;
        if (cur.netPnL !== null && cur.netPnL > 0.0001) {
          postLossWins++;
        }
        if (cur.mistake && cur.mistake !== 'NONE') {
          postLossMistakes++;
        }
      }
    }

    const postLossWinRate = postLossTrades > 0 ? (postLossWins / postLossTrades) * 100 : 0;
    const postLossMistakeRate = postLossTrades > 0 ? (postLossMistakes / postLossTrades) * 100 : 0;

    return {
      postLossTrades,
      postLossWinRate,
      postLossMistakeRate,
    };
  }, [safeTrades]);

  // Emotional performance breakdown
  const emotionStats = useMemo(() => {
    const groups: Record<string, { count: number; wins: number; pnl: number }> = {};
    safeTrades.forEach((t) => {
      if (!t) return;
      const em = t.emotion || 'NEUTRAL';
      if (!groups[em]) groups[em] = { count: 0, wins: 0, pnl: 0 };
      groups[em].count++;
      if (t.netPnL !== null && t.netPnL !== undefined && t.netPnL > 0) groups[em].wins++;
      if (t.netPnL !== null && t.netPnL !== undefined) groups[em].pnl += t.netPnL;
    });

    return Object.entries(groups).map(([emotion, data]) => ({
      emotion,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      pnl: data.pnl,
    }));
  }, [safeTrades]);

  // Custom text formatter for AI responses to highlight structured blocks
  const renderMessageContent = (content: string) => {
    const paragraphs = content.split('\n\n');

    return (
      <div className="space-y-3 text-xs leading-relaxed">
        {paragraphs.map((p, idx) => {
          const trimmed = p.trim();

          // Section header like ### **Fait statistique**
          if (trimmed.startsWith('###')) {
            const cleanTitle = trimmed.replace(/^###\s*\**/, '').replace(/\**$/, '');
            const isFact = cleanTitle.toLowerCase().includes('fait');
            const isInterp = cleanTitle.toLowerCase().includes('interprétation') || cleanTitle.toLowerCase().includes('observation');
            const isAction = cleanTitle.toLowerCase().includes('action');

            return (
              <div
                key={idx}
                className={`pt-2 flex items-center gap-1.5 font-semibold tracking-wide uppercase text-[11px] ${
                  isFact
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : isInterp
                    ? 'text-amber-600 dark:text-amber-400'
                    : isAction
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {isFact && <Activity className="w-3.5 h-3.5 shrink-0" />}
                {isInterp && <Brain className="w-3.5 h-3.5 shrink-0" />}
                {isAction && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{cleanTitle}</span>
              </div>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
            const lines = trimmed.split('\n');
            return (
              <ul key={idx} className="space-y-1.5 pl-2">
                {lines.map((l, lIdx) => {
                  const item = l.replace(/^[-•*]\s*/, '');
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Numbered list
          if (/^\d+\./.test(trimmed)) {
            const lines = trimmed.split('\n');
            return (
              <ol key={idx} className="space-y-1.5 pl-2">
                {lines.map((l, lIdx) => {
                  const match = l.match(/^(\d+\.)\s*(.*)$/);
                  if (match) {
                    return (
                      <li key={lIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 text-[11px]">
                          {match[1]}
                        </span>
                        <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(match[2]) }} />
                      </li>
                    );
                  }
                  return (
                    <p key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(l) }} />
                  );
                })}
              </ol>
            );
          }

          // Normal paragraph
          return (
            <p
              key={idx}
              className="text-slate-700 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
            />
          );
        })}
      </div>
    );
  };

  // Helper for inline bold, code, and highlights
  const formatInlineMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600 dark:text-slate-400">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]">$1</code>');
  };

  return (
    <div className="space-y-6 font-sans" id="view-coach">
      {/* Top Banner with Real-Time Context Sync Badge */}
      <div className="p-6 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                  AI Trading Coach &amp; Performance Auditor
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  Gemini Connecté
                </span>
              </div>
              <p className="text-xs text-[#6B668D] dark:text-[#9299A8] font-medium">
                Audit quantitatif, détection de biais comportementaux et réponses aux questions ouvertes basées sur vos {safeTrades.length} trades
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clearHistory}
              title="Réinitialiser la conversation"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#6B668D] dark:text-[#9299A8] bg-[#FAF8FF] dark:bg-[#181C25] hover:bg-[#F3EEFF] dark:hover:bg-[#202531] border border-[#ECE7FC] dark:border-[#292E38] rounded-2xl transition cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer l'historique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Chat Console (Left 60%) + Behavioral Intelligence (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Console Column */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm overflow-hidden h-[680px]">
          {/* Chat Header */}
          <div className="px-5 py-3.5 border-b border-[#ECE7FC] dark:border-[#292E38] bg-[#FAF8FF] dark:bg-[#181C25] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                Session Active • Mémoire Conversationnelle
              </span>
            </div>
            <span className="text-[11px] text-[#8E89AF] dark:text-[#9299A8] font-mono font-medium">
              SMC &amp; Price Action Engine
            </span>
          </div>

          {/* Quick Prompts Selector */}
          <div className="px-4 py-2.5 border-b border-[#ECE7FC] dark:border-[#292E38] bg-[#FAF8FF]/60 dark:bg-[#0B0D12] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E89AF] dark:text-[#9299A8] shrink-0">
              Questions :
            </span>
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(item.query)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 text-[11px] font-bold rounded-xl bg-white dark:bg-[#181C25] text-[#0F0E26] dark:text-[#F5F5F5] border border-[#ECE7FC] dark:border-[#292E38] hover:border-[#6D19E8] dark:hover:border-[#FF8A00] hover:text-[#6D19E8] dark:hover:text-[#FF8A00] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] text-white shadow-xs'
                        : 'bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30'
                    }`}
                  >
                    {isUser ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs ${
                      isUser
                        ? 'bg-gradient-to-r from-[#6D19E8] to-[#4B27B8] dark:from-[#FF8A00] dark:to-[#FF6B00] text-white rounded-tr-xs font-medium shadow-sm'
                        : 'bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] text-[#0F0E26] dark:text-[#F5F5F5] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      renderMessageContent(msg.text)
                    )}

                    <div
                      className={`text-[9px] mt-2 font-mono ${
                        isUser ? 'text-white/80 text-right' : 'text-[#8E89AF] dark:text-[#9299A8]'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#F5EEFF] dark:bg-[#FF8A00]/10 text-[#6D19E8] dark:text-[#FF8A00] border border-[#DDD5FA] dark:border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-xs bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38] flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#6D19E8] dark:bg-[#FF8A00] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-[#6B668D] dark:text-[#9299A8] ml-1 font-medium">
                    Gemini analyse vos données en direct...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-[#ECE7FC] dark:border-[#292E38] bg-[#FAF8FF] dark:bg-[#0B0D12] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Posez une question sur vos setups, paires, sessions ou psychologie..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-white dark:bg-[#12151D] border border-[#ECE7FC] dark:border-[#292E38] text-[#0F0E26] dark:text-[#F5F5F5] placeholder-[#8E89AF] dark:placeholder-[#9299A8] focus:outline-none focus:ring-2 focus:ring-[#6D19E8] dark:focus:ring-[#FF8A00] transition font-medium shadow-xs"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-[#6D19E8] hover:bg-[#5A14C4] dark:bg-[#FF8A00] dark:hover:bg-[#E67600] text-white disabled:opacity-40 transition cursor-pointer shadow-sm"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Behavioral Analytics & Psychological Intelligence Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Rule Adherence & Discipline Rate */}
          <div className="p-5 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#6D19E8] dark:text-[#FF8A00]" />
                <h3 className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5] uppercase tracking-wider">
                  Indice de Discipline &amp; Respect
                </h3>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                  disciplineRate >= 80
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : disciplineRate >= 60
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                }`}
              >
                {disciplineRate >= 80 ? 'Haute Rigueur' : disciplineRate >= 60 ? 'Modéré' : 'Vulnérable'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold tabular-nums text-[#0F0E26] dark:text-[#F5F5F5]">
                {disciplineRate}%
              </div>
              <div className="text-xs text-[#6B668D] dark:text-[#9299A8] font-medium">
                {safeTrades.filter((t) => t.status === 'CLOSED' && (!t.mistake || t.mistake === 'NONE')).length} trades sans erreur / {safeTrades.filter((t) => t.status === 'CLOSED').length}
              </div>
            </div>

            <div className="w-full bg-[#FAF8FF] dark:bg-[#181C25] h-2 rounded-full overflow-hidden border border-[#ECE7FC] dark:border-[#292E38]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  disciplineRate >= 80
                    ? 'bg-emerald-500'
                    : disciplineRate >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${disciplineRate}%` }}
              />
            </div>
            <p className="text-[11px] text-[#6B668D] dark:text-[#9299A8] font-normal">
              Pourcentage des positions clôturées exécutées strictement sans FOMO, sans sortie prématurée ni violation de plan.
            </p>
          </div>

          {/* Card 2: Post-Loss Behavioral Radar */}
          <div className="p-5 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5] uppercase tracking-wider">
                  Radar Comportemental Post-Perte
                </h3>
              </div>
              <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-mono font-bold">
                n = {postLossMetrics.postLossTrades}
              </span>
            </div>

            {postLossMetrics.postLossTrades === 0 ? (
              <div className="py-4 text-center text-xs text-[#8E89AF] dark:text-[#9299A8] font-normal">
                Aucune perte consécutive enregistrée.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38]">
                  <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block uppercase font-bold">Win Rate Post-Perte</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      postLossMetrics.postLossWinRate >= 50
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPercent(postLossMetrics.postLossWinRate, 1)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF8FF] dark:bg-[#181C25] border border-[#ECE7FC] dark:border-[#292E38]">
                  <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] block uppercase font-bold">Fautes Post-Perte</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      postLossMetrics.postLossMistakeRate > 30
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#0F0E26] dark:text-[#F5F5F5]'
                    }`}
                  >
                    {formatPercent(postLossMetrics.postLossMistakeRate, 1)}
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-[#6B668D] dark:text-[#9299A8] font-normal">
              Mesure la lucidité d'exécution sur le trade intervenant immédiatement après un Stop Loss.
            </p>
          </div>

          {/* Card 3: Capital Leak Detector (Mistakes) */}
          <div className="p-5 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5] uppercase tracking-wider">
                Fuites de Capital Identifiées (Erreurs)
              </h3>
            </div>

            {mistakeStats.length === 0 ? (
              <div className="py-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                Exemplaire : Aucune faute de discipline enregistrée.
              </div>
            ) : (
              <div className="space-y-2">
                {mistakeStats.slice(0, 4).map((m) => (
                  <div
                    key={m.name}
                    className="p-3 rounded-2xl border border-rose-200/60 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <div>
                        <span className="font-bold text-xs text-[#0F0E26] dark:text-[#F5F5F5]">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-[#6B668D] dark:text-[#9299A8] block tabular-nums font-medium">
                          {m.count} position{m.count > 1 ? 's' : ''} concernée{m.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#8E89AF] dark:text-[#9299A8] block">Coût cumulé</span>
                      <span className="text-xs tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(m.totalCost, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Psychological State Matrix */}
          <div className="p-5 rounded-3xl border border-[#ECE7FC] dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#6D19E8] dark:text-[#FF8A00]" />
              <h3 className="text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5] uppercase tracking-wider">
                État Émotionnel vs Rentabilité
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {emotionStats.slice(0, 4).map((em) => (
                <div
                  key={em.emotion}
                  className="p-3 rounded-2xl border border-[#ECE7FC] dark:border-[#292E38] bg-[#FAF8FF] dark:bg-[#181C25] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                    <span className="truncate">{em.emotion}</span>
                    <span className="text-[10px] text-[#8E89AF] dark:text-[#9299A8] font-mono">n={em.count}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#ECE7FC] dark:border-[#292E38]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Win:</span>
                    <span className="tabular-nums font-bold text-[#0F0E26] dark:text-[#F5F5F5]">
                      {formatPercent(em.winRate, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6B668D] dark:text-[#9299A8] font-medium">Net:</span>
                    <span
                      className={`tabular-nums font-bold ${
                        em.pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : em.pnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#8E89AF]'
                      }`}
                    >
                      {formatCurrency(em.pnl, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
