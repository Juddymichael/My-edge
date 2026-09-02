import { z } from 'zod';

export const TradeDirectionSchema = z.enum(['BUY', 'SELL']);
export const TradeStatusSchema = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);
export const DataQualitySchema = z.enum(['VERIFIED', 'PARTIAL', 'NEEDS_REVIEW']);
export const TradingSessionSchema = z.enum(['SYDNEY', 'TOKYO', 'LONDON', 'NEW_YORK', 'CUSTOM']).nullable();

export const TradeSchema = z.object({
  id: z.string().min(1, 'Trade ID is required'),
  ticket: z.string().nullable(),
  sourceId: z.string().min(1, 'Source ID / Fingerprint is required'),
  brokerSource: z.string().nullable().optional(),

  openedAt: z.string().datetime({ message: 'openedAt must be a valid ISO 8601 datetime' }),
  closedAt: z.string().datetime({ message: 'closedAt must be a valid ISO 8601 datetime' }).nullable(),
  timezone: z.string().min(1, 'Timezone is required'),

  symbol: z.string().min(1, 'Symbol is required'),
  direction: TradeDirectionSchema,

  entryPrice: z.number().positive().nullable(),
  exitPrice: z.number().positive().nullable(),
  stopLoss: z.number().positive().nullable(),
  takeProfit: z.number().positive().nullable(),

  quantity: z.number().positive().nullable(),
  lotSize: z.number().positive().nullable(),
  contractSize: z.number().positive().nullable(),

  // Financials: null allowed, never forced to 0
  grossPnL: z.number().nullable(),
  commission: z.number().nullable(),
  swap: z.number().nullable(),
  netPnL: z.number().nullable(),

  initialRiskAmount: z.number().positive().nullable(),
  riskPercent: z.number().positive().nullable(),
  rMultiple: z.number().nullable(),

  balanceBefore: z.number().positive().nullable(),
  balanceAfter: z.number().positive().nullable(),

  session: TradingSessionSchema,
  timeframe: z.string().nullable(),
  setup: z.string().nullable(),
  setupId: z.string().nullable().optional(),

  // Extended Setup Context
  htfBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']).nullable().optional(),
  liquidityTaken: z.string().nullable().optional(),
  irlErl: z.enum(['IRL_TO_ERL', 'ERL_TO_IRL', 'CONSOLIDATION']).nullable().optional(),
  mss: z.boolean().nullable().optional(),
  cisd: z.boolean().nullable().optional(),
  displacement: z.boolean().nullable().optional(),
  fvg: z.boolean().nullable().optional(),
  ifvg: z.boolean().nullable().optional(),
  ob: z.boolean().nullable().optional(),
  killzone: z.string().nullable().optional(),
  entryModel: z.string().nullable().optional(),
  confirmation: z.string().nullable().optional(),
  slModel: z.string().nullable().optional(),
  tpModel: z.string().nullable().optional(),

  notes: z.string().nullable(),
  emotion: z.string().nullable(),
  mistake: z.string().nullable(),

  tags: z.array(z.string()),

  screenshotBefore: z.string().nullable(),
  screenshotAfter: z.string().nullable(),

  status: TradeStatusSchema,
  dataQuality: DataQualitySchema,

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ValidatedTrade = z.infer<typeof TradeSchema>;
