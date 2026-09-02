/**
 * Financial Calculation Types and Result Containers.
 */

export interface PnLCalculationInput {
  grossPnL: number | null;
  commission: number | null;
  swap: number | null;
  netPnLProvided?: number | null;
  isNetProvided?: boolean;
}

export interface WinRateResult {
  winRate: number | null; // Percentage e.g. 62.5 or null if 0 closed trades
  wins: number;
  losses: number;
  breakeven: number;
  open: number;
  closed: number;
  total: number;
}

export interface ProfitFactorResult {
  profitFactor: number | null; // null if no trades or 0/0, Infinity if only wins
  grossProfit: number;
  grossLoss: number;
}

export interface ExpectancyResult {
  rExpectancy: number | null;      // sum(R) / countOfValidRTrades (null if < 1 valid R trade)
  moneyExpectancy: number | null;  // sum(netPnL) / countOfClosedTrades (null if 0 closed trades)
  validRTradesCount: number;
  totalClosedTradesCount: number;
}

export interface DrawdownPoint {
  tradeId: string;
  date: string;
  balance: number;
  peak: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface DrawdownResult {
  maxDrawdown: number;          // Absolute monetary drawdown from peak
  maxDrawdownPercent: number;   // Max percentage drawdown from peak
  currentDrawdown: number;
  currentDrawdownPercent: number;
  peakBalance: number;
  currentBalance: number;
  equityCurve: DrawdownPoint[];
  recoveryTrades?: number | null; // trades to recover max drawdown
  recoveryDays?: number | null;   // days to recover max drawdown
  isMaxDrawdownRecovered?: boolean;
  maxDrawdownPeakDate?: string | null;
  maxDrawdownTroughDate?: string | null;
  maxDrawdownRecoveryDate?: string | null;
}

export interface StreakResult {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreakType: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'NONE';
  currentStreakCount: number;
}

export interface ComprehensivePerformanceMetrics {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: WinRateResult;
  profitFactor: ProfitFactorResult;
  expectancy: ExpectancyResult;
  drawdown: DrawdownResult;
  streaks: StreakResult;
  netPnLSum: number;
  grossPnLSum: number;
  commissionsSum: number;
  swapsSum: number;
  avgWin: number | null;
  avgLoss: number | null;
  winLossRatio: number | null;
}
