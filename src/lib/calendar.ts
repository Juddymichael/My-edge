import { Trade } from '../types/trade';

export interface DayTradeStats {
  dateStr: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  trades: Trade[];
  tradeCount: number;
  netPnL: number;
  grossPnL: number;
  commission: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  avgPnL: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
}

export interface WeekTradeStats {
  weekIndex: number;
  days: DayTradeStats[];
  totalTrades: number;
  netPnL: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
}

export interface MonthTradeStats {
  year: number;
  month: number; // 0-11
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // e.g. 'Août 2026'
  weeks: WeekTradeStats[];
  totalTrades: number;
  netPnL: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  tradingDaysCount: number;
  winningDaysCount: number;
  losingDaysCount: number;
  breakEvenDaysCount: number;
  bestDay: { dateStr: string; netPnL: number } | null;
  worstDay: { dateStr: string; netPnL: number } | null;
  avgDailyPnL: number;
  avgTradePnL: number;
  trades: Trade[];
}

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/**
 * Extracts standard YYYY-MM-DD from a trade date string.
 */
export function getTradeDateKey(trade: Trade): string {
  const dateStr = trade.closedAt || trade.openedAt;
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates metrics for a specific list of trades on a given day.
 */
export function calculateDayStats(
  dateStr: string,
  dayNumber: number,
  isCurrentMonth: boolean,
  dayTrades: Trade[]
): DayTradeStats {
  const closedTrades = dayTrades.filter((t) => t && t.status === 'CLOSED');
  const count = closedTrades.length;

  let netPnL = 0;
  let grossPnL = 0;
  let commission = 0;
  let winCount = 0;
  let lossCount = 0;
  let beCount = 0;
  let totalWinPnL = 0;
  let totalLossPnL = 0;
  let bestTrade: Trade | null = null;
  let worstTrade: Trade | null = null;

  for (const trade of closedTrades) {
    const pnl = trade.netPnL ?? 0;
    netPnL += pnl;
    grossPnL += trade.grossPnL ?? pnl;
    commission += trade.commission ?? 0;

    if (pnl > 0.001) {
      winCount++;
      totalWinPnL += pnl;
    } else if (pnl < -0.001) {
      lossCount++;
      totalLossPnL += Math.abs(pnl);
    } else {
      beCount++;
    }

    if (!bestTrade || pnl > (bestTrade.netPnL ?? -Infinity)) {
      bestTrade = trade;
    }
    if (!worstTrade || pnl < (worstTrade.netPnL ?? Infinity)) {
      worstTrade = trade;
    }
  }

  const winRate = count > 0 ? (winCount / count) * 100 : 0;
  const avgPnL = count > 0 ? netPnL / count : 0;
  const avgWin = winCount > 0 ? totalWinPnL / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossPnL / lossCount : 0;
  const profitFactor = totalLossPnL > 0 ? totalWinPnL / totalLossPnL : totalWinPnL > 0 ? 99.99 : null;

  return {
    dateStr,
    dayNumber,
    isCurrentMonth,
    trades: closedTrades,
    tradeCount: count,
    netPnL: Math.round(netPnL * 100) / 100,
    grossPnL: Math.round(grossPnL * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    winningTrades: winCount,
    losingTrades: lossCount,
    breakEvenTrades: beCount,
    winRate: Math.round(winRate * 10) / 10,
    avgPnL: Math.round(avgPnL * 100) / 100,
    bestTrade,
    worstTrade,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: profitFactor !== null ? Math.round(profitFactor * 100) / 100 : null,
  };
}

/**
 * Builds the full month matrix (weeks of 7 days starting Monday) with weekly and monthly statistics.
 */
export function buildMonthCalendar(year: number, month: number, allTrades: Trade[]): MonthTradeStats {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES_FR[month]} ${year}`;

  // Filter only closed executed trades (excluding cancelled, open or unexecuted orders)
  const closedTradesList = allTrades.filter((t) => t && t.status === 'CLOSED');

  // Index trades by dateStr
  const tradesByDate = new Map<string, Trade[]>();
  const monthTrades: Trade[] = [];

  for (const trade of closedTradesList) {
    const dKey = getTradeDateKey(trade);
    if (!dKey) continue;
    if (!tradesByDate.has(dKey)) {
      tradesByDate.set(dKey, []);
    }
    tradesByDate.get(dKey)!.push(trade);

    if (dKey.startsWith(monthKey)) {
      monthTrades.push(trade);
    }
  }

  // Days in current month
  const totalDaysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // First day of current month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeekIndex = new Date(Date.UTC(year, month, 1)).getUTCDay();
  // We want Monday = 0, ..., Sunday = 6
  const mondayOffset = (firstDayOfWeekIndex + 6) % 7;

  // Days in previous month
  const prevMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const calendarDays: DayTradeStats[] = [];

  // 1. Previous month padding days
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayTrades = tradesByDate.get(dateStr) || [];
    calendarDays.push(calculateDayStats(dateStr, dayNum, false, dayTrades));
  }

  // 2. Current month days
  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayTrades = tradesByDate.get(dateStr) || [];
    calendarDays.push(calculateDayStats(dateStr, dayNum, true, dayTrades));
  }

  // 3. Next month padding days to complete full week
  const remainder = calendarDays.length % 7;
  if (remainder !== 0) {
    const daysToAdd = 7 - remainder;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let dayNum = 1; dayNum <= daysToAdd; dayNum++) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayTrades = tradesByDate.get(dateStr) || [];
      calendarDays.push(calculateDayStats(dateStr, dayNum, false, dayTrades));
    }
  }

  // Split into weekly chunks
  const weeks: WeekTradeStats[] = [];
  for (let w = 0; w < calendarDays.length; w += 7) {
    const weekDays = calendarDays.slice(w, w + 7);
    let wTrades = 0;
    let wNetPnL = 0;
    let wWins = 0;
    let wLosses = 0;
    let wBe = 0;

    for (const d of weekDays) {
      wTrades += d.tradeCount;
      wNetPnL += d.netPnL;
      wWins += d.winningTrades;
      wLosses += d.losingTrades;
      wBe += d.breakEvenTrades;
    }

    const wWinRate = wTrades > 0 ? (wWins / wTrades) * 100 : 0;

    weeks.push({
      weekIndex: Math.floor(w / 7) + 1,
      days: weekDays,
      totalTrades: wTrades,
      netPnL: Math.round(wNetPnL * 100) / 100,
      winningTrades: wWins,
      losingTrades: wLosses,
      breakEvenTrades: wBe,
      winRate: Math.round(wWinRate * 10) / 10,
    });
  }

  // Calculate monthly summary
  let mTotalTrades = 0;
  let mNetPnL = 0;
  let mGrossProfit = 0;
  let mGrossLoss = 0;
  let mWins = 0;
  let mLosses = 0;
  let mBe = 0;
  let tradingDays = 0;
  let winningDays = 0;
  let losingDays = 0;
  let beDays = 0;
  let bestDay: { dateStr: string; netPnL: number } | null = null;
  let worstDay: { dateStr: string; netPnL: number } | null = null;

  for (const d of calendarDays) {
    if (!d.isCurrentMonth) continue;

    if (d.tradeCount > 0) {
      tradingDays++;
      mTotalTrades += d.tradeCount;
      mNetPnL += d.netPnL;
      mWins += d.winningTrades;
      mLosses += d.losingTrades;
      mBe += d.breakEvenTrades;

      if (d.netPnL > 0.001) {
        winningDays++;
      } else if (d.netPnL < -0.001) {
        losingDays++;
      } else {
        beDays++;
      }

      if (!bestDay || d.netPnL > bestDay.netPnL) {
        bestDay = { dateStr: d.dateStr, netPnL: d.netPnL };
      }
      if (!worstDay || d.netPnL < worstDay.netPnL) {
        worstDay = { dateStr: d.dateStr, netPnL: d.netPnL };
      }

      for (const t of d.trades) {
        const pnl = t.netPnL ?? 0;
        if (pnl > 0) mGrossProfit += pnl;
        else if (pnl < 0) mGrossLoss += Math.abs(pnl);
      }
    }
  }

  const mWinRate = mTotalTrades > 0 ? (mWins / mTotalTrades) * 100 : 0;
  const mProfitFactor = mGrossLoss > 0 ? mGrossProfit / mGrossLoss : mGrossProfit > 0 ? 99.99 : null;
  const avgDailyPnL = tradingDays > 0 ? mNetPnL / tradingDays : 0;
  const avgTradePnL = mTotalTrades > 0 ? mNetPnL / mTotalTrades : 0;

  return {
    year,
    month,
    monthKey,
    monthLabel,
    weeks,
    totalTrades: mTotalTrades,
    netPnL: Math.round(mNetPnL * 100) / 100,
    grossProfit: Math.round(mGrossProfit * 100) / 100,
    grossLoss: Math.round(mGrossLoss * 100) / 100,
    profitFactor: mProfitFactor !== null ? Math.round(mProfitFactor * 100) / 100 : null,
    winningTrades: mWins,
    losingTrades: mLosses,
    breakEvenTrades: mBe,
    winRate: Math.round(mWinRate * 10) / 10,
    tradingDaysCount: tradingDays,
    winningDaysCount: winningDays,
    losingDaysCount: losingDays,
    breakEvenDaysCount: beDays,
    bestDay,
    worstDay,
    avgDailyPnL: Math.round(avgDailyPnL * 100) / 100,
    avgTradePnL: Math.round(avgTradePnL * 100) / 100,
    trades: monthTrades,
  };
}

/**
 * Extracts and aggregates all historical months that contain trades, sorted newest to oldest.
 */
export function getAllTradingMonths(allTrades: Trade[]): MonthTradeStats[] {
  const monthsMap = new Map<string, { year: number; month: number }>();
  const closedTrades = allTrades.filter((t) => t && t.status === 'CLOSED');

  for (const trade of closedTrades) {
    const dateStr = trade.closedAt || trade.openedAt;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;

    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (!monthsMap.has(key)) {
      monthsMap.set(key, { year: y, month: m });
    }
  }

  // If no trades exist yet, default to current month
  if (monthsMap.size === 0) {
    const now = new Date();
    const curY = now.getUTCFullYear();
    const curM = now.getUTCMonth();
    const key = `${curY}-${String(curM + 1).padStart(2, '0')}`;
    monthsMap.set(key, { year: curY, month: curM });
  }

  // Sort keys descending (newest first)
  const sortedKeys = Array.from(monthsMap.keys()).sort().reverse();

  return sortedKeys.map((key) => {
    const { year, month } = monthsMap.get(key)!;
    return buildMonthCalendar(year, month, allTrades);
  });
}
