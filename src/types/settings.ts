/**
 * Application & User Settings Model.
 */

export type AppTheme = 'dark' | 'light' | 'system';

export type RiskPatternSettings = {
  revengeWindowMinutes: number;
  revengeMinLotMultiplier: number;
  lossStreakThreshold: number;
  overtradingDailyMultiplier: number;
  abnormalLotMultiplier: number;
  recentWinrateWindow: number;
  recentWinrateDropPoints: number;
  outsideKillzoneMinTrades: number;
  outsideKillzonePerformanceGap: number;
};

export interface SessionConfig { name: string; startHourUtc: number; endHourUtc: number; }

export interface UserSettings {
  id: string;
  timezone: string;
  currency: string;
  defaultRisk: number | null;
  defaultRiskType: 'PERCENT' | 'FIXED';
  sessionSettings: {
    sydney: { enabled: boolean; startUtc: number; endUtc: number };
    tokyo: { enabled: boolean; startUtc: number; endUtc: number };
    london: { enabled: boolean; startUtc: number; endUtc: number };
    newYork: { enabled: boolean; startUtc: number; endUtc: number };
  };
  riskPatternSettings: RiskPatternSettings;
  theme: AppTheme;
  initialAccountBalance: number;
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'default_settings', timezone: 'UTC', currency: 'USD', defaultRisk: 1.0, defaultRiskType: 'PERCENT',
  sessionSettings: {
    sydney: { enabled: true, startUtc: 21, endUtc: 6 }, tokyo: { enabled: true, startUtc: 0, endUtc: 9 },
    london: { enabled: true, startUtc: 7, endUtc: 16 }, newYork: { enabled: true, startUtc: 13, endUtc: 22 },
  },
  riskPatternSettings: {
    revengeWindowMinutes: 15, revengeMinLotMultiplier: 1.5, lossStreakThreshold: 4,
    overtradingDailyMultiplier: 2, abnormalLotMultiplier: 3, recentWinrateWindow: 20,
    recentWinrateDropPoints: 15, outsideKillzoneMinTrades: 10, outsideKillzonePerformanceGap: 10,
  },
  theme: 'dark', initialAccountBalance: 10000, updatedAt: new Date().toISOString(),
};
