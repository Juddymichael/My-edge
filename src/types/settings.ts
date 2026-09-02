/**
 * Application & User Settings Model.
 */

export type AppTheme = 'dark' | 'light' | 'system';

export interface SessionConfig {
  name: string;
  startHourUtc: number; // 0-23
  endHourUtc: number;   // 0-23
}

export interface UserSettings {
  id: string;
  timezone: string; // e.g. "UTC", "Europe/Paris", "America/New_York"
  currency: string; // e.g. "USD", "EUR", "GBP"
  defaultRisk: number | null; // default risk in % or fixed currency
  defaultRiskType: 'PERCENT' | 'FIXED';
  sessionSettings: {
    sydney: { enabled: boolean; startUtc: number; endUtc: number };
    tokyo: { enabled: boolean; startUtc: number; endUtc: number };
    london: { enabled: boolean; startUtc: number; endUtc: number };
    newYork: { enabled: boolean; startUtc: number; endUtc: number };
  };
  theme: AppTheme;
  initialAccountBalance: number;
  updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'default_settings',
  timezone: 'UTC',
  currency: 'USD',
  defaultRisk: 1.0,
  defaultRiskType: 'PERCENT',
  sessionSettings: {
    sydney: { enabled: true, startUtc: 21, endUtc: 6 },
    tokyo: { enabled: true, startUtc: 0, endUtc: 9 },
    london: { enabled: true, startUtc: 7, endUtc: 16 },
    newYork: { enabled: true, startUtc: 13, endUtc: 22 },
  },
  theme: 'dark',
  initialAccountBalance: 10000,
  updatedAt: new Date().toISOString(),
};
