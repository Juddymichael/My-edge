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
  ImportItemClassification,
} from '../types';
import { deduceSessionFromTime, getStandardSession } from '../utils/tradingSession';

if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization:', e);
  }
}

const DEPOSIT_KEYWORDS = ['deposit', 'dépôt', 'depot', 'credit', 'crédit', 'fund in', 'top-up', 'topup', 'wire in', 'recharge', 'versement', 'pay in', 'apport', 'inflow'];
const WITHDRAWAL_KEYWORDS = ['withdraw', 'withdrawal', 'retrait', 'debit', 'débit', 'fund out', 'payout', 'cashout', 'wire out', 'virement sortant', 'outflow'];
const KNOWN_SYMBOLS = [
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD','EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','EURAUD',
  'XAUUSD','XAGUSD','GOLD','SILVER','USOIL','UKOIL','WTI','BRENT','BTCUSD','ETHUSD','SOLUSD','US500','SPX500','NAS100','US100','US30','DJI','GER40','DAX','FRA40','CAC40'
];

const cleanKey = (value: any) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function normalizeSymbol(raw: string): string {
  if (!raw) return 'UNKNOWN';
  let s = String(raw).trim().toUpperCase().replace(/[\s\/_\-.]/g, '');
  if (s.startsWith('FX:')) s = s.substring(3);
  const known = KNOWN_SYMBOLS.find((x) => x === s);
  return known || (s.length >= 6 && s.length <= 12 ? s : 'UNKNOWN');
}

export function normalizeSide(raw: string): TradeSide {
  const l = String(raw ?? '').trim().toUpperCase();
  return ['SHORT', 'SELL', 'S', 'VENTE', 'V', 'SELLING'].includes(l) ? 'SELL' : 'BUY';
}

export function parseDateString(raw: any): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
  }
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const str = String(raw).trim().replace(/^['"]|['"]$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let m = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Robust monetary parser. It never treats an unrelated cell such as balance/volume as PnL when called on a PnL column. */
export function parseNumericPnL(raw: any): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim().replace(/[\u00a0\u202f]/g, ' ');
  if (!s || /^(?:-|—|n\/a|na|null|none)$/i.test(s)) return null;
  let negative = /^\(.*\)$/.test(s) || /^\s*-/.test(s) || /\b(?:loss|losses|perte|pertes)\b/i.test(s);
  s = s.replace(/^\(|\)$/g, '').replace(/[€$£¥₹]/g, '').replace(/\b(?:usd|eur|gbp|cad|aud|jpy)\b/ig, '').replace(/\s/g, '').replace(/\+/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const digitsAfter = s.length - lastComma - 1;
    s = digitsAfter === 1 || digitsAfter === 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function firstValue(row: Record<string, any>, aliases: string[]): any {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = cleanKey(alias);
    const exact = keys.find((k) => cleanKey(k) === target);
    if (exact && row[exact] !== undefined && row[exact] !== null && String(row[exact]).trim() !== '') return row[exact];
  }
  for (const alias of aliases) {
    const target = cleanKey(alias);
    const partial = keys.find((k) => {
      const ck = cleanKey(k);
      return ck.includes(target) || target.includes(ck);
    });
    if (partial && row[partial] !== undefined && row[partial] !== null && String(row[partial]).trim() !== '') return row[partial];
  }
  return undefined;
}

function columnKey(row: Record<string, any>, aliases: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = cleanKey(alias);
    const exact = keys.find((k) => cleanKey(k) === target);
    if (exact) return exact;
  }
  for (const alias of aliases) {
    const target = cleanKey(alias);
    const partial = keys.find((k) => cleanKey(k).includes(target));
    if (partial) return partial;
  }
  return undefined;
}

function isSide(value: any): boolean {
  return /^(buy|sell|long|short|achat|vente|b|s)$/i.test(String(value ?? '').trim());
}

function isLikelySymbol(value: any): boolean {
  if (!value) return false;
  const s = String(value).trim().toUpperCase().replace(/[\s\/_\-.]/g, '');
  if (KNOWN_SYMBOLS.includes(s)) return true;
  return /^[A-Z]{6,12}$/.test(s) && !['DEPOSIT','WITHDRAW','BALANCE','ACCOUNT','UNKNOWN'].includes(s);
}

function extractSymbol(row: Record<string, any>, allText: string): string {
  const direct = firstValue(row, ['symbol','pair','paire','instrument','ticker','market','asset','product']);
  if (isLikelySymbol(direct)) return normalizeSymbol(String(direct));
  const upper = allText.toUpperCase().replace(/[\/_\-.]/g, '');
  const found = KNOWN_SYMBOLS.find((s) => upper.includes(s));
  return found ? normalizeSymbol(found) : 'UNKNOWN';
}

function extractTime(raw: any): string | undefined {
  const s = String(raw ?? '');
  const m = s.match(/(?:^|[T\s])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : undefined;
}

function parsePrice(raw: any): number | undefined {
  const n = parseNumericPnL(raw);
  return n === null ? undefined : n;
}

function classifyKeywords(text: string) {
  const lower = text.toLowerCase();
  return {
    deposit: DEPOSIT_KEYWORDS.some((k) => lower.includes(k)),
    withdrawal: WITHDRAWAL_KEYWORDS.some((k) => lower.includes(k)),
  };
}

export interface ClassificationResult {
  type: ImportItemClassification;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export function classifyRawItem(textToScan: string, hasSymbol: boolean, hasSide: boolean, hasPrices: boolean, amount: number | null): ClassificationResult {
  const { deposit, withdrawal } = classifyKeywords(textToScan);
  if (deposit && !hasSide && !hasSymbol) return { type: 'DEPOSIT', confidence: 'HIGH', reason: 'Dépôt/crédit identifié' };
  if (withdrawal && !hasSide && !hasSymbol) return { type: 'WITHDRAWAL', confidence: 'HIGH', reason: 'Retrait/débit identifié' };
  if (hasSymbol && (hasSide || hasPrices)) return { type: 'TRADE', confidence: 'HIGH', reason: 'Instrument et données d’exécution détectés' };
  if (amount !== null) return { type: 'AMBIGUOUS', confidence: 'MEDIUM', reason: 'Montant détecté mais nature de la ligne incertaine' };
  return { type: 'IGNORE', confidence: 'HIGH', reason: 'Aucune donnée financière exploitable' };
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((x: any) => x.str).join(' ') + '\n';
    }
    return out;
  } catch (e) {
    console.warn('PDF extraction failed:', e);
    return '';
  }
}

function makeTrade(row: Record<string, any>, sourceType: Trade['source'], index: number): Trade | null {
  const allText = Object.values(row).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').map(String).join(' ');
  const symbol = extractSymbol(row, allText);
  const sideRaw = firstValue(row, ['side','direction','trade type','type trade','sens','action','position','order type']);
  const dateRaw = firstValue(row, ['date','datetime','date time','open time','open date','entry time','entry date','close time','close date','timestamp','time']);
  const entryRaw = firstValue(row, ['entry price','entryprice','open price','openprice','price open','prix entree','entry']);
  const exitRaw = firstValue(row, ['exit price','exitprice','close price','closeprice','price close','prix sortie','exit']);
  const slRaw = firstValue(row, ['stop loss','stoploss','sl']);
  const tpRaw = firstValue(row, ['take profit','takeprofit','tp']);
  const lotRaw = firstValue(row, ['lot size','lotsize','lots','lot','volume','quantity','qty']);
  const commissionRaw = firstValue(row, ['commission','commissions','fees','fee','frais']);
  const swapRaw = firstValue(row, ['swap','swaps','rollover']);
  const rRaw = firstValue(row, ['r multiple','rmultiple','realized r','rr realized','rr']);

  // IMPORTANT: PnL aliases are deliberately ordered by semantic precision. Balance/Total/Amount are NOT PnL fallbacks.
  const pnlRaw = firstValue(row, [
    'net pnl','net p&l','net p/l','net profit','netprofit','closed pnl','closed p&l','closed p/l','profit loss','profit/loss','profit','pnl','p&l','p/l','realized pnl','realized profit','result','résultat','gain','perte','profit usd','pnl usd','net pnl usd','profit eur','pnl eur','gross profit','gross loss'
  ]);
  const date = parseDateString(dateRaw) || parseDateString(firstValue(row, ['close date','close time','exit time'])) || new Date().toISOString().slice(0, 10);
  const time = extractTime(firstValue(row, ['open time','entry time','date time','datetime','time','timestamp'])) || extractTime(dateRaw);
  const parsedPnL = parseNumericPnL(pnlRaw);
  const hasTradeEvidence = symbol !== 'UNKNOWN' || isSide(sideRaw) || entryRaw !== undefined || exitRaw !== undefined || slRaw !== undefined || tpRaw !== undefined;
  const { deposit, withdrawal } = classifyKeywords(allText);
  if (!hasTradeEvidence || (deposit || withdrawal) && !isSide(sideRaw) && symbol === 'UNKNOWN') return null;

  const netPnL = parsedPnL ?? 0;
  const side = isSide(sideRaw) ? normalizeSide(String(sideRaw)) : /\b(sell|short|vente)\b/i.test(allText) ? 'SELL' : 'BUY';
  const killzoneRaw = firstValue(row, ['killzone','session','trading session','zone']);
  const finalSession = killzoneRaw ? getStandardSession({ killzone: String(killzoneRaw), time }) : (time ? deduceSessionFromTime(time) : undefined);
  const outcome: TradeOutcome = netPnL > 0 ? 'Win' : netPnL < 0 ? 'Loss' : 'BE';

  return {
    id: `imp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    time,
    symbol,
    side,
    entry: parsePrice(entryRaw),
    exit: parsePrice(exitRaw),
    stopLoss: parsePrice(slRaw),
    takeProfit: parsePrice(tpRaw),
    lotSize: parsePrice(lotRaw),
    commission: parsePrice(commissionRaw),
    swap: parsePrice(swapRaw),
    netPnL,
    grossPnL: parseNumericPnL(firstValue(row, ['gross pnl','gross p&l','gross profit'])) ?? undefined,
    rMultiple: parseNumericPnL(rRaw) ?? undefined,
    outcome,
    killzone: finalSession,
    setup: String(firstValue(row, ['setup','strategy','strategie','tag','tags']) ?? '').trim() || undefined,
    source: sourceType,
    createdAt: new Date().toISOString(),
  };
}

export function processRawObjectsArray(rows: Record<string, any>[], sourceType: Trade['source']) {
  const trades: Trade[] = [];
  const deposits: AccountTransaction[] = [];
  const withdrawals: AccountTransaction[] = [];
  const ambiguousRows: AmbiguousImportRow[] = [];

  rows.forEach((row, i) => {
    const allText = Object.values(row).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').map(String).join(' ');
    if (!allText.trim()) return;
    const { deposit, withdrawal } = classifyKeywords(allText);
    const symbol = extractSymbol(row, allText);
    const sideRaw = firstValue(row, ['side','direction','trade type','type trade','sens','action','position','order type']);
    const pnlRaw = firstValue(row, ['net pnl','net p&l','net p/l','net profit','netprofit','closed pnl','closed p&l','closed p/l','profit loss','profit/loss','profit','pnl','p&l','p/l','realized pnl','realized profit','result','résultat','gain','perte','profit usd','pnl usd','net pnl usd','profit eur','pnl eur','gross profit','gross loss']);
    const pnl = parseNumericPnL(pnlRaw);
    const dateRaw = firstValue(row, ['date','datetime','date time','open time','open date','entry time','entry date','close time','close date','timestamp','time']);
    const safeDate = parseDateString(dateRaw) || new Date().toISOString().slice(0, 10);
    const time = extractTime(dateRaw);
    const amountRaw = firstValue(row, ['amount','montant','cash flow','transaction amount']);
    const amount = parseNumericPnL(amountRaw);

    if (deposit && !isSide(sideRaw) && symbol === 'UNKNOWN') {
      deposits.push({ id: `dep-${Date.now()}-${i}`, date: safeDate, time, type: 'DEPOSIT', amount: Math.abs(amount ?? pnl ?? 0), description: allText, source: sourceType as any, createdAt: new Date().toISOString() });
      return;
    }
    if (withdrawal && !isSide(sideRaw) && symbol === 'UNKNOWN') {
      withdrawals.push({ id: `wth-${Date.now()}-${i}`, date: safeDate, time, type: 'WITHDRAWAL', amount: Math.abs(amount ?? pnl ?? 0), description: allText, source: sourceType as any, createdAt: new Date().toISOString() });
      return;
    }

    const trade = makeTrade(row, sourceType, i);
    if (trade) {
      trades.push(trade);
      return;
    }

    if (pnl !== null && pnl !== 0) {
      ambiguousRows.push({
        id: `amb-${Date.now()}-${i}`,
        rawText: allText,
        suggestedType: 'AMBIGUOUS',
        confidenceReason: 'PnL détecté mais la ligne ne contient pas suffisamment d’éléments pour confirmer un trade.',
        date: safeDate,
        symbol: symbol !== 'UNKNOWN' ? symbol : undefined,
        amountOrPnL: pnl,
        tradeCandidate: { symbol: symbol !== 'UNKNOWN' ? symbol : undefined, side: isSide(sideRaw) ? normalizeSide(String(sideRaw)) : 'BUY', netPnL: pnl },
      });
    }
  });
  return { trades, deposits, withdrawals, ambiguousRows };
}

function parseCSVRows(text: string): Record<string, any>[] {
  const normalized = text.replace(/^\uFEFF/, '');
  const result = Papa.parse<Record<string, any>>(normalized, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
    transform: (v) => typeof v === 'string' ? v.trim() : v,
  });
  if (result.errors.length) console.warn('CSV parser warnings:', result.errors.slice(0, 5));
  const rows = (result.data || []).filter((r) => Object.keys(r).some((k) => String(r[k] ?? '').trim() !== ''));
  if (rows.length && Object.keys(rows[0]).length > 1) return rows;

  // Some broker exports have no header row. Parse without headers and infer common column positions.
  const raw = Papa.parse<string[]>(normalized, { header: false, skipEmptyLines: 'greedy', delimiter: '' });
  const matrix = raw.data || [];
  if (!matrix.length) return [];
  const header = matrix[0].map((v, i) => String(v || `Column ${i + 1}`).trim());
  const looksLikeHeader = header.some((h) => /symbol|pair|profit|pnl|date|time|side|direction|entry|exit/i.test(h));
  if (looksLikeHeader) return matrix.slice(1).map((values) => Object.fromEntries(header.map((h, i) => [h, values[i] ?? ''])));
  return matrix.map((values) => Object.fromEntries(values.map((v, i) => [`Column ${i + 1}`, v])));
}

export async function parseDocumentFile(file: File, existingTrades: Trade[] = []): Promise<PendingImportSummary> {
  const batchId = `batch-${Date.now()}`;
  const fileName = file.name;
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  let trades: Trade[] = [];
  let deposits: AccountTransaction[] = [];
  let withdrawals: AccountTransaction[] = [];
  let ambiguousRows: AmbiguousImportRow[] = [];
  let rawText = '';

  if (fileExt === '.csv' || fileExt === '.txt') {
    rawText = await file.text();
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const json = JSON.parse(trimmed);
        const rows = Array.isArray(json) ? json : json.trades || json.transactions || [];
        const result = processRawObjectsArray(rows, 'Imported JSON');
        trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
      } catch { /* continue with CSV */ }
    }
    if (!trades.length && !deposits.length && !withdrawals.length) {
      const result = processRawObjectsArray(parseCSVRows(rawText), 'Imported CSV');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
      if (!trades.length && !deposits.length && !withdrawals.length) {
        const textResult = parseTextJournalReportAdvanced(rawText, 'Imported CSV');
        trades = textResult.trades; deposits = textResult.deposits; withdrawals = textResult.withdrawals; ambiguousRows = textResult.ambiguousRows;
      }
    }
  } else if (fileExt === '.xlsx' || fileExt === '.xls') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const result = processRawObjectsArray(rows, 'Imported XLSX');
    trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
  } else if (fileExt === '.json') {
    rawText = await file.text();
    try {
      const json = JSON.parse(rawText);
      const rows = Array.isArray(json) ? json : json.trades || json.transactions || [];
      const result = processRawObjectsArray(rows, 'Imported JSON');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
    } catch (e) { console.error('Invalid JSON file:', e); }
  } else if (fileExt === '.pdf') {
    rawText = await extractTextFromPDF(file);
    if (rawText) {
      const result = parseTextJournalReportAdvanced(rawText, 'Imported PDF');
      trades = result.trades; deposits = result.deposits; withdrawals = result.withdrawals; ambiguousRows = result.ambiguousRows;
    }
  }

  const warnings: TradeValidationWarning[] = [];
  let validDatesCount = 0, validSymbolsCount = 0, validPnLCount = 0, missingEntryCount = 0, missingStopLossCount = 0, missingCommissionCount = 0;
  trades.forEach((trade, index) => {
    if (trade.date) validDatesCount++; else warnings.push({ tradeIndex: index, field: 'date', message: 'Date manquante' });
    if (trade.symbol && trade.symbol !== 'UNKNOWN') validSymbolsCount++; else warnings.push({ tradeIndex: index, field: 'symbol', message: 'Symbole manquant' });
    if (Number.isFinite(trade.netPnL)) validPnLCount++; else warnings.push({ tradeIndex: index, field: 'netPnL', message: 'PnL non détecté' });
    if (trade.entry === undefined) missingEntryCount++;
    if (trade.stopLoss === undefined) missingStopLossCount++;
    if (trade.commission === undefined) missingCommissionCount++;
  });

  const duplicates: DuplicateMatch[] = [];
  for (const incoming of trades) {
    const match = existingTrades.find((existing) => existing.date === incoming.date && existing.symbol === incoming.symbol && existing.side === incoming.side && Math.abs(existing.netPnL - incoming.netPnL) < 0.01);
    if (match) duplicates.push({ existingTrade: match, incomingTrade: incoming, reason: `Même date, symbole, direction et PnL` });
  }

  return {
    batchId,
    fileName,
    fileType: fileExt.toUpperCase().replace('.', ''),
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

export function parseTextJournalReportAdvanced(text: string, sourceType: Trade['source'] = 'Imported PDF') {
  const rows = text.split(/\r?\n/).map((line) => ({ raw: line })).filter((r) => r.raw.trim());
  const trades: Trade[] = [], deposits: AccountTransaction[] = [], withdrawals: AccountTransaction[] = [], ambiguousRows: AmbiguousImportRow[] = [];
  rows.forEach((r, i) => {
    const line = r.raw.trim();
    const date = parseDateString(line) || new Date().toISOString().slice(0, 10);
    const symbolMatch = line.match(/\b(?:XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|GBPJPY|EURJPY|NAS100|US100|US30|US500|GER40|BTCUSD|ETHUSD)\b/i);
    const sideMatch = line.match(/\b(BUY|SELL|LONG|SHORT|ACHAT|VENTE)\b/i);
    const numbers = line.match(/[+-]?(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?/g) || [];
    const pnl = numbers.length ? parseNumericPnL(numbers[numbers.length - 1]) : null;
    const lower = line.toLowerCase();
    if (DEPOSIT_KEYWORDS.some((k) => lower.includes(k)) && !sideMatch) { deposits.push({ id: `dep-txt-${Date.now()}-${i}`, date, type: 'DEPOSIT', amount: Math.abs(pnl ?? 0), description: line, source: sourceType as any, createdAt: new Date().toISOString() }); return; }
    if (WITHDRAWAL_KEYWORDS.some((k) => lower.includes(k)) && !sideMatch) { withdrawals.push({ id: `wth-txt-${Date.now()}-${i}`, date, type: 'WITHDRAWAL', amount: Math.abs(pnl ?? 0), description: line, source: sourceType as any, createdAt: new Date().toISOString() }); return; }
    if (symbolMatch && (sideMatch || pnl !== null)) {
      const netPnL = pnl ?? 0;
      trades.push({ id: `trade-txt-${Date.now()}-${i}`, date, symbol: normalizeSymbol(symbolMatch[0]), side: sideMatch ? normalizeSide(sideMatch[1]) : 'BUY', netPnL, outcome: netPnL > 0 ? 'Win' : netPnL < 0 ? 'Loss' : 'BE', source: sourceType as any, createdAt: new Date().toISOString() });
    }
  });
  return { trades, deposits, withdrawals, ambiguousRows };
}
