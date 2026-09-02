import { normalizeDate, normalizeNumber, normalizeSymbol } from '../normalization';
import { findColumnIndex, isSummaryOrSectionLine } from './sectionUtils';

const SYMBOLS = ['symbol', 'symbole', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'item', 'actif', 'market'];
const DATES = ['heuredecloture', 'heurecloture', 'datecloture', 'closedat', 'closetime', 'close_time', 'date_sortie', 'exit_time', 'heure_sortie', 'heuredouverture', 'heureouverture', 'dateouverture', 'openedat', 'opentime', 'open_time', 'date_entree', 'entry_time', 'date'];
const DIRECTIONS = ['sensdouverture', 'sensouverture', 'sens', 'direction', 'side', 'type', 'action', 'ordre', 'buy/sell', 'b/s', 'position'];
const PNL = ['neteur', 'netusd', 'netpnl', 'net_pnl', 'pnl', 'profit', 'gain', 'loss', 'benefice', 'resultat', 'profit_net', 'resultat_net'];

export interface ImportRowValidation {
  valid: boolean;
  reason?: string;
  symbol?: string;
  tradeDate?: string;
  pnl?: number | null;
}

export function validateImportRow(data: Record<string, unknown>, rawString = ''): ImportRowValidation {
  const keys = Object.keys(data);
  const values = keys.map((key) => data[key]);
  const symbolIndex = findColumnIndex(keys, SYMBOLS);
  const dateIndex = findColumnIndex(keys, DATES);
  const directionIndex = findColumnIndex(keys, DIRECTIONS);
  const pnlIndex = findColumnIndex(keys, PNL);

  const rawSymbol = symbolIndex >= 0 ? String(values[symbolIndex] ?? '').trim() : '';
  if (!rawSymbol) return { valid: false, reason: 'Symbole vide' };
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol || symbol === 'UNKNOWN') return { valid: false, reason: 'Symbole invalide' };

  if (isSummaryOrSectionLine(values)) return { valid: false, reason: 'Ligne de résumé/section' };

  const rawDate = dateIndex >= 0 ? values[dateIndex] : undefined;
  if (rawDate === undefined || String(rawDate).trim() === '') return { valid: false, reason: 'Date/heure absente' };
  let tradeDate: string;
  try { tradeDate = normalizeDate(rawDate); }
  catch { return { valid: false, reason: 'Date/heure invalide' }; }

  const rawDirection = directionIndex >= 0 ? String(values[directionIndex] ?? '').trim() : '';
  if (rawDirection && !/^(buy|sell|long|short|achat|vente|vendre|acheter|b|s)$/i.test(rawDirection) && !/\b(buy|sell|long|short)\b/i.test(rawString)) {
    return { valid: false, reason: 'Sens d’ouverture invalide' };
  }

  const pnl = pnlIndex >= 0 ? normalizeNumber(values[pnlIndex]) : null;
  return { valid: true, symbol, tradeDate, pnl };
}
