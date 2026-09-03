/**
 * Core Trade Data Model for Thunder Edge Phase 1.
 * Strict typing with null semantics for missing/unknown data.
 */

export type TradeDirection = 'BUY' | 'SELL';

export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export type DataQuality = 'VERIFIED' | 'PARTIAL' | 'NEEDS_REVIEW';

export type TradingSession = 'SYDNEY' | 'TOKYO' | 'LONDON' | 'NEW_YORK' | 'CUSTOM' | 'Killzone London' | 'Killzone New York' | 'Killzone London Close' | 'Hors Killzone' | 'NO_SESSION' | null;

export type Timeframe =
  | 'M1'
  | 'M5'
  | 'M15'
  | 'M30'
  | 'H1'
  | 'H4'
  | 'D1'
  | 'W1'
  | 'MN'
  | string
  | null;

export type EmotionType =
  | 'CONFIDENT'
  | 'NEUTRAL'
  | 'FEARFUL'
  | 'GREEDY'
  | 'REVENGE'
  | 'DISCIPLINED'
  | 'ANXIOUS'
  | 'EUPHORIC'
  | string
  | null;

export type MistakeType =
  | 'NONE'
  | 'FOMO'
  | 'EARLY_EXIT'
  | 'CHASED_ENTRY'
  | 'OVERSIZED'
  | 'NO_STOP_LOSS'
  | 'MOVED_SL'
  | 'RULE_VIOLATION'
  | 'OVERTRADING'
  | 'HESITATION'
  | string
  | null;

export interface Trade {
  // Identification
  id: string;
  ticket: string | null;
  sourceId: string; // Deterministic fingerprint for duplicate prevention
  brokerSource?: string | null;

  // Timestamps & Timezone
  openedAt: string; // ISO 8601 string
  closedAt: string | null; // ISO 8601 string (null if OPEN)
  timezone: string; // e.g. "UTC", "America/New_York", "Europe/Paris"

  // Market & Position
  symbol: string; // Normalized uppercase string (e.g. "XAUUSD", "EURUSD")
  direction: TradeDirection;

  // Execution Prices
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;

  // Position Sizing
  quantity: number | null;
  lotSize: number | null;
  contractSize: number | null;

  // Financial Results (unknown is null, NEVER 0)
  grossPnL: number | null;
  commission: number | null;
  swap: number | null;
  netPnL: number | null;

  // Risk & Performance (unknown is null, NEVER 0)
  initialRiskAmount: number | null;
  riskPercent: number | null;
  rMultiple: number | null;

  // Account Context
  balanceBefore: number | null;
  balanceAfter: number | null;

  // Contextual Metas & Setup System
  session: TradingSession;
  timeframe: Timeframe;
  setup: string | null;
  setupId?: string | null;

  // ICT / SMC / Extended Context (strictly null if unrecorded)
  htfBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
  liquidityTaken?: string | null;
  irlErl?: 'IRL_TO_ERL' | 'ERL_TO_IRL' | 'CONSOLIDATION' | null;
  mss?: boolean | null;
  cisd?: boolean | null;
  displacement?: boolean | null;
  fvg?: boolean | null;
  ifvg?: boolean | null;
  ob?: boolean | null;
  killzone?: 'LONDON_OPEN' | 'NY_AM' | 'NY_PM' | 'ASIA' | 'OFF_HOURS' | string | null;
  entryModel?: string | null;
  confirmation?: string | null;
  slModel?: string | null;
  tpModel?: string | null;

  // Qualitative & Psychology
  notes: string | null;
  emotion: EmotionType;
  mistake: MistakeType;

  // Categorization
  tags: string[];

  // Attachments
  screenshotBefore: string | null;
  screenshotAfter: string | null;

  // Operational State
  status: TradeStatus;
  dataQuality: DataQuality;

  // System Auditing
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export type NewTradeInput = Omit<
  Trade,
  'id' | 'sourceId' | 'createdAt' | 'updatedAt' | 'dataQuality' | 'netPnL' | 'riskPercent' | 'rMultiple' | 'balanceAfter'
> & {
  id?: string;
  sourceId?: string;
  netPnL?: number | null;
  riskPercent?: number | null;
  rMultiple?: number | null;
  balanceAfter?: number | null;
  createdAt?: string;
  updatedAt?: string;
  dataQuality?: DataQuality;
};
