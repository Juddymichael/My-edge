import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trade } from '../types/trade';
import { formatCurrency, formatRMultiple } from '../lib/formatting';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';

interface EquityCurveChartProps {
  trades?: Trade[];
  initialBalance?: number;
  currency?: string;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  trades = [],
  initialBalance = 10000,
  currency = 'EUR',
}) => {
  const { isDark } = useTheme();
  const safeTrades = trades || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });
  const [mode, setMode] = useState<'pnl' | 'r'>('pnl');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    trade: Trade;
    cumulativePnL: number;
    cumulativeR: number;
    x: number;
    y: number;
  } | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.max(300, entry.contentRect.width),
            height: 260,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute chronologically sorted closed trades and cumulative curve
  const dataPoints = useMemo(() => {
    const closed = safeTrades
      .filter((t) => t && t.status === 'CLOSED' && (t.netPnL !== null || t.rMultiple !== null))
      .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());

    let runningPnL = 0;
    let runningR = 0;

    return closed.map((trade, idx) => {
      if (trade.netPnL !== null && trade.netPnL !== undefined) runningPnL += trade.netPnL;
      if (trade.rMultiple !== null && trade.rMultiple !== undefined) runningR += trade.rMultiple;
      return {
        trade,
        index: idx + 1,
        cumulativePnL: runningPnL,
        cumulativeR: runningR,
        balance: initialBalance + runningPnL,
      };
    });
  }, [safeTrades, initialBalance]);

  // Scaling math
  const { width, height } = dimensions;
  const padding = { top: 20, right: 24, bottom: 32, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = dataPoints.map((d) => (mode === 'pnl' ? d.cumulativePnL : d.cumulativeR));
  const minValue = Math.min(0, ...(values.length > 0 ? values : [0]));
  const maxValue = Math.max(0, ...(values.length > 0 ? values : [100]));
  const range = maxValue - minValue || 1;

  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + ((index - 1) / (dataPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - ((val - minValue) / range) * chartHeight;
  };

  const zeroY = getY(0);

  // SVG Path generator
  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((d, i) => {
        const x = getX(d.index);
        const y = getY(mode === 'pnl' ? d.cumulativePnL : d.cumulativeR);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [dataPoints, mode, width, height, minValue, maxValue]);

  const areaPath = useMemo(() => {
    if (dataPoints.length === 0 || !linePath) return '';
    const firstX = getX(1);
    const lastX = getX(dataPoints.length);
    return `${linePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }, [linePath, zeroY, dataPoints.length]);

  return (
    <div
      ref={containerRef}
      className="p-6 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between interactive-card"
      id="component-equity-curve"
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-50 dark:bg-[#181C25] text-[#F97316] border border-orange-200/60 dark:border-[#292E38] shadow-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
              Courbe d&apos;Évolution du Capital (Equity Curve)
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-[#9299A8] tabular-nums font-medium">
              <AnimatedNumber value={dataPoints.length} duration={700} /> exécutions clôturées
            </span>
          </div>
        </div>

        {/* Toggle PnL vs R */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] text-xs font-bold shadow-xs">
          <button
            onClick={() => setMode('pnl')}
            className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 btn-press cursor-pointer ${
              mode === 'pnl'
                ? 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
            }`}
          >
            P&amp;L Net ({currency})
          </button>
          <button
            onClick={() => setMode('r')}
            className={`px-3.5 py-1.5 rounded-xl transition-all duration-200 btn-press cursor-pointer ${
              mode === 'r'
                ? 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-[#9299A8] hover:text-slate-900 dark:hover:text-[#F5F5F5]'
            }`}
          >
            R-Multiple (R)
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      {dataPoints.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400 dark:text-[#9299A8] font-medium">
          Aucun historique de trades clôturés pour tracer la courbe.
        </div>
      ) : (
        <div className="relative w-full h-[260px] select-none">
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={isDark ? "0.25" : "0.20"} />
                <stop offset="85%" stopColor="#EA580C" stopOpacity={isDark ? "0.05" : "0.03"} />
                <stop offset="100%" stopColor="#9A3412" stopOpacity="0.0" />
              </linearGradient>
              <clipPath id="equityCurveClip">
                <motion.rect
                  x={padding.left}
                  y={0}
                  height={height}
                  initial={{ width: 0 }}
                  animate={{ width: chartWidth + padding.right }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                />
              </clipPath>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const val = minValue + (maxValue - minValue) * (1 - pct);
              const y = padding.top + pct * chartHeight;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke={isDark ? "#292E38" : "#E2E8F0"}
                    strokeWidth="1"
                    strokeDasharray={pct === 0 || pct === 1 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-slate-500 dark:fill-[#9299A8] tabular-nums font-semibold"
                  >
                    {mode === 'pnl' ? `${Math.round(val)} ${currency}` : `${val.toFixed(1)}R`}
                  </text>
                </g>
              );
            })}

            {/* Zero Baseline */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke={isDark ? "#3B4250" : "#CBD5E1"}
              strokeWidth="1.5"
            />

            {/* Group with Progressive Reveal ClipPath */}
            <g clipPath="url(#equityCurveClip)">
              {/* Area Fill under curve */}
              {areaPath && <path d={areaPath} fill="url(#curveGradient)" />}

              {/* Line Path with Progressive Stroke Drawing */}
              {linePath && (
                <motion.path
                  key={`path-${mode}-${dataPoints.length}`}
                  d={linePath}
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </g>

            {/* Data Point Circles & Hover interaction */}
            {dataPoints.map((d, idx) => {
              const cx = getX(d.index);
              const cy = getY(mode === 'pnl' ? d.cumulativePnL : d.cumulativeR);
              const isHovered = hoveredPoint?.index === d.index;

              return (
                <g key={d.index}>
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5 : 2.5}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.15 + (idx / Math.max(1, dataPoints.length)) * 0.7,
                      duration: 0.25,
                      ease: 'easeOut',
                    }}
                    className={`transition-colors duration-150 ${
                      isHovered
                        ? isDark
                          ? 'fill-[#F97316] stroke-[#0B0D12] stroke-2 shadow-md'
                          : 'fill-[#F97316] stroke-white stroke-2 shadow-md'
                        : 'fill-[#F97316] hover:fill-[#FDBA74]'
                    }`}
                  />
                  {/* Invisible broad hitbox */}
                  <rect
                    x={cx - 10}
                    y={padding.top}
                    width={20}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        index: d.index,
                        trade: d.trade,
                        cumulativePnL: d.cumulativePnL,
                        cumulativeR: d.cumulativeR,
                        x: cx,
                        y: cy,
                      })
                    }
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 pointer-events-none bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md text-slate-900 dark:text-[#F5F5F5] p-3 rounded-2xl text-xs shadow-xl border border-slate-200 dark:border-[#292E38] transform -translate-x-1/2 -translate-y-full -mt-2.5 min-w-[160px]"
              style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
            >
              <div className="font-semibold text-slate-900 dark:text-[#F5F5F5] flex items-center justify-between border-b border-slate-100 dark:border-[#292E38] pb-1.5 mb-1.5">
                <span>{hoveredPoint.trade.symbol}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${hoveredPoint.trade.direction === 'BUY' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'}`}>
                  {hoveredPoint.trade.direction}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#9299A8] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">P&amp;L Trade :</span>
                  <span className={`tabular-nums font-bold ${hoveredPoint.trade.netPnL && hoveredPoint.trade.netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(hoveredPoint.trade.netPnL, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#9299A8]">Multiple R :</span>
                  <span className="tabular-nums font-bold text-slate-900 dark:text-[#F5F5F5]">{formatRMultiple(hoveredPoint.trade.rMultiple)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-[#292E38] pt-1 text-[#EA580C] dark:text-[#FDBA74] font-bold">
                  <span>Cumul {mode === 'pnl' ? 'PnL' : 'R'} :</span>
                  <span className="tabular-nums">
                    {mode === 'pnl'
                      ? formatCurrency(hoveredPoint.cumulativePnL, currency)
                      : formatRMultiple(hoveredPoint.cumulativeR)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

