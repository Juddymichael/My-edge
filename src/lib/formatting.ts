/**
 * Standardized Financial Formatting Engine for Thunder Edge
 * Provides crisp, institutional-grade number formatting with tabular alignment and clear +/- signs.
 */

export interface FormatOptions {
  currency?: string;
  showSign?: boolean;
  decimals?: number;
  fallback?: string;
}

/**
 * Formats a currency amount into standard European / International notation:
 * Examples:
 *  +1439.96 -> "+€1,439.96" (or "+$1,439.96")
 *  -421.50  -> "-€421.50"
 *  0        -> "€0.00"
 *  null     -> "Not recorded" or custom fallback
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'EUR',
  options: { showSign?: boolean; fallback?: string; decimals?: number } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return options.fallback ?? '—';
  }

  const decimals = options.decimals ?? 2;
  const showSign = options.showSign ?? true;
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';

  const absVal = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (Math.abs(value) < 0.000001) {
    return `${symbol}0.00`;
  }

  if (value > 0) {
    return showSign ? `+${symbol}${absVal}` : `${symbol}${absVal}`;
  }

  return `-${symbol}${absVal}`;
}

/**
 * Formats R-Multiple with sign and unit:
 * Examples:
 *  +2.43 -> "+2.43R"
 *  -1.00 -> "-1.00R"
 *  0     -> "0.00R"
 *  null  -> "—"
 */
export function formatRMultiple(
  value: number | null | undefined,
  options: { showSign?: boolean; fallback?: string } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return options.fallback ?? '—';
  }

  const showSign = options.showSign ?? true;
  const absVal = Math.abs(value).toFixed(2);

  if (Math.abs(value) < 0.000001) {
    return '0.00R';
  }

  if (value > 0) {
    return showSign ? `+${absVal}R` : `${absVal}R`;
  }

  return `-${absVal}R`;
}

/**
 * Formats percentages with clean decimal precision:
 * Examples:
 *  68.4  -> "68.4%"
 *  null  -> "—"
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
  fallback = '—'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats generic numerical metrics (Profit Factor, Win/Loss Ratio, Expectancy):
 * Examples:
 *  1.82 -> "1.82"
 *  null -> "—"
 */
export function formatDecimal(
  value: number | null | undefined,
  decimals = 2,
  fallback = '—'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
