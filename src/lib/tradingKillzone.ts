import { Trade, TradingKillzone } from '../types/trade';

/**
 * Trade timestamps are stored as ISO 8601 instants. The seed/import pipeline
 * records them as UTC (and keeps the original timezone metadata on each trade).
 * Killzones are intentionally evaluated in fixed GMT-5, independently of the
 * app display timezone.
 */
export const KILLZONE_OFFSET_HOURS = -5;

export const KILLZONE_LABELS: Record<'LONDON' | 'NEW_YORK' | 'LONDON_CLOSE' | 'OFF_SESSION', Exclude<TradingKillzone, null>> = {
  LONDON: 'Killzone Londres',
  NEW_YORK: 'Killzone New York',
  LONDON_CLOSE: 'Killzone London Close',
  OFF_SESSION: 'Hors Killzone',
};

function getGmtMinus5MinuteOfDay(dateString: string): number {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return -1;
  return ((date.getUTCHours() * 60 + date.getUTCMinutes() + KILLZONE_OFFSET_HOURS * 60) % 1440 + 1440) % 1440;
}

export function getGmtMinus5Hour(dateString: string): number {
  const minute = getGmtMinus5MinuteOfDay(dateString);
  return minute < 0 ? 0 : minute / 60;
}

function isMissingKillzone(session: Trade['session']): boolean {
  return session === null || session === undefined || session === 'NO_SESSION';
}

/**
 * Derive the killzone from the trade opening instant after converting it to
 * fixed GMT-5. Manually entered killzones are preserved, except the legacy
 * NO_SESSION placeholder which is treated as missing and recalculated.
 *
 * London:       02:00–05:01 GMT-5
 * New York:     07:00–10:01 GMT-5
 * London Close: 10:00–12:01 GMT-5
 * Outside:      Hors Killzone
 *
 * The source ranges overlap at 10:00–10:01; London Close takes precedence
 * so every trade belongs to exactly one bucket.
 */
export function deriveTradingKillzone(trade: Pick<Trade, 'openedAt' | 'session'>): TradingKillzone {
  if (!isMissingKillzone(trade.session)) return trade.session;

  const minute = getGmtMinus5MinuteOfDay(trade.openedAt);
  if (minute < 0) return KILLZONE_LABELS.OFF_SESSION;
  if (minute >= 120 && minute <= 301) return KILLZONE_LABELS.LONDON;
  if (minute >= 600 && minute <= 721) return KILLZONE_LABELS.LONDON_CLOSE;
  if (minute >= 420 && minute <= 601) return KILLZONE_LABELS.NEW_YORK;
  return KILLZONE_LABELS.OFF_SESSION;
}

export function getTradeKillzone(trade: Pick<Trade, 'openedAt' | 'session'>): TradingKillzone {
  return deriveTradingKillzone(trade);
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

export function normalizedKillzoneForAudit(trade: Trade): TradingKillzone | string {
  return trade.session || getTradeKillzone(trade);
}
