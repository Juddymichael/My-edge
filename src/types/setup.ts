/**
 * Trading Setup and Entry Model definitions for Thunder Edge Phase 2.
 */

export interface Setup {
  id: string;
  name: string;
  shortName: string;
  category: 'FVG' | 'Market Structure' | 'Order Flow' | 'Liquidity' | 'Reversal' | 'Trend' | string;
  description: string;
  rules: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EntryModel {
  id: string;
  name: string;
  setupId: string;
  description?: string;
  enabled: boolean;
}

export type HtfBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;

export type KillzoneType =
  | 'LONDON_OPEN'
  | 'NY_AM'
  | 'NY_PM'
  | 'ASIA'
  | 'OFF_HOURS'
  | string
  | null;

export type IrlErlType = 'IRL_TO_ERL' | 'ERL_TO_IRL' | 'CONSOLIDATION' | null;

/**
 * Extensible Context for ICT / Smart Money / Technical execution attributes.
 * Strictly preserves null for unrecorded metrics ("Not recorded" in UI).
 */
export interface TradeSetupContext {
  setupId?: string | null;
  htfBias?: HtfBias;
  liquidityTaken?: string | null; // e.g. "BSL", "SSL", "Asian High", "PDH", "PDL"
  irlErl?: IrlErlType;
  mss?: boolean | null;            // Market Structure Shift
  cisd?: boolean | null;           // Change In State of Delivery
  displacement?: boolean | null;   // Energetic candle movement
  fvg?: boolean | null;            // Fair Value Gap presence
  ifvg?: boolean | null;           // Inverse Fair Value Gap
  ob?: boolean | null;             // Order Block
  killzone?: KillzoneType;
  entryModel?: string | null;
  confirmation?: string | null;
  slModel?: string | null;         // e.g. "Swing High/Low", "FVG High", "OB Base"
  tpModel?: string | null;         // e.g. "Opposing Liquidity", "Internal FVG", "Fixed 2R"
}

export const DEFAULT_SETUPS: Setup[] = [
  {
    id: 'setup-golden-fvg',
    name: 'Golden FVG',
    shortName: 'Golden FVG',
    category: 'FVG',
    description: 'Optimal Fair Value Gap within a high-probability discount or premium key market zone with institutional displacement.',
    rules: [
      'Displacement creating a clean 3-candle Fair Value Gap',
      'HTF narrative and bias alignment',
      'Entry at 50% equilibrium or open of the FVG',
      'Target opposing external liquidity pool',
    ],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'setup-cisd-mss-2022',
    name: 'CISD + MSS 2022',
    shortName: 'CISD + MSS',
    category: 'Market Structure',
    description: 'Change In State of Delivery followed by structural Market Structure Shift across key swing points.',
    rules: [
      'Liquidity sweep of key session or daily level',
      'Aggressive displacement creating CISD and breaking market structure',
      'Clean market structure shift with body close beyond swing point',
      'Entry on retest of newly formed imbalance or breaker',
    ],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'setup-order-block',
    name: 'Order Block',
    shortName: 'OB',
    category: 'Order Flow',
    description: 'Institutional order block formed prior to energetic impulse move and structure breach.',
    rules: [
      'Last down-candle before bullish move or up-candle before bearish move',
      'Validates with displacement breaking structure',
      'Entry on mitigation/tap of order block open or mean threshold',
      'Invalidation if price closes beyond order block body',
    ],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'setup-ifvg',
    name: 'Inverse Fair Value Gap',
    shortName: 'IFVG',
    category: 'FVG',
    description: 'Disrespected/inverted Fair Value Gap acting as support or resistance upon reclaim.',
    rules: [
      'Prior FVG failed to hold and was impulsively closed through',
      'Price returns to test the backside of the disrespected gap',
      'Acts as immediate polarity inversion flip zone',
      'Strict invalidation on full re-entry into old range',
    ],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'setup-fvg',
    name: 'Fair Value Gap',
    shortName: 'FVG',
    category: 'FVG',
    description: 'Standard 3-bar imbalance between candle 1 high and candle 3 low indicating liquidity inefficiency.',
    rules: [
      'Clear visible gap between wick 1 and wick 3',
      'Formed during active session killzone',
      'Target opposing session liquidity',
    ],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
