import type { Trade } from '../../types/trade';

export interface MobileSharedData {
  trades: Trade[];
  settings: unknown;
  setups: unknown[];
}

export interface MobilePageProps {
  data: MobileSharedData;
}
