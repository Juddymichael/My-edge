import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Trade } from '../../types/trade';
import type { UserSettings } from '../../types/settings';
import { buildCoachContext } from '../../lib/coachContext';
import {
  calculateProfitFactor,
  calculateWinRate,
} from '../../lib/calculations/statistics';
import {
  getHoldingMinutes,
  getHoldingTimeBucket,
  getTradeKillzone,
} from '../../lib/tradingKillzone';
import { useRiskAlerts } from '../../hooks/useRiskAlerts';
import type { MobilePageProps } from './types';

type Tab = 'analysis' | 'charts' | 'recommendations';

type Rec = {
  id: string;
  title: string;
  description: string;
  priority: 'Élevée' | 'Moyenne' | 'Faible';
  impact: number;
  effort: number;
  quickFixes: string[];
  category: string;
  estimatedCost: number;
  status: 'Nouveau' | 'En cours' | 'Résolu';
};

type ChartDatum = {
  name: string;
  pnl: number;
  winRate: number;
  count: number;
};

const card =
  'rounded-3xl border border-slate-800/80 bg-[#111118] shadow-[0_14px_40px_rgba(0,0,0,.16)]';

const money = (value: number, currency: string) =>
  `${value >= 0 ? '+' : ''}${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

const aggregate = (
  trades: Trade[],
  getKey: (trade: Trade) => string,
): ChartDatum[] => {
  const groups = new Map<string, Trade[]>();

  trades
    .filter(
      (trade) =>
        trade.status !== 'OPEN' && typeof trade.netPnL === 'number',
    )
    .forEach((trade) => {
      const key = getKey(trade);
      if (!key) return;
      groups.set(key, [...(groups.get(key) || []), trade]);
    });

  return [...groups].map(([name, group]) => ({
    name,
    pnl:
      group.reduce((sum, trade) => sum + (trade.netPnL || 0), 0) /
      group.length,
    winRate:
      (group.filter((trade) => (trade.netPnL || 0) > 0).length /
        group.length) *
      100,
    count: group.length,
  }));
};

function Confidence({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg
        viewBox="0 0 84 84"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#27272f"
          strokeWidth="7"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-fuchsia-400"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safeScore / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-lg text-white">{Math.round(safeScore)}</b>
        <span className="text-[8px] uppercase text-slate-400">confiance</span>
      </div>
    </div>
  );
}

function Chart({
  title,
  data,
  info,
}: {
  title: string;
  data: ChartDatum[];
  info: string;
}) {
  const [mode, setMode] = useState<'pnl' | 'win'>('pnl');
  const shown =
    data.length > 10 ? data.filter((_, index) => index % 2 === 0) : data;
  const width = Math.max(340, shown.length * 58);
  const height = 290;
  const left = 38;
  const right = 12;
  const top = 22;
  const bottom = 55;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(
    1,
    ...shown.map((item) =>
      Math.abs(mode === 'pnl' ? item.pnl : item.winRate),
    ),
  );

  return (
    <div className={`${card} overflow-hidden p-4`}>
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-[10px] text-slate-400">
            {data.reduce((sum, item) => sum + item.count, 0)} trades analysés
          </p>
        </div>
        <button
          type="button"
          title={info}
          aria-label={info}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex w-fit gap-1 rounded-xl bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setMode('pnl')}
          className={`min-h-10 rounded-lg px-3 text-[10px] font-bold ${
            mode === 'pnl' ? 'bg-violet-600 text-white' : 'text-slate-400'
          }`}
        >
          P&amp;L moyen
        </button>
        <button
          type="button"
          onClick={() => setMode('win')}
          className={`min-h-10 rounded-lg px-3 text-[10px] font-bold ${
            mode === 'win' ? 'bg-fuchsia-500 text-white' : 'text-slate-400'
          }`}
        >
          Win rate
        </button>
      </div>

      {shown.length ? (
        <div className="mt-2 overflow-x-auto touch-pan-x overscroll-x-contain">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block max-w-none"
            role="img"
            aria-label={title}
          >
            <line
              x1={left}
              y1={top}
              x2={left}
              y2={height - bottom}
              stroke="#334155"
            />
            <line
              x1={left}
              y1={height - bottom}
              x2={width - right}
              y2={height - bottom}
              stroke="#334155"
            />

            {[0, 0.5, 1].map((position) => (
              <line
                key={position}
                x1={left}
                y1={top + plotHeight * position}
                x2={width - right}
                y2={top + plotHeight * position}
                stroke="#1e293b"
                strokeDasharray="3 5"
              />
            ))}

            {shown.map((item, index) => {
              const x =
                left + (index + 0.5) * (plotWidth / shown.length);
              const value = mode === 'pnl' ? item.pnl : item.winRate;
              const y =
                mode === 'pnl'
                  ? top +
                    plotHeight / 2 -
                    (Math.abs(value) / max) * (plotHeight / 2)
                  : top + plotHeight * (1 - value / 100);
              const barHeight =
                mode === 'pnl'
                  ? Math.max(3, (Math.abs(value) / max) * (plotHeight / 2))
                  : Math.max(3, plotHeight - (value / 100) * plotHeight);

              return (
                <g key={item.name}>
                  <rect
                    x={x - 15}
                    y={
                      mode === 'pnl' && value < 0
                        ? top + plotHeight / 2
                        : y
                    }
                    width="30"
                    height={barHeight}
                    rx="5"
                    className={
                      value >= 0 ? 'fill-violet-500' : 'fill-rose-500'
                    }
                  />
                  <text
                    x={x}
                    y={height - 20}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#CBD5E1"
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}

            {mode === 'pnl' && (
              <line
                x1={left}
                y1={top + plotHeight / 2}
                x2={width - right}
                y2={top + plotHeight / 2}
                stroke="#475569"
                strokeDasharray="4 4"
              />
            )}
          </svg>
        </div>
      ) : (
        <div className="flex h-[250px] items-center justify-center text-xs text-slate-400">
          Pas assez de données.
        </div>
      )}

      <p className="mt-1 text-[10px] text-slate-500">
        Glissez horizontalement si nécessaire.
      </p>
    </div>
  );
}

function RecCard({
  recommendation,
  onApply,
  onView,
  onStatus,
}: {
  recommendation: Rec;
  onApply: (recommendation: Rec) => void;
  onView: (recommendation: Rec) => void;
  onStatus: (id: string, status: Rec['status']) => void;
}) {
  const [open, setOpen] = useState(false);
  const priorityClass =
    recommendation.priority === 'Élevée'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
      : recommendation.priority === 'Moyenne'
        ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300'
        : 'border-slate-600 bg-slate-700/30 text-slate-300';

  return (
    <div className={`${card} overflow-hidden p-4`}>
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${priorityClass}`}
        >
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-[9px] font-black ${priorityClass}`}
            >
              {recommendation.priority}
            </span>
            <span className="truncate text-[10px] text-slate-500">
              {recommendation.category}
            </span>
          </div>

          <h3 className="mt-2 break-words text-sm font-bold text-white">
            {recommendation.title}
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-slate-300">
            {recommendation.description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-3 flex min-h-11 w-full items-center justify-between border-t border-slate-800 text-xs font-bold text-slate-300"
      >
        <span>Voir plus</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 pt-2">
          <div className="text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Impact {Math.round(recommendation.impact)}%</span>
              <span>Effort {recommendation.effort}/10</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-violet-600"
                style={{ width: `${recommendation.effort * 10}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2">
            {recommendation.quickFixes.slice(0, 3).map((fix, index) => (
              <li
                key={index}
                className="flex gap-2 break-words text-xs text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                <span>{fix}</span>
              </li>
            ))}
          </ul>

          <div className="text-xs text-rose-400">
            Pertes observées : -{recommendation.estimatedCost.toFixed(0)}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onView(recommendation)}
          className="min-h-11 w-full rounded-xl border border-slate-700 text-xs font-bold"
        >
          Voir le plan d'action
        </button>
        <button
          type="button"
          onClick={() => onApply(recommendation)}
          className="min-h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-xs font-bold text-white"
        >
          <Plus className="mr-1 inline h-4 w-4" />
          Appliquer à mon plan
        </button>
        <select
          value={recommendation.status}
          onChange={(event) =>
            onStatus(
              recommendation.id,
              event.target.value as Rec['status'],
            )
          }
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs"
          aria-label={`Statut de ${recommendation.title}`}
        >
          <option>Nouveau</option>
          <option>En cours</option>
          <option>Résolu</option>
        </select>
      </div>
    </div>
  );
}

export function AIAnalysisMobile({ data }: MobilePageProps) {
  const { trades = [], setups = [] } = data;
  const settings = data.settings as UserSettings;
  const [tab, setTab] = useState<Tab>('analysis');
  const [analysis, setAnalysis] = useState<{
    summary: string;
    keyPoints: string[];
    confidenceScore: number;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Rec | null>(null);
  const touchStart = useRef<number | null>(null);

  const { activeAlerts } = useRiskAlerts(trades, settings);

  const context = useMemo(
    () =>
      buildCoachContext(
        trades,
        setups,
        settings.initialAccountBalance || 10000,
      ),
    [trades, setups, settings.initialAccountBalance],
  );

  const closed = useMemo(
    () =>
      trades.filter(
        (trade) =>
          trade.status !== 'OPEN' && typeof trade.netPnL === 'number',
      ),
    [trades],
  );

  const stats = useMemo(() => {
    const winStats = calculateWinRate(trades);
    const profitFactorStats = calculateProfitFactor(trades);

    return {
      pnl: closed.reduce((sum, trade) => sum + (trade.netPnL || 0), 0),
      win: winStats.winRate || 0,
      count: winStats.closed,
      pf: profitFactorStats.profitFactor,
    };
  }, [trades, closed]);

  const charts = useMemo(
    () => ({
      kill: aggregate(
        closed,
        (trade) => getTradeKillzone(trade) || 'Hors',
      ),
      duration: aggregate(
        closed,
        (trade) => getHoldingTimeBucket(getHoldingMinutes(trade)) || 'Inconnue',
      ),
      day: aggregate(closed, (trade) => {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return dayNames[
          new Date(trade.closedAt || trade.openedAt).getDay()
        ];
      }),
      hour: aggregate(closed, (trade) => {
        const hour =
          (new Date(trade.closedAt || trade.openedAt).getUTCHours() + 3) % 24;
        return `${String(hour).padStart(2, '0')}h`;
      }),
    }),
    [closed],
  );

  const localRecommendations = useMemo(
    () =>
      activeAlerts.map((alert) => {
        const relatedTrades = trades.filter((trade) =>
          alert.relatedTradeIds.includes(trade.id),
        );
        const cost = Math.abs(
          relatedTrades
            .filter((trade) => (trade.netPnL || 0) < 0)
            .reduce((sum, trade) => sum + (trade.netPnL || 0), 0),
        );

        return {
          id: `local-${alert.id}`,
          title: alert.title,
          description:
            alert.explanation || 'Pattern détecté dans vos trades.',
          priority: (
            alert.type === 'REVENGE_TRADING' || alert.type === 'LOSS_STREAK'
              ? 'Élevée'
              : 'Moyenne'
          ) as Rec['priority'],
          impact: cost ? Math.min(100, Math.round(cost * 0.6)) : 25,
          effort: alert.type === 'REVENGE_TRADING' ? 3 : 5,
          quickFixes: [
            'Définir une règle simple avant le prochain trade.',
            'Respecter la taille de risque prévue.',
            'Mesurer le pattern sur les prochains trades.',
          ],
          category: 'Pattern local',
          estimatedCost: cost,
          status: 'Nouveau' as const,
        };
      }),
    [activeAlerts, trades],
  );

  const shownRecommendations = recommendations.length
    ? recommendations
    : localRecommendations;

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analysis', context }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Analyse indisponible');
      }

      setAnalysis({
        summary: json.data.summary,
        keyPoints: Array.isArray(json.data.keyPoints)
          ? json.data.keyPoints.slice(0, 5)
          : [],
        confidenceScore: Number(json.data.confidenceScore) || 0,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Analyse indisponible',
      );
    } finally {
      setLoading(false);
    }
  };

  const runRecommendations = async () => {
    setRecommendations(localRecommendations);
    setRecommendationLoading(true);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'recommendations',
          context: {
            summary: context.summary,
            alerts: activeAlerts,
            setups: context.setups,
            killzones: context.killzones,
            pairs: context.pairs,
          },
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Recommandations indisponibles');
      }

      if (
        Array.isArray(json.data?.recommendations) &&
        json.data.recommendations.length
      ) {
        const nextRecommendations = json.data.recommendations
          .slice(0, 8)
          .map((item: any, index: number): Rec => {
            const fallback = localRecommendations[index];
            const priority = ['Élevée', 'Moyenne', 'Faible'].includes(
              item.priority,
            )
              ? item.priority
              : fallback?.priority || 'Moyenne';

            return {
              id: fallback?.id || `ai-${index}`,
              title: item.title || fallback?.title || 'Recommandation',
              description:
                item.description || fallback?.description || '',
              priority,
              impact:
                Number(item.impact) || fallback?.impact || 25,
              effort:
                Number(item.effort) || fallback?.effort || 5,
              quickFixes:
                item.quickFixes || fallback?.quickFixes || [],
              category:
                item.category || fallback?.category || 'Analyse IA',
              estimatedCost: fallback?.estimatedCost || 0,
              status: fallback?.status || 'Nouveau',
            };
          });

        setRecommendations(nextRecommendations);
      }
    } catch {
      // The local recommendations remain visible when the AI endpoint fails.
    } finally {
      setRecommendationLoading(false);
    }
  };

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);

    if (nextTab === 'analysis' && !analysis && !loading) {
      void runAnalysis();
    }

    if (
      nextTab === 'recommendations' &&
      !recommendations.length &&
      !recommendationLoading
    ) {
      void runRecommendations();
    }
  };

  const swipe = (deltaX: number) => {
    if (Math.abs(deltaX) < 55) return;

    const tabs: Tab[] = ['analysis', 'charts', 'recommendations'];
    const currentIndex = tabs.indexOf(tab);
    const nextIndex =
      deltaX < 0
        ? Math.min(tabs.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);

    if (currentIndex !== nextIndex) {
      changeTab(tabs[nextIndex]);
    }
  };

  const metrics = [
    [
      'Total P&L',
      money(stats.pnl, settings.currency || 'USD'),
      stats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
      TrendingUp,
    ],
    ['Win Rate', `${stats.win.toFixed(1)}%`, 'text-emerald-400', Target],
    [
      'Profit Factor',
      stats.pf === null
        ? '—'
        : stats.pf === Infinity
          ? '∞'
          : stats.pf.toFixed(2),
      'text-fuchsia-300',
      Zap,
    ],
    ['Total Trades', String(stats.count), 'text-white', BarChart3],
  ] as const;

  const estimatedCost = shownRecommendations.reduce(
    (sum, recommendation) => sum + recommendation.estimatedCost,
    0,
  );
  const optimizationScore = Math.min(
    100,
    Math.max(
      20,
      100 -
        shownRecommendations.filter(
          (recommendation) => recommendation.priority === 'Élevée',
        ).length *
          20,
    ),
  );

  return (
    <div
      className="mobile-page-frame space-y-4 font-sans text-slate-100"
      onTouchStart={(event) => {
        touchStart.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;

        const currentX =
          event.changedTouches[0]?.clientX ?? touchStart.current;
        swipe(currentX - touchStart.current);
        touchStart.current = null;
      }}
    >
      <header className="mobile-page-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-2.5">
            <Sparkles className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div className="min-w-0">
            <h1>Analyse IA</h1>
            <p>Audit de performance basé sur vos données réelles.</p>
          </div>
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 touch-pan-x"
          role="tablist"
        >
          {(
            [
              ['analysis', 'Analyse'],
              ['charts', 'Graphiques'],
              ['recommendations', 'Recommandations'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => changeTab(id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold ${
                tab === id
                  ? 'border-violet-500 bg-violet-600 text-white'
                  : 'border-slate-800 bg-[#111118] text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'analysis' && (
        <section className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-500/20 p-4 text-xs">
              <p className="break-words">{error}</p>
              <button
                type="button"
                onClick={() => void runAnalysis()}
                className="mt-3 min-h-11 w-full rounded-xl bg-violet-600 font-bold"
              >
                Réessayer
              </button>
            </div>
          )}

          {!analysis && !loading && !error && (
            <button
              type="button"
              onClick={() => void runAnalysis()}
              className={`${card} min-h-20 w-full p-5 text-left`}
            >
              <Lightbulb className="mr-3 inline h-5 w-5 text-fuchsia-300" />
              <span className="text-sm font-bold">
                Générer mon résumé exécutif IA
              </span>
              <ChevronRight className="float-right" />
            </button>
          )}

          {loading && !analysis && (
            <div className={`${card} flex gap-2 p-5 text-xs`}>
              <Loader2 className="animate-spin" />
              Génération du résumé IA…
            </div>
          )}

          {analysis && (
            <div className={`${card} overflow-hidden p-5`}>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[9px] font-black text-fuchsia-300">
                    RÉSUMÉ EXÉCUTIF IA
                  </span>
                  <p className="mt-3 break-words text-sm leading-6 text-slate-200">
                    {analysis.summary}
                  </p>
                </div>
                <Confidence score={analysis.confidenceScore} />
              </div>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <b className="text-[10px] uppercase text-slate-400">
                  Points clés
                </b>
                <ul className="mt-3 space-y-3">
                  {analysis.keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex gap-2 break-words text-xs leading-5"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {metrics.map(([title, value, textClass, Icon]) => (
              <div
                key={title}
                className={`${card} min-w-0 overflow-hidden p-4`}
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate text-[9px] uppercase text-slate-400">
                    {title}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-violet-400" />
                </div>
                <div
                  className={`mt-3 truncate text-lg font-black ${textClass}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'charts' && (
        <section className="space-y-4">
          <Chart
            title="Performance par killzone"
            data={charts.kill}
            info="Performance moyenne et win rate par killzone."
          />
          <Chart
            title="Performance par unité de temps"
            data={charts.duration}
            info="Performance selon la durée de détention."
          />
          <Chart
            title="Performance par jour"
            data={charts.day}
            info="Performance selon le jour de clôture."
          />
          <Chart
            title="Performance par heure"
            data={charts.hour}
            info="Heure affichée en UTC+3."
          />
          <p className="text-center text-[10px] text-slate-500">
            Un graphique à la fois, avec P&amp;L / Win rate commutables.
          </p>
        </section>
      )}

      {tab === 'recommendations' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Trades analysés', String(stats.count), 'text-white'],
              [
                'Pertes potentielles',
                `-${estimatedCost.toFixed(0)} ${settings.currency || 'USD'}`,
                'text-rose-400',
              ],
              [
                'Gain potentiel',
                `+${shownRecommendations
                  .reduce(
                    (sum, recommendation) =>
                      sum + recommendation.impact,
                    0,
                  )
                  .toFixed(0)} ${settings.currency || 'USD'}/mois`,
                'text-emerald-400',
              ],
              [
                'Domaines actifs',
                String(
                  shownRecommendations.filter(
                    (recommendation) => recommendation.status !== 'Résolu',
                  ).length,
                ),
                'text-white',
              ],
              [
                'Score optimisation',
                `${optimizationScore}/100`,
                'text-fuchsia-300',
              ],
            ].map(([label, value, textClass]) => (
              <div
                key={label}
                className={`${card} min-w-0 overflow-hidden p-4`}
              >
                <span className="text-[9px] uppercase leading-4 text-slate-400">
                  {label}
                </span>
                <div
                  className={`mt-2 truncate text-sm font-black ${textClass}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {recommendationLoading && (
            <div className="flex gap-2 text-[11px] text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse des recommandations…
            </div>
          )}

          {shownRecommendations.map((recommendation) => (
            <RecCard
              key={recommendation.id}
              recommendation={recommendation}
              onApply={(item) => {
                try {
                  const key = 'thunder-edge-followed-recommendations';
                  const current = JSON.parse(
                    localStorage.getItem(key) || '[]',
                  );
                  localStorage.setItem(
                    key,
                    JSON.stringify([
                      ...current.filter(
                        (entry: any) => entry.id !== item.id,
                      ),
                      {
                        ...item,
                        addedAt: new Date().toISOString(),
                      },
                    ]),
                  );
                } catch {
                  // Local storage can be unavailable in restricted contexts.
                }
              }}
              onView={setSelectedRecommendation}
              onStatus={(id, status) =>
                setRecommendations((items) =>
                  items.map((item) =>
                    item.id === id ? { ...item, status } : item,
                  ),
                )
              }
            />
          ))}
        </section>
      )}

      {selectedRecommendation && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/80 p-4"
          onClick={() => setSelectedRecommendation(null)}
        >
          <div
            className={`${card} max-h-[85dvh] w-full overflow-y-auto p-5`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <h2 className="break-words text-base font-black">
                {selectedRecommendation.title}
              </h2>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-xl bg-slate-800"
                onClick={() => setSelectedRecommendation(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="mt-4 break-words text-sm leading-6 text-slate-300">
              {selectedRecommendation.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
