/**
 * Strict numeric parser that safely preserves null semantics.
 * Handles broker exports with units (e.g. "0.01 Lots"), non-breaking spaces,
 * unicode minus symbols, currency signs, and European/US decimal formats.
 * CRITICAL: Unknown / invalid values return null, NEVER 0.
 */
export function normalizeNumber(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue === 'number') {
    return isNaN(rawValue) || !isFinite(rawValue) ? null : rawValue;
  }

  if (typeof rawValue !== 'string') {
    return null;
  }

  let str = rawValue.trim();
  if (
    str === '' ||
    str === '-' ||
    str === '--' ||
    str === '—' ||
    str === '–' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'undefined' ||
    str === 'NaN'
  ) {
    return null;
  }

  // Replace unicode minus signs with standard ASCII minus
  str = str.replace(/[\u2212\u2013\u2014]/g, '-');

  // Strip unit words (Lots, Lot, USD, EUR, GBP, JPY, pts, pips, contracts, shares, units, %, $, €, £, ¥, ₹)
  str = str.replace(/\b(lots?|eur|usd|gbp|jpy|chf|cad|aud|nzd|pts|pips?|contracts?|shares?|units?)\b/gi, '');
  str = str.replace(/[$€£¥₹%]/g, '');

  // Strip non-breaking spaces, narrow spaces, and all whitespace
  str = str.replace(/[\s\u00a0\u202f\u2000-\u200b]/g, '');

  if (str === '' || str === '-' || str === '+') {
    return null;
  }

  // Check for accounting parentheses e.g. (150.25) -> -150.25
  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }

  // Handle European comma formatting vs US dot formatting
  // e.g. 1.234,56 vs 1,234.56 vs 1234,56 vs 1234.56
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // European format: 1.234,56 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> remove commas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Single comma: e.g. 1234,56 -> replace with dot
    str = str.replace(',', '.');
  }

  const parsed = Number(str);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

