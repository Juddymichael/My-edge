import { normalizeDate, normalizeNumber } from '../normalization';

const clean = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const SYMBOL_ALIASES = ['symbol', 'symbole', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'item', 'actif', 'market'];
const DATE_ALIASES = [
  'heuredecloture', 'heurecloture', 'datecloture', 'closedat', 'closetime', 'close_time', 'date_sortie', 'exit_time', 'heure_sortie',
  'heuredouverture', 'heureouverture', 'dateouverture', 'openedat', 'opentime', 'open_time', 'date_entree', 'entry_time', 'date',
];
const DIRECTION_ALIASES = ['sensdouverture', 'sensouverture', 'sens', 'direction', 'side', 'type', 'buy/sell', 'b/s', 'position', 'action'];
const PNL_ALIASES = ['neteur', 'netusd', 'netpnl', 'net_pnl', 'pnl', 'profit', 'gain', 'loss', 'benefice', 'resultat', 'profit_net', 'resultat_net'];

export const normalizedHeader = (value: unknown) => clean(value);

export function isTradeHeader(headers: string[]): boolean {
  const normalized = headers.map(clean);
  const hasSymbol = normalized.some((h) => SYMBOL_ALIASES.some((a) => clean(a) === h || (clean(a).length >= 4 && h.includes(clean(a)))));
  const hasDate = normalized.some((h) => DATE_ALIASES.some((a) => h === clean(a) || h.includes(clean(a))));
  const hasDirection = normalized.some((h) => DIRECTION_ALIASES.some((a) => h === clean(a) || h.includes(clean(a))));
  const hasResult = normalized.some((h) => PNL_ALIASES.some((a) => h === clean(a) || h.includes(clean(a))));
  return hasSymbol && hasDate && (hasDirection || hasResult);
}

export function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(clean);
  for (const alias of aliases) {
    const a = clean(alias);
    const exact = normalized.findIndex((h) => h === a);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const a = clean(alias);
    if (a.length < 3) continue;
    const fuzzy = normalized.findIndex((h) => h.includes(a));
    if (fuzzy >= 0) return fuzzy;
  }
  return -1;
}

export function isSummaryOrSectionLine(values: unknown[]): boolean {
  const joined = values.map((v) => String(v ?? '').trim()).filter(Boolean).join(' ').toLowerCase();
  if (!joined) return true;
  return /^(total|summary|resume|résumé|deposit|depot|dépôt|withdrawal|retrait|balance|solde|funds|fonds|account summary|closed p\/l|open p\/l|trades summary|résumé des trades)\b/i.test(joined);
}

export function rowHasSymbol(values: unknown[], symbolIndex: number): boolean {
  return symbolIndex >= 0 && String(values[symbolIndex] ?? '').replace(/[\u00a0\u202f\s]/g, '').trim().length > 0;
}

export function looksLikeTradeRow(values: unknown[], headers: string[]): boolean {
  if (isSummaryOrSectionLine(values)) return false;
  const symbolIndex = findColumnIndex(headers, SYMBOL_ALIASES);
  if (symbolIndex >= 0 && !rowHasSymbol(values, symbolIndex)) return false;

  const dateIndex = findColumnIndex(headers, DATE_ALIASES);
  const directionIndex = findColumnIndex(headers, DIRECTION_ALIASES);
  if (symbolIndex < 0 || dateIndex < 0) return false;

  const symbol = String(values[symbolIndex] ?? '').trim();
  const date = String(values[dateIndex] ?? '').trim();
  const direction = directionIndex >= 0 ? String(values[directionIndex] ?? '').trim() : '';
  if (!symbol || !date) return false;

  try {
    normalizeDate(date);
  } catch {
    return false;
  }

  return !direction || /^(buy|sell|long|short|achat|vente|vendre|acheter|b|s)$/i.test(direction) || values.some((v) => /\b(buy|sell|long|short|achat|vente)\b/i.test(String(v ?? '')));
}

export function extractSourceTotalPnl(values: unknown[], headers: string[]): number | null {
  if (!isSummaryOrSectionLine(values)) return null;
  const pnlIndex = findColumnIndex(headers, PNL_ALIASES);
  if (pnlIndex >= 0) return normalizeNumber(values[pnlIndex]);
  const text = values.map((v) => String(v ?? '')).join(' ');
  const match = text.match(/(?:total|closed\s*p\/l|net|pnl|profit|gain|resultat|résultat)[^\d+-]*([+-]?\s*[\d\u00a0\u202f\s.,]+)/i);
  return match ? normalizeNumber(match[1]) : null;
}

export function extractRowDate(values: unknown[], headers: string[]): string | null {
  const index = findColumnIndex(headers, DATE_ALIASES);
  if (index < 0) return null;
  try {
    return normalizeDate(values[index]);
  } catch {
    return null;
  }
}
