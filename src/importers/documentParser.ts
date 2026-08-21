import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Trade,
  AccountTransaction,
  AmbiguousImportRow,
  PendingImportSummary,
  TradeValidationWarning,
  DuplicateMatch,
  TradeSide,
  TradeOutcome,
} from '../types';
import { deduceSessionFromTime, getStandardSession } from '../utils/tradingSession';

if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '6.2.108'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization:', e);
  }
}

/** Normalize headers for reliable matching, including French accents and punctuation. */
export function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeSymbol(raw: string): string {
  if (!raw) return 'UNKNOWN';
  let s = raw.trim().toUpperCase().replace(/[\/\-_\s]/g, '');
  if (s.startsWith('FX:')) s = s.substring(3);
  return s || 'UNKNOWN';
}

export function normalizeSide(raw: string): TradeSide {
  const value = String(raw ?? '').trim().toUpperCase();
  if (['SHORT', 'SELL', 'S', 'VENTE', 'V', 'SHORT SELL'].includes(value)) return 'SELL';
  return 'BUY';
}

export function parseDateString(raw: unknown): string | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const ymd = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  const dmy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  return null;
}

/** Parse currency/accounting numbers without silently inventing a value. */
export function parseNumericPnL(raw: unknown): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let value = String(raw).trim();
  const negativeAccounting = /^\(.*\)$/.test(value);
  const explicitNegative = /^-/.test(value);
  value = value.replace(/^\(|\)$/g, '').replace(/[€$£¥]/g, '').replace(/\s/g, '');
  value = value.replace(/^[+]/, '');

  if (value.includes(',') && value.includes('.')) {
    if (value.lastIndexOf(',') > value.lastIndexOf('.')) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (value.includes(',')) {
    const parts = value.split(',');
    value = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : value.replace(/,/g, '');
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return negativeAccounting || explicitNegative ? -Math.abs(number) : number;
}

const DEPOSIT_WORDS = ['deposit', 'depot', 'credit', 'fundin', 'topup', 'recharge', 'versement', 'apport', 'inflow', 'soldeinitial'];
const WITHDRAWAL_WORDS = ['withdraw', 'retrait', 'debit', 'fundout', 'payout', 'cashout', 'virementsortant', 'outflow'];
const PNL_HEADERS = [
  'netpnl', 'pnl', 'pnlusd', 'pnleur', 'profitloss', 'profitandloss', 'netprofit',
  'profit', 'netresult', 'resultat', 'result', 'gain', 'perte', 'gainspertes', 'traderesult',
  'realizedpnl', 'realisedpnl', 'closedpnl', 'realizedprofit', 'realisedprofit',
];
const SYMBOL_HEADERS = ['symbol', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'market'];
const SIDE_HEADERS = ['side', 'direction', 'sens', 'type', 'typetrade', 'action'];
const DATE_HEADERS = ['date', 'datetime', 'timestamp', 'closed', 'closetime', 'closingtime', 'opentime', 'openingtime'];
const TIME_HEADERS = ['time', 'heure', 'closetime', 'closingtime', 'opentime', 'openingtime'];
const ENTRY_HEADERS = ['entry', 'entryprice', 'openprice', 'prixdentree'];
const EXIT_HEADERS = ['exit', 'exitprice', 'closeprice', 'prixdesortie'];
const SL_HEADERS = ['stoploss', 'sl'];
const TP_HEADERS = ['takeprofit', 'tp'];
const LOT_HEADERS = ['lot', 'lots', 'lotsize', 'quantity', 'qty', 'volume'];
const COMMISSION_HEADERS = ['commission', 'comm', 'frais', 'fee', 'fees'];
const SWAP_HEADERS = ['swap', 'swaps', 'rollover'];
const R_HEADERS = ['rmultiple', 'rrrealise', 'riskreward'];
const SESSION_HEADERS = ['killzone', 'session', 'zone'];
const SETUP_HEADERS = ['setup', 'strategy', 'strategie', 'tag'];
const COMMENT_HEADERS = ['comment', 'description', 'notes', 'libelle', 'details', 'commentaire', 'message'];
const TYPE_HEADERS = ['transactiontype', 'operation', 'categorie', 'typedoperation', 'typeoperation'];

function findField(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const exact = keys.find((key) => normalizeHeader(key) === target);
    if (exact && String(row[exact] ?? '').trim() !== '') return row[exact];
  }
  return undefined;
}

function rowText(row: Record<string, unknown>): string {
  return Object.values(row).filter((v) => v !== undefined && v !== null).map(String).join(' ');
}

function hasKeyword(text: string, words: string[]): boolean {
  const normalized = normalizeHeader(text);
  return words.some((word) => normalized.includes(normalizeHeader(word)));
}

function parseTime(raw: unknown): string | undefined {
  const match = String(raw ?? '').match(/(?:^|[T\s])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}${match[3] ? `:${match[3]}` : ''}` : undefined;
}

function parseNumberField(raw: unknown): number | undefined {
  const value = parseNumericPnL(raw);
  return value === null ? undefined : value;
}

function createTrade(row: Record<string, unknown>, source: Trade['source'], index: number): Trade | null {
  const symbolRaw = findField(row, SYMBOL_HEADERS);
  const sideRaw = findField(row, SIDE_HEADERS);
  const dateRaw = findField(row, DATE_HEADERS);
  const pnlRaw = findField(row, PNL_HEADERS);
  const entryRaw = findField(row, ENTRY_HEADERS);
  const exitRaw = findField(row, EXIT_HEADERS);
  const slRaw = findField(row, SL_HEADERS);
  const tpRaw = findField(row, TP_HEADERS);
  const lotRaw = findField(row, LOT_HEADERS);
  const commissionRaw = findField(row, COMMISSION_HEADERS);
  const swapRaw = findField(row, SWAP_HEADERS);
  const rRaw = findField(row, R_HEADERS);
  const sessionRaw = findField(row, SESSION_HEADERS);
  const setupRaw = findField(row, SETUP_HEADERS);
  const commentRaw = findField(row, COMMENT_HEADERS);
  const typeRaw = findField(row, TYPE_HEADERS);

  const pnl = parseNumericPnL(pnlRaw);
  const symbol = symbolRaw ? normalizeSymbol(String(symbolRaw)) : 'UNKNOWN';
  const sideText = String(sideRaw ?? '').trim();
  const hasSide = /^(buy|sell|long|short|achat|vente)$/i.test(sideText);
  const hasTradeData = symbol !== 'UNKNOWN' || hasSide || entryRaw !== undefined || exitRaw !== undefined || slRaw !== undefined || tpRaw !== undefined;
  const combined = normalizeHeader(`${typeRaw ?? ''} ${commentRaw ?? ''} ${rowText(row)}`);
  const isAccountOperation = hasKeyword(combined, DEPOSIT_WORDS) || hasKeyword(combined, WITHDRAWAL_WORDS);

  // A financial result alone is not enough to invent a trade.
  if (!hasTradeData || isAccountOperation || pnl === null) return null;

  const date = parseDateString(dateRaw);
  if (!date) return null;
  const time = parseTime(findField(row, TIME_HEADERS) ?? dateRaw);
  const sessionValue = sessionRaw ? getStandardSession({ killzone: String(sessionRaw), time }) : (time ? deduceSessionFromTime(time) : undefined);
  const outcome: TradeOutcome = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'BE';

  return {
    id: `imp-row-${Date.now()}-${index}`,
    date,
    time,
    symbol,
    side: hasSide ? normalizeSide(sideText) : (pnl < 0 ? 'SELL' : 'BUY'),
    entry: parseNumberField(entryRaw),
    exit: parseNumberField(exitRaw),
    stopLoss: parseNumberField(slRaw),
    takeProfit: parseNumberField(tpRaw),
    lotSize: parseNumberField(lotRaw),
    commission: parseNumberField(commissionRaw),
    swap: parseNumberField(swapRaw),
    netPnL: pnl,
    rMultiple: parseNumberField(rRaw),
    outcome,
    killzone: sessionValue,
    setup: setupRaw ? String(setupRaw) : undefined,
    notes: commentRaw ? String(commentRaw) : undefined,
    source,
    createdAt: new Date().toISOString(),
  };
}

export function processRawObjectsArray(rows: Record<string, unknown>[], source: Trade['source']): {
  trades: Trade[];
  deposits: AccountTransaction[];
  withdrawals: AccountTransaction[];
  ambiguousRows: AmbiguousImportRow[];
} {
  const trades: Trade[] = [];
  const deposits: AccountTransaction[] = [];
  const withdrawals: AccountTransaction[] = [];
  const ambiguousRows: AmbiguousImportRow[] = [];

  rows.forEach((row, index) => {
    const combined = normalizeHeader(rowText(row));
    const date = parseDateString(findField(row, DATE_HEADERS));
    const amount = parseNumericPnL(findField(row, PNL_HEADERS));
    const typeRaw = String(findField(row, TYPE_HEADERS) ?? '');
    const commentRaw = String(findField(row, COMMENT_HEADERS) ?? '');
    const symbolRaw = findField(row, SYMBOL_HEADERS);
    const sideRaw = findField(row, SIDE_HEADERS);
    const hasSide = /\b(buy|sell|long|short|achat|vente)\b/i.test(String(sideRaw ?? ''));
    const deposit = hasKeyword(`${combined}${normalizeHeader(typeRaw)}${normalizeHeader(commentRaw)}`, DEPOSIT_WORDS);
    const withdrawal = hasKeyword(`${combined}${normalizeHeader(typeRaw)}${normalizeHeader(commentRaw)}`, WITHDRAWAL_WORDS);

    if (date && amount !== null && deposit && !hasSide) {
      deposits.push({
        id: `dep-row-${Date.now()}-${index}`,
        date,
        time: parseTime(findField(row, TIME_HEADERS)),
        type: 'DEPOSIT',
        amount: Math.abs(amount),
        description: commentRaw || typeRaw || 'Dépôt importé',
        source: source as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    if (date && amount !== null && withdrawal && !hasSide) {
      withdrawals.push({
        id: `wth-row-${Date.now()}-${index}`,
        date,
        time: parseTime(findField(row, TIME_HEADERS)),
        type: 'WITHDRAWAL',
        amount: Math.abs(amount),
        description: commentRaw || typeRaw || 'Retrait importé',
        source: source as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const trade = createTrade(row, source, index);
    if (trade) {
      trades.push(trade);
      return;
    }

    // Preserve rows that look financial but cannot be safely classified.
    if (date && amount !== null && Math.abs(amount) > 0) {
      ambiguousRows.push({
        id: `amb-row-${Date.now()}-${index}`,
        rawText: rowText(row),
        suggestedType: 'TRADE',
        confidenceReason: 'Montant financier détecté mais aucune structure de trade ou opération de compte suffisamment fiable.',
        date,
        symbol: symbolRaw ? String(symbolRaw) : undefined,
        amountOrPnL: amount,
      });
    }
  });

  return { trades, deposits, withdrawals, ambiguousRows };
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  } catch (error) {
    console.warn('PDF extraction failed:', error);
    return '';
  }
}

function parseTextRows(text: string): Record<string, unknown>[] {
  return text.split(/\r?\n/).map((line) => ({ raw: line })).filter((row) => String(row.raw).trim().length > 0);
}

function parseTextTrades(text: string, source: Trade['source]): Trade[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of text.split(/\r?\n/)) {
    const date = line.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/)?.[1];
    const symbol = line.match(/\b(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|GBPJPY|EURJPY|NAS100|US100|US30|SPX500|GER40|BTCUSD|ETHUSD)\b/i)?.[1];
    const side = line.match(/\b(BUY|SELL|LONG|SHORT|ACHAT|VENTE)\b/i)?.[1];
    const money = line.match(/(?:^|\s)([+-]?(?:\$|€|£)?\(?\d[\d\s.,]*\)?)(?:\s*(?:USD|EUR|GBP))?(?:\s|$)/);
    if (date && symbol && money) rows.push({ Date: date, Symbol: symbol, Side: side ?? '', 'PnL': money[1] });
  }
  return processRawObjectsArray(rows, source).trades;
}

export async function parseDocumentFile(file: File, existingTrades: Trade[] = []): Promise<PendingImportSummary> {
  const batchId = `batch-${Date.now()}`;
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  let trades: Trade[] = [];
  let deposits: AccountTransaction[] = [];
  let withdrawals: AccountTransaction[] = [];
  let ambiguousRows: AmbiguousImportRow[] = [];
  let rawText = '';

  if (ext === '.csv' || ext === '.txt') {
    rawText = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(rawText, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    if (parsed.data.length && Object.keys(parsed.data[0] ?? {}).length > 1) {
      const result = processRawObjectsArray(parsed.data, 'Imported CSV');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
    } else {
      const result = processRawObjectsArray(parseTextRows(rawText), 'Imported CSV');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
      if (!trades.length) trades = parseTextTrades(rawText, 'Imported CSV');
    }
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const result = processRawObjectsArray(rows, 'Imported XLSX');
    trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
  } else if (ext === '.json') {
    rawText = await file.text();
    try {
      const json = JSON.parse(rawText);
      const rows = Array.isArray(json) ? json : (json.trades ?? []);
      const result = processRawObjectsArray(rows, 'Imported JSON');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
    } catch {
      ambiguousRows.push({ id: `amb-json-${Date.now()}`, rawText, suggestedType: 'IGNORE', confidenceReason: 'JSON invalide.', date: new Date().toISOString().slice(0, 10), amountOrPnL: 0 });
    }
  } else if (ext === '.pdf') {
    rawText = await extractTextFromPDF(file);
    if (rawText) {
      trades = parseTextTrades(rawText, 'Imported PDF');
      if (!trades.length) {
        const result = processRawObjectsArray(parseTextRows(rawText), 'Imported PDF');
        trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
      }
    }
  }

  const warnings: TradeValidationWarning[] = [];
  let validDatesCount = 0;
  let validSymbolsCount = 0;
  let validPnLCount = 0;
  let missingEntryCount = 0;
  let missingStopLossCount = 0;
  let missingCommissionCount = 0;

  trades.forEach((trade, index) => {
    if (trade.date) validDatesCount++; else warnings.push({ tradeIndex: index, field: 'date', message: 'Date manquante' });
    if (trade.symbol && trade.symbol !== 'UNKNOWN') validSymbolsCount++; else warnings.push({ tradeIndex: index, field: 'symbol', message: 'Paire/symbole manquant' });
    if (Number.isFinite(trade.netPnL)) validPnLCount++; else warnings.push({ tradeIndex: index, field: 'netPnL', message: 'PnL non détecté' });
    if (trade.entry === undefined) missingEntryCount++;
    if (trade.stopLoss === undefined) missingStopLossCount++;
    if (trade.commission === undefined) missingCommissionCount++;
  });

  const duplicates: DuplicateMatch[] = [];
  for (const incoming of trades) {
    const match = existingTrades.find((existing) =>
      existing.date === incoming.date &&
      existing.symbol === incoming.symbol &&
      existing.side === incoming.side &&
      Math.abs(existing.netPnL - incoming.netPnL) < 0.01
    );
    if (match) duplicates.push({ existingTrade: match, incomingTrade: incoming, reason: 'Date + symbole + direction + PnL identiques.' });
  }

  return {
    batchId,
    fileName: file.name,
    fileType: ext.replace('.', '').toUpperCase(),
    rawText,
    totalDetected: trades.length + deposits.length + withdrawals.length + ambiguousRows.length,
    trades,
    deposits,
    withdrawals,
    ambiguousRows,
    tradesCount: trades.length,
    depositsCount: deposits.length,
    withdrawalsCount: withdrawals.length,
    duplicatesCount: duplicates.length,
    validDatesCount,
    validSymbolsCount,
    validPnLCount,
    missingEntryCount,
    missingStopLossCount,
    missingCommissionCount,
    warnings,
    duplicates,
  };
}
