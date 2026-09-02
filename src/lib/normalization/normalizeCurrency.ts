/**
 * Currency symbol and code normalizer.
 */
const CURRENCY_MAP: Record<string, string> = {
  $: 'USD',
  'US$': 'USD',
  'USD': 'USD',
  '€': 'EUR',
  'EUR': 'EUR',
  '£': 'GBP',
  'GBP': 'GBP',
  '¥': 'JPY',
  'JPY': 'JPY',
  'CHF': 'CHF',
  'AUD': 'AUD',
  'A$': 'AUD',
  'CAD': 'CAD',
  'C$': 'CAD',
  'NZD': 'NZD',
  'USDT': 'USDT',
  'BTC': 'BTC',
};

export function normalizeCurrency(rawCurrency: unknown): string {
  if (!rawCurrency || typeof rawCurrency !== 'string') {
    return 'USD';
  }

  const cleaned = rawCurrency.trim().toUpperCase();
  if (CURRENCY_MAP[cleaned]) {
    return CURRENCY_MAP[cleaned];
  }

  // If 3-4 letters e.g. "EUR", "PLN"
  if (/^[A-Z]{3,5}$/.test(cleaned)) {
    return cleaned;
  }

  return 'USD';
}
