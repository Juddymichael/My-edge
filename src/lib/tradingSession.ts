import { Trade, TradingSession } from '../types/trade';

export const APP_TIMEZONE_OFFSET_HOURS = 3;

export const SESSION_LABELS = {
  ASIA: 'Asia',
  LONDON: 'London',
  NEW_YORK: 'New York',
  LONDON_CLOSE: 'London Close',
  OFF_SESSION: 'Hors session',
} as const;

function getAppMinuteOfDay(dateString: string): number {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return -1;
  return ((date.getUTCHours() * 60 + date.getUTCMinutes() + APP_TIMEZONE_OFFSET_HOURS * 60) % 1440 + 1440) % 1440;
}

export function getAppHour(dateString: string): number {
  const minute = getAppMinuteOfDay(dateString);
  return minute < 0 ? 0 : minute / 60;
}

/**
 * Keep an explicitly recorded session. Otherwise derive it from the opening
 * timestamp in the app's current fixed UTC+3 clock.
 *
 * 20:00–00:01 Asia
 * 02:00–05:01 London
 * 07:00–09:59 New York
 * 10:00–12:01 London Close
 * remaining times: Hors session
 *
 * The requested source ranges overlap at 10:00–10:01; London Close takes
 * precedence there so each trade belongs to exactly one chart bucket.
 */
export function deriveTradingSession(trade: Pick<Trade, 'openedAt' | 'session'>): string {
  if (trade.session) return trade.session;
  const minute = getAppMinuteOfDay(trade.openedAt);
  if (minute < 0) return SESSION_LABELS.OFF_SESSION;
  if (minute >= 1200 || minute <= 1) return SESSION_LABELS.ASIA;
  if (minute >= 120 && minute <= 301) return SESSION_LABELS.LONDON;
  if (minute >= 420 && minute <= 599) return SESSION_LABELS.NEW_YORK;
  if (minute >= 600 && minute <= 721) return SESSION_LABELS.LONDON_CLOSE;
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
