/**
 * Financial Floating-Point Precision Utilities.
 * Protects against floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */

const PRECISION_FACTOR = 100000000; // 8 decimal places for crypto / forex precision

export function safeAdd(...numbers: (number | null | undefined)[]): number {
  let sumScaled = 0;
  for (const n of numbers) {
    if (n !== null && n !== undefined && !isNaN(n)) {
      sumScaled += Math.round(n * PRECISION_FACTOR);
    }
  }
  return sumScaled / PRECISION_FACTOR;
}

export function safeSubtract(a: number, b: number): number {
  return (Math.round(a * PRECISION_FACTOR) - Math.round(b * PRECISION_FACTOR)) / PRECISION_FACTOR;
}

export function safeMultiply(a: number, b: number): number {
  return (Math.round(a * 10000) * Math.round(b * 10000)) / 100000000;
}

export function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return null;
  }
  return numerator / denominator;
}

export function roundToDecimals(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export const safeRound = roundToDecimals;

/**
 * Format helper for UI display only.
 * Internal calculations must NEVER round prematurely.
 */
export function formatDisplayCurrency(
  value: number | null | undefined,
  currency = 'USD',
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return formatted;
}

export function formatDisplayR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}R`;
}

// Convenient aliases
export const formatCurrency = formatDisplayCurrency;
export const formatRMultiple = formatDisplayR;
