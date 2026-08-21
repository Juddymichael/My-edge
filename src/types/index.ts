export type TradeSide = 'BUY' | 'SELL';

export type TradeOutcome = 'Win' | 'Loss' | 'BE';

export type AccountTransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface AccountTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  type: AccountTransactionType;
  amount: number; // positive number (e.g. 500 for deposit, 200 for withdrawal)
  description?: string;
  currency?: string;
  source: 'Imported PDF' | 'Imported CSV' | 'Imported XLSX' | 'Imported JSON' | 'Manual Entry' | 'Initial Balance' | 'Sample Dataset' | 'Initial Account Setup';
  importBatchId?: string;
  createdAt: string;
}

export interface AccountBalanceSummary {
  startingBalance: number;
  initialCapital: number;
  totalDeposited: number;
  totalWithdrawn: number;
  netCashFlow: number;
  totalTradingPnL: number;
  currentBalance: number;
  depositsCount: number;
  withdrawalsCount: number;
}

export type ImportItemClassification = 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL' | 'AMBIGUOUS' | 'IGNORE';

export interface AmbiguousImportRow {
  id: string;
  rawText: string;
  suggestedType: ImportItemClassification;
  confidenceReason: string;
  date: string;
  symbol?: string;
  amountOrPnL: number;
  tradeCandidate?: Partial<Trade>;
  transactionCandidate?: Partial<AccountTransaction>;
  userDecision?: ImportItemClassification;
}

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  symbol: string; // e.g. EURUSD, XAUUSD
  side: TradeSide;
  entry?: number;
  exit?: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize?: number;
  commission?: number;
  swap?: number;
  grossPnL?: number;
  netPnL: number;
  currency?: string;
  rMultiple?: number;
  confluenceDxy?: boolean;
  outcome?: TradeOutcome;
  killzone?: string;
  setup?: string;
  tags?: string[];
  notes?: string;
  preTradePlan?: string;
  postTradeReview?: string;
  source: 'Imported PDF' | 'Imported CSV' | 'Imported XLSX' | 'Imported JSON' | 'Manual Entry' | 'Sample Dataset';
  importBatchId?: string;
  createdAt: string;
}

export interface TradeValidationWarning {
  tradeIndex: number;
  field: string;
  message: string;
}

export interface PendingImportSummary {
  batchId: string;
  fileName: string;
  fileType: string;
  rawText?: string;
  totalDetected: number;
  trades: Trade[];
  deposits: AccountTransaction[];
  withdrawals: AccountTransaction[];
  ambiguousRows: AmbiguousImportRow[];
  tradesCount: number;
  depositsCount: number;
  withdrawalsCount: number;
  duplicatesCount: number;
  validDatesCount: number;
  validSymbolsCount: number;
  validPnLCount: number;
  missingEntryCount: number;
  missingStopLossCount: number;
  missingCommissionCount: number;
  warnings: TradeValidationWarning[];
  duplicates: DuplicateMatch[];
}

export interface DuplicateMatch {
  existingTrade: Trade;
  incomingTrade: Trade;
  reason: string;
}

export interface TradeFilterState {
  startDate: string;
  endDate: string;
  symbol: string;
  side: string;
  killzone: string;
  setup: string;
  tag: string;
  outcome: string;
  searchQuery: string;
}

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  beTrades: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  winrate: number | null; // percentage e.g. 62.4
  lossRate: number | null; // percentage e.g. 37.6
  profitFactor: number | null; // null if Gross Loss is 0
  avgWin: number | null;
  avgLoss: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  expectancy: number | null;
  expectancyR?: number | null;
  avgTrade: number | null;
  maxDrawdownAmount: number | null;
  maxDrawdownPercent: number | null;
  avgRisk: number | null;
  avgR: number | null;
  bestR: number | null;
  worstR: number | null;
  riskRewardRatio: number | null;
  winStreak: number;
  lossStreak: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  bestWeek: { weekStr: string; pnl: number } | null;
  worstWeek: { weekStr: string; pnl: number } | null;
  bestMonth: { monthStr: string; pnl: number } | null;
  worstMonth: { monthStr: string; pnl: number } | null;
}

export type StatisticalConfidence = 'high' | 'moderate' | 'indicative' | 'low';

export interface EdgeGroupMetric {
  key: string;
  label: string;
  totalTrades: number;
  winrate: number | null;
  profitFactor: number | null;
  totalPnL: number;
  avgR: number | null;
  expectancy: number | null;
  expectancyR?: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  avgWinR?: number | null;
  avgLossR?: number | null;
  maxDrawdownAmount?: number | null;
  maxDrawdownPercent?: number | null;
  riskRewardRatio?: number | null;
  confidenceLevel?: StatisticalConfidence;
  edgeScore?: number;
  trades?: Trade[];
}

export interface EdgeComboMetric extends EdgeGroupMetric {
  symbol: string;
  killzone: string;
  setup: string;
  side: TradeSide | string;
  edgeScore: number;
}

export interface EdgeAnalysisResult {
  bySymbol: EdgeGroupMetric[];
  bySession: EdgeGroupMetric[];
  byKillzone: EdgeGroupMetric[];
  byDirection: EdgeGroupMetric[];
  bySetup: EdgeGroupMetric[];
  topCombos?: EdgeComboMetric[];
  weakCombos?: EdgeComboMetric[];
  byPlan: {
    plan: EdgeGroupMetric;
    offPlan: EdgeGroupMetric;
  };
  byDxy: {
    withDxy: EdgeGroupMetric;
    withoutDxy: EdgeGroupMetric;
  };
}

export interface ImportBatchRecord {
  id: string;
  fileName: string;
  importedAt: string;
  tradeCount: number;
  depositsCount?: number;
  withdrawalsCount?: number;
  source: string;
}

export type VioletThemeVariant = 'smoothie-berry' | 'smoothie-lavender' | 'smoothie-electric' | 'smoothie-royal' | 'smoothie-tropical';

export interface PropFirmConfig {
  accountBalance: number;
  profitTargetPercent: number;
  dailyLossLimitPercent: number;
  maxDrawdownPercent: number;
  riskPerTradePercent: number;
  maxTradesPerDay: number;
}

export interface UserAppSettings {
  currencySymbol: string;
  startingBalance: number;
  reduceMotion: boolean;
  theme: 'dark' | 'light';
  violetVariant?: VioletThemeVariant;
  planInstruments?: string[];
  propFirmConfig?: PropFirmConfig;
}

export interface TraderPillarScore {
  score: number; // 0-100
  label: string;
  status: 'excellent' | 'good' | 'caution' | 'critical' | 'insufficient';
  reason: string;
}

export interface TraderPerformanceScoreData {
  overallScore: number;
  hasEnoughData: boolean;
  totalTrades: number;
  pillars: {
    setupQuality: TraderPillarScore;
    execution: TraderPillarScore;
    riskManagement: TraderPillarScore;
    discipline: TraderPillarScore;
    tradeManagement: TraderPillarScore;
  };
  summary: {
    yourEdge: string;
    biggestLeak: string;
    behavior: string;
    currentFocus: string;
  };
}

export interface EdgeFinding {
  title: string;
  category: 'setup' | 'session' | 'instrument' | 'direction' | 'dayOfWeek' | 'dxy';
  tradesCount: number;
  winrate: number;
  totalPnL: number;
  avgR: number;
  sampleStatus: 'reliable' | 'caution' | 'small';
  sampleLabel: string;
  description: string;
}

export interface StructuredEdgeItem {
  id: string;
  categoryType: 'setup' | 'session' | 'combination';
  rankingBadge: string; // e.g. "🥇 Best Setup", "🥈 Best Session", "🥉 Best Combination"
  title: string;
  whatWorks: string; // Ce qui fonctionne
  proof: string; // La preuve
  whyInteresting: string; // Pourquoi c'est intéressant
  toContinue: string; // À continuer
  tradesCount: number;
  winrate: number;
  totalR: number;
  totalPnL: number;
  sampleStatus: 'small' | 'growing' | 'reliable';
  sampleLabel: string;
  explanation?: string;
}

export interface StructuredLeakItem {
  id: string;
  leakNumber: number; // 1, 2
  title: string; // e.g. "Sur-trading", "Trades sans Stop Loss"
  observe: string; // Ce que j'observe
  proof: string; // La preuve
  impact: string; // Impact
  action: string; // Ce que tu dois changer
  why: string; // Pourquoi
  tradesCount: number;
  winrate: number;
  totalR: number;
  totalPnL: number;
  sampleStatus: 'small' | 'growing' | 'reliable';
  sampleLabel: string;
  suggests?: string;
}

export interface EdgeLeakCombination {
  combinationKey: string;
  title: string;
  setup: string;
  session: string;
  symbol: string;
  tradesCount: number;
  winrate: number;
  totalR: number;
  totalPnL: number;
  sampleStatus: 'small' | 'growing' | 'reliable';
  sampleLabel: string;
}

export interface LeakFinding {
  title: string;
  category: string;
  tradesCount: number;
  winrate: number;
  totalPnL: number;
  avgR: number;
  leakSeverity: 'high' | 'medium' | 'low';
  problemDescription: string;
  actionableRecommendation: string;
  sampleLabel: string;
}

export interface SmartRiskAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  recommendation: string;
  dataBacking: string;
}

export interface DailyCoachSummary {
  date: string;
  tradesCount: number;
  wins: number;
  losses: number;
  be: number;
  winrate: number;
  totalPnL: number;
  totalR: number;
  avgR: number;
  avgRisk: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  todayStrength: string;
  todayWeakness: string;
  behavioralObservation: string;
  tomorrowFocus: string;
}

export interface MonthlyCoachSummary {
  monthKey: string; // "YYYY-MM" e.g. "2026-08"
  monthLabel: string; // e.g. "August 2026" / "Août 2026"
  tradesCount: number;
  wins: number;
  losses: number;
  be: number;
  winrate: number;
  totalPnL: number;
  totalR: number;
  avgR: number;
  profitFactor: number;
  bestEdge: string;
  mainLeak: string;
  whatWentWell: string[];
  whatHurtPerformance: string[];
  behavior: string;
  nextMonthFocus: string;
}

export interface WeeklyCoachSummary {
  weekKey: string; // e.g. "2026-W33"
  label: string;
  tradesCount: number;
  winrate: number;
  profitFactor: number;
  expectancy: number;
  totalR: number;
  avgR: number;
  totalPnL: number;
  maxDrawdownAmount: number;
  bestSetup: string;
  worstSetup: string;
  bestSession: string;
  worstSession: string;
  bestInstrument: string;
  worstInstrument: string;
  avgRisk: number;
  disciplineScore: number;
  executionScore: number;
  overtradingRisk: 'Low' | 'Medium' | 'High';
  biggestStrength: string;
  biggestWeakness: string;
  behavioralPattern: string;
  nextWeekFocus: string;
  oneThingToFix: string;
}

export interface TraderProfileData {
  tradingStyle: string;
  primaryMarket: string;
  preferredSessions: string[];
  bestSetups: string[];
  weakSetups: string[];
  riskDisciplineScore: number;
  executionScore: number;
  patienceScore: number;
  overtradingRisk: 'Low' | 'Medium' | 'High';
  sampleSizeLabel: string;
}

export interface FundedModeEvaluation {
  config: PropFirmConfig;
  currentBalance: number;
  startingBalance: number;
  profitTargetAmount: number;
  dailyLossLimitAmount: number;
  maxDrawdownLimitAmount: number;
  currentPnL: number;
  targetProgressPercent: number;
  maxDrawdownReached: number;
  drawdownDistancePercent: number;
  riskDisciplineScore: number;
  drawdownControlScore: number;
  consistencyScore: number;
  ruleComplianceScore: number;
  overallStatus: 'Safe' | 'Caution' | 'High Risk';
  violations: string[];
  strengths: string[];
}

export interface TradeAiReviewResult {
  trade: Trade;
  rMultiple: number | null;
  isWin: boolean;
  isLoss: boolean;
  planCompliance: 'YES' | 'PARTIALLY' | 'NO' | 'INSUFFICIENT DATA';
  whatWasGood: string[];
  whatCouldBeImproved: string[];
  coachVerdict: string;
  verdictTag: 'A — Valid Loss' | 'A — Valid Win' | 'B — Valid but improvable' | 'C — Plan violation' | 'D — Insufficient info';
  isGoodProcess: boolean;
  detailedAnalysis: string;
}
