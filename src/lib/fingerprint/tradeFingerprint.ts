/**
 * Deterministic Fingerprint Generator for Trade Deduplication.
 * Prevents identical trades from being imported multiple times.
 */

export interface FingerprintParams {
  brokerSource?: string | null;
  ticket?: string | null;
  symbol: string;
  openedAt: string;
  closedAt?: string | null;
  direction: string;
  entryPrice?: number | null;
  quantity?: number | null;
}

/**
 * Simple standard string hash (Murmur3-like 32-bit integer converted to hex string).
 */
function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generates a deterministic sourceId fingerprint for a trade.
 */
export function generateTradeFingerprint(params: FingerprintParams): string {
  const broker = (params.brokerSource || 'GENERIC').trim().toUpperCase();
  const symbol = (params.symbol || 'UNKNOWN').trim().toUpperCase();
  const direction = (params.direction || 'BUY').trim().toUpperCase();
  const openedAt = (params.openedAt || '').trim();
  const closedAt = (params.closedAt || 'OPEN').trim();
  const ticket = params.ticket ? params.ticket.trim() : null;

  if (ticket) {
    // Ticket-based deterministic fingerprint
    const rawKey = `${broker}|TICK:${ticket}|${symbol}|${direction}|${openedAt}`;
    return `fp_${simpleHash(rawKey)}`;
  }

  // Value-based deterministic fingerprint (for CSVs/sources lacking tickets)
  const entryStr = params.entryPrice !== null && params.entryPrice !== undefined ? Number(params.entryPrice).toFixed(5) : 'NOPRICE';
  const qtyStr = params.quantity !== null && params.quantity !== undefined ? Number(params.quantity).toFixed(4) : 'NOQTY';

  const rawKey = `${broker}|SYM:${symbol}|DIR:${direction}|OPEN:${openedAt}|CLOSE:${closedAt}|EP:${entryStr}|Q:${qtyStr}`;
  return `fp_${simpleHash(rawKey)}`;
}
