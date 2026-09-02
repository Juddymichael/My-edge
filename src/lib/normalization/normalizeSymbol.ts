/**
 * Deterministic Financial Symbol Normalization.
 * Strips delimiters, standardized ticker aliases (e.g. GOLD -> XAUUSD).
 */

const SYMBOL_ALIASES: Record<string, string> = {
  GOLD: 'XAUUSD',
  SILVER: 'XAGUSD',
  OIL: 'USOIL',
  CRUDE: 'USOIL',
  BRENT: 'UKOIL',
  SPX: 'SPX500',
  SP500: 'SPX500',
  US500: 'SPX500',
  US500CASH: 'SPX500',
  SPX500CASH: 'SPX500',
  NAS100CASH: 'NAS100',
  US30CASH: 'US30',
  NDX: 'NAS100',
  US100: 'NAS100',
  USTECH: 'NAS100',
  DJIA: 'US30',
  DOW: 'US30',
  WS30: 'US30',
  GER30: 'GER40',
  DE30: 'GER40',
  DE40: 'GER40',
  DAX: 'GER40',
  DAX40: 'GER40',
};

export function normalizeSymbol(rawSymbol: string | null | undefined): string {
  if (!rawSymbol || typeof rawSymbol !== 'string') {
    return 'UNKNOWN';
  }

  // Trim and convert to upper case
  let cleaned = rawSymbol.trim().toUpperCase();

  // Remove common separators (/ . _ - space #)
  cleaned = cleaned.replace(/[\/\.\_\-\s\#\:\*]/g, '');

  // Strip common broker suffix artifacts (e.g. .raw, .ecn, .pro, m, c)
  // Only strip micro/mini suffixes if standard length
  cleaned = cleaned.replace(/(ECN|RAW|PRO|STP|VIP|MICRO|MINI)$/i, '');

  // Check aliases
  if (SYMBOL_ALIASES[cleaned]) {
    return SYMBOL_ALIASES[cleaned];
  }

  return cleaned || 'UNKNOWN';
}
