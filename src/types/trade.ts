/**
 * Core Trade Data Model for Thunder Edge Phase 1.
 * Strict typing with null semantics for missing/unknown data.
 */

export type TradeDirection = 'BUY' | 'SELL';

export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export type DataQuality = 'VERIFIED' | 'PARTIAL' | 'NEEDS_REVIEW';

export type TradingKillzone = 'SYDNEY' | 'TOKYO' | 'OFF_HOURS' | 'LONDON' | 'NEW_YORK' | 'CUSTOM' | 'Killzone Londres' | 'Killzone New York' | 'Killzone London Close' | 'Killzone Asia' | 'Killzone Sydney' | 'Hors Killzone' | 'NO_SESSION' | null;

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
  id: string;
  ticket: string | null;
  sourceId: string;
  brokerSource?: string | null;
  openedAt: string;
  closedAt: string | null;
  timezone: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number | null;
  lotSize: number | null;
  contractSize: number | null;
  grossPnL: number | null;
  commission: number | null;
  swap: number | null;
  netPnL: number | null;
  initialRiskAmount: number | null;
  riskPercent: number | null;
  rMultiple: number | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  session: TradingKillzone;
  timeframe: Timeframe;
  setup: string | null;
  setupId?: string | null;
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
  notes: string | null;
  emotion: EmotionType;
  mistake: MistakeType;
  tags: string[];
  screenshotBefore: string | null;
  screenshotAfter: string | null;
  status: TradeStatus;
  dataQuality: DataQuality;
  createdAt: string;
  updatedAt: string;
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
