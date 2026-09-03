import { Trade, TradingSession } from '../types/trade';

export const APP_TIMEZONE_OFFSET_HOURS = 3;

export const SESSION_LABELS = {
  ASIA: 'Asia',
  LONDON: 'London',
  NEW_YORK: 'New York',
  LONDON_CLOSE: 'London Close',
  OFF_SESSION: 'Hors session',
} as const;

/**
 * Converts an instant to the app's fixed UTC+3 clock (Madagascar time).
 * We deliberately use a fixed offset here because the app currently operates
 * on UTC+3 and the broker CSVs do not reliably carry a session field.
 */
export function getAppHour(dateString: string): number {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 0;
  const utcHour = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  return (utcHour + APP_TIMEZONE_OFFSET_HOURS + utcMinutes / 60) % 24;
}

/**
 * Derive a session only when the trade has no manually recorded session.
 * Boundaries intentionally overlap at 10:00; London Close wins there.
 */
export function deriveTradingSession(trade: Pick<Trade, 'openedAt' | 'session'>): string {
  if (trade.session) return trade.session;
  const hour = getAppHour(trade.openedAt);

  if (hour >= 20 || hour < 0.0167) return SESSION_LABELS.ASIA; // 20:00–00:00
  if (hour >= 2 && hour < 5.0167) return SESSION_LABELS.LONDON; // 02:00–05:01
  if (hour >= 7 && hour < 10.0167) return SESSION_LABELS.NEW_YORK; // 07:00–10:01
  if (hour >= 10 && hour < 12.0167) return SESSION_LABELS.LONDON_CLOSE; // 10:00–12:01
  return SESSION_LABELS.OFF_SESSION;
}

export function getTradeSession(trade: Pick<Trade, 'openedAt' | 'session'>): string {
  return deriveTradingSession(trade);
}

export function getHoldingMinutes(trade: Pick<Trade, 'openedAt' | 'closedAt'>): number | null {
  if (!trade.closedAt) return null;
  const opened = new Date(trade.openedAt).getTime();
  const closed = new Date(trade.closedAt).getTime();
  if (!Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) return null;
  return (closed - opened) / 60000;
}

export function getHoldingTimeBucket(minutes: number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes)) return null;
  if (minutes < 5) return '< 5 min';
  if (minutes < 15) return '5–15 min';
  if (minutes < 30) return '15–30 min';
  if (minutes < 60) return '30–60 min';
  if (minutes < 120) return '1–2 h';
  if (minutes < 240) return '2–4 h';
  if (minutes < 480) return '4–8 h';
  return '8 h+';
}

export function normalizedSessionForAudit(trade: Trade): TradingSession | string {
  return trade.session || getTradeSession(trade);
}
