import { normalizeSymbol } from '../importers/documentParser';

export const DEFAULT_PLAN_INSTRUMENTS = ['EURUSD', 'XAUUSD', 'EURJPY'];

export type StandardSessionName = 'Asia' | 'London' | 'New York' | 'London Close' | 'Hors Kill Zone';

/**
 * Checks if a symbol is part of the trader's configured Trading Plan.
 */
export function isTradeInPlan(symbol: string, planInstruments?: string[]): boolean {
  if (!symbol) return false;
  const list = (planInstruments && planInstruments.length > 0 ? planInstruments : DEFAULT_PLAN_INSTRUMENTS)
    .map((s) => normalizeSymbol(s));
  const norm = normalizeSymbol(symbol);
  return list.includes(norm);
}

/**
 * Dedution of Kill Zone according to exact user reference:
 * Reference: GMT-5 | Local timezone: UTC+3 (+8h offset, no DST change)
 * 
 * - ASIA: 20:00 → 00:01 GMT-5  ==>  04:00 → 08:01 UTC+3
 * - LONDON: 02:00 → 05:01 GMT-5 ==>  10:00 → 13:01 UTC+3
 * - NEW YORK: 07:00 → 10:00 GMT-5 ==> 15:00 → 18:00 UTC+3
 * - LONDON CLOSE: 10:00 → 12:01 GMT-5 ==> 18:00 → 20:01 UTC+3
 */
export function deduceSessionFromTime(timeOrDateTimeStr?: string): StandardSessionName {
  if (!timeOrDateTimeStr) return 'Hors Kill Zone';
  const str = String(timeOrDateTimeStr).trim();
  if (!str) return 'Hors Kill Zone';

  // Extract HH:MM (supports 24h or 12h AM/PM, and ISO/SQL timestamps)
  const match = str.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return 'Hors Kill Zone';

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[4]?.toUpperCase();

  if (isNaN(hours) || isNaN(minutes)) return 'Hors Kill Zone';

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes;

  // Asia: 04:00 (240 min) to 08:01 (481 min)
  if (totalMinutes >= 240 && totalMinutes <= 481) {
    return 'Asia';
  }
  // London: 10:00 (600 min) to 13:01 (781 min)
  if (totalMinutes >= 600 && totalMinutes <= 781) {
    return 'London';
  }
  // New York: 15:00 (900 min) to 18:00 (1080 min)
  if (totalMinutes >= 900 && totalMinutes < 1080) {
    return 'New York';
  }
  // London Close: 18:00 (1080 min) to 20:01 (1201 min)
  if (totalMinutes >= 1080 && totalMinutes <= 1201) {
    return 'London Close';
  }

  return 'Hors Kill Zone';
}

/**
 * Normalizes any existing killzone label or auto-deduces it from trade time
 */
export function getStandardSession(trade: { killzone?: string; time?: string }): StandardSessionName | string {
  if (trade.killzone) {
    const kz = trade.killzone.trim();
    const lk = kz.toLowerCase();
    if (lk.includes('asian') || lk.includes('tokyo') || lk.includes('asia')) return 'Asia';
    if (lk.includes('london close') || lk.includes('london pm') || lk.includes('close')) return 'London Close';
    if (lk.includes('london')) return 'London';
    if (lk.includes('ny') || lk.includes('new york') || lk.includes('america')) return 'New York';
    if (lk.includes('hors') || lk.includes('autre') || lk.includes('none')) return 'Hors Kill Zone';
    return kz;
  }

  if (trade.time) {
    return deduceSessionFromTime(trade.time);
  }

  return 'Hors Kill Zone';
}
