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
  ImportItemClassification 
} from '../types';
import { deduceSessionFromTime, getStandardSession } from '../utils/tradingSession';

// Set worker source for PDF.js client-side parser
if (typeof window !== 'undefined' && pdfjsLib) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization:', e);
  }
}

/**
 * Normalizes symbols (e.g. "eurusd" -> "EURUSD", "XAU/USD" -> "XAUUSD")
 */
export function normalizeSymbol(raw: string): string {
  if (!raw) return 'UNKNOWN';
  let s = raw.trim().toUpperCase().replace(/[\/\-_]/g, '');
  if (s.startsWith('FX:')) s = s.substring(3);
  return s;
}

/**
 * Normalizes side/direction ("Long" -> "BUY", "Short" -> "SELL", "buy" -> "BUY")
 */
export function normalizeSide(raw: string): TradeSide {
  if (!raw) return 'BUY';
  const l = raw.trim().toUpperCase();
  if (l === 'SHORT' || l === 'SELL' || l === 'S' || l === 'VENTE' || l === 'V') return 'SELL';
  return 'BUY';
}

/**
 * Parses date string into YYYY-MM-DD
 */
export function parseDateString(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Try YYYY.MM.DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[\.\/-](\d{1,2})[\.\/-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try DD.MM.YYYY or DD/MM/YYYY
  const dmY = str.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})/);
  if (dmY) {
    const day = dmY[1].padStart(2, '0');
    const month = dmY[2].padStart(2, '0');
    const year = dmY[3];
    return `${year}-${month}-${day}`;
  }

  // Try parsing English / French Month names (e.g. "Aug 10, 2026", "10 Août 2026")
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Parses numeric PnL or amount cleanly (handles 1 200,50 / $1,200.50 / -450€ / (100))
 */
export function parseNumericPnL(raw: any): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;

  let str = String(raw).trim();
  
  // Check for accounting negative format: (120.50) -> -120.50
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  } else if (str.startsWith('-') || str.includes(' -') || str.includes('loss') || str.includes('perte')) {
    isNegative = true;
  }

  // Remove currency signs, letters, and extra spaces
  str = str.replace(/[$€£¥+\s]/g, '').trim();

  // Handle European comma decimal: "1250,50" -> "1250.50" or "1.250,50" -> "1250.50"
  if (str.includes(',') && str.includes('.')) {
    // Determine which is thousand separator
    if (str.indexOf('.') < str.indexOf(',')) {
      // 1.250,50 -> 1250.50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 -> 1250.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma present: 1250,50 -> 1250.50
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  return isNegative ? -Math.abs(num) : num;
}

/**
 * Client-side PDF text extractor using pdfjs-dist
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageItems = textContent.items.map((item: any) => item.str);
      fullText += pageItems.join(' ') + '\n';
    }

    return fullText;
  } catch (err) {
    console.warn('Client-side PDF extraction failed:', err);
    return '';
  }
}

/**
 * Keyword dictionaries for deposit and withdrawal recognition (FR + EN + MT4/MT5/NinjaTrader/cTrader formats)
 */
const DEPOSIT_KEYWORDS = [
  'deposit', 'dépôt', 'depot', 'credit', 'crédit', 'inward', 'fund in', 'alimentation', 
  'top-up', 'topup', 'wire in', 'recharge', 'versement', 'pay in', 'versement initial', 
  'balance deposit', 'dep', 'solde initial', 'apport', 'inflow'
];

const WITHDRAWAL_KEYWORDS = [
  'withdraw', 'withdrawal', 'retrait', 'debit', 'débit', 'outward', 'fund out', 'payout', 
  'cashout', 'wire out', 'virement sortant', 'ret', 'balance withdrawal', 'outflow', 'ponction'
];

const KNOWN_FOREX_CRYPTO_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'EURAUD',
  'XAUUSD', 'XAGUSD', 'GOLD', 'SILVER', 'USOIL', 'UKOIL', 'WTI', 'BRENT',
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'US500', 'SPX500', 'NAS100', 'US100', 'US30', 'DJI', 'GER40', 'DAX', 'FRA40', 'CAC40'
];

export interface ClassificationResult {
  type: ImportItemClassification;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export function classifyRawItem(
  textToScan: string,
  hasSymbol: boolean,
  hasSide: boolean,
  hasPrices: boolean,
  amount: number | null
): ClassificationResult {
  const lower = textToScan.toLowerCase();

  // Explicit deposit keyword match
  const isDepositKeyword = DEPOSIT_KEYWORDS.some((kw) => {
    const regex = new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i');
    return regex.test(lower);
  });

  // Explicit withdrawal keyword match
  const isWithdrawalKeyword = WITHDRAWAL_KEYWORDS.some((kw) => {
    const regex = new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i');
    return regex.test(lower);
  });

  // If explicit deposit keyword and NO trade direction
  if (isDepositKeyword && !hasSide) {
    return {
      type: 'DEPOSIT',
      confidence: 'HIGH',
      reason: 'Opération de compte : mot-clé de Dépôt / Crédit identifié',
    };
  }

  // If explicit withdrawal keyword and NO trade direction
  if (isWithdrawalKeyword && !hasSide) {
    return {
      type: 'WITHDRAWAL',
      confidence: 'HIGH',
      reason: 'Opération de compte : mot-clé de Retrait / Débit identifié',
    };
  }

  // If trade direction or known instrument symbol + trading attributes
  if (hasSymbol && hasSide) {
    return {
      type: 'TRADE',
      confidence: 'HIGH',
      reason: 'Trade identifié : Symbole et sens d\'exécution (BUY/SELL) détectés',
    };
  }

  if (hasSymbol && hasPrices) {
    return {
      type: 'TRADE',
      confidence: 'HIGH',
      reason: 'Trade identifié : Symbole et prix d\'exécution (Entry/Exit/SL) détectés',
    };
  }

  // Mixed or ambiguous cases
  if ((isDepositKeyword || isWithdrawalKeyword) && (hasSymbol || hasSide)) {
    return {
      type: 'AMBIGUOUS',
      confidence: 'LOW',
      reason: 'Indéterminé : contient à la fois des mots-clés de compte et de trading',
    };
  }

  if (!hasSymbol && !hasSide && amount !== null && Math.abs(amount) > 0) {
    if (isDepositKeyword) {
      return {
        type: 'DEPOSIT',
        confidence: 'HIGH',
        reason: 'Ligne financière : montant avec libellé de Dépôt',
      };
    }
    if (isWithdrawalKeyword) {
      return {
        type: 'WITHDRAWAL',
        confidence: 'HIGH',
        reason: 'Ligne financière : montant avec libellé de Retrait',
      };
    }
    return {
      type: 'AMBIGUOUS',
      confidence: 'MEDIUM',
      reason: 'Ligne financière sans symbole de trading ni mot-clé explicite',
    };
  }

  if (hasSymbol) {
    return {
      type: 'TRADE',
      confidence: 'MEDIUM',
      reason: 'Symbole de trading identifié sans sens explicite',
    };
  }

  return {
    type: 'IGNORE',
    confidence: 'HIGH',
    reason: 'Ligne informative, sous-total ou en-tête sans impact financier',
  };
}

/**
 * Text line parser with automatic classification into Trades, Deposits, Withdrawals, Ambiguities
 */
export function parseTextJournalReportAdvanced(
  text: string,
  sourceType: Trade['source'] = 'Imported PDF'
): {
  trades: Trade[];
  deposits: AccountTransaction[];
  withdrawals: AccountTransaction[];
  ambiguousRows: AmbiguousImportRow[];
} {
  const trades: Trade[] = [];
  const deposits: AccountTransaction[] = [];
  const withdrawals: AccountTransaction[] = [];
  const ambiguousRows: AmbiguousImportRow[] = [];

  const lines = text.split(/\r?\n/);
  const monthNames = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
  
  let itemIdx = 1;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    const lower = trimmed.toLowerCase();

    // Check if contains deposit/credit keywords
    const isDep = DEPOSIT_KEYWORDS.some((kw) => new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i').test(lower));
    const isWth = WITHDRAWAL_KEYWORDS.some((kw) => new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i').test(lower));

    const dateMatch = trimmed.match(/(\d{4}[-\.\/]\d{1,2}[-\.\/]\d{1,2}|\d{1,2}[-\.\/]\d{1,2}[-\.\/]\d{4})/);
    const amountMatch = trimmed.match(/[+\-]?[$€£¥]?\s*\(?[\d\s\.,]{2,}\)?/);
    const parsedAmount = amountMatch ? parseNumericPnL(amountMatch[0]) : null;
    const parsedDate = dateMatch ? parseDateString(dateMatch[1]) : new Date().toISOString().substring(0, 10);

    if (isDep && !lower.includes('buy') && !lower.includes('sell') && !lower.includes('long') && !lower.includes('short')) {
      const amt = parsedAmount !== null ? Math.abs(parsedAmount) : 1000;
      deposits.push({
        id: `dep-txt-${Date.now()}-${itemIdx++}`,
        date: parsedDate || new Date().toISOString().substring(0, 10),
        type: 'DEPOSIT',
        amount: amt,
        description: trimmed,
        source: sourceType as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    if (isWth && !lower.includes('buy') && !lower.includes('sell') && !lower.includes('long') && !lower.includes('short')) {
      const amt = parsedAmount !== null ? Math.abs(parsedAmount) : 500;
      withdrawals.push({
        id: `wth-txt-${Date.now()}-${itemIdx++}`,
        date: parsedDate || new Date().toISOString().substring(0, 10),
        type: 'WITHDRAWAL',
        amount: amt,
        description: trimmed,
        source: sourceType as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // Check standard trade pattern
    const symbolMatch = trimmed.match(/\b([A-Z]{3,6}(?:\/[A-Z]{3})?|XAUUSD|XAGUSD|US30|NAS100|SPX500|GER40|BTCUSD|ETHUSD)\b/i);
    const sideMatch = trimmed.match(/\b(BUY|SELL|LONG|SHORT|ACHAT|VENTE)\b/i);

    if (symbolMatch && (sideMatch || parsedAmount !== null)) {
      const symbol = normalizeSymbol(symbolMatch[1]);
      const side = sideMatch ? normalizeSide(sideMatch[1]) : (parsedAmount !== null && parsedAmount >= 0 ? 'BUY' : 'SELL');
      const netPnL = parsedAmount ?? 0;

      trades.push({
        id: `trade-txt-${Date.now()}-${itemIdx++}`,
        date: parsedDate || new Date().toISOString().substring(0, 10),
        symbol,
        side,
        netPnL,
        outcome: netPnL > 0 ? 'Win' : netPnL < 0 ? 'Loss' : 'BE',
        source: sourceType as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // If row contains an amount and date but couldn't be classified cleanly -> Ambiguous
    if (parsedAmount !== null && Math.abs(parsedAmount) > 0 && !trimmed.toLowerCase().includes('total') && !trimmed.toLowerCase().includes('balance:')) {
      ambiguousRows.push({
        id: `amb-txt-${Date.now()}-${itemIdx++}`,
        rawText: trimmed,
        suggestedType: parsedAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
        confidenceReason: 'Ligne contenant un montant financier sans paire ni direction formelle',
        date: parsedDate || new Date().toISOString().substring(0, 10),
        amountOrPnL: parsedAmount,
      });
    }
  });

  return { trades, deposits, withdrawals, ambiguousRows };
}

/**
 * Universal document parser (CSV, XLSX, JSON, TXT/PDF) with smart separation of Trades, Deposits, Withdrawals
 */
export async function parseDocumentFile(
  file: File,
  existingTrades: Trade[] = []
): Promise<PendingImportSummary> {
  const batchId = `batch-${Date.now()}`;
  const fileName = file.name;
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

  let extractedTrades: Trade[] = [];
  let extractedDeposits: AccountTransaction[] = [];
  let extractedWithdrawals: AccountTransaction[] = [];
  let extractedAmbiguous: AmbiguousImportRow[] = [];
  let rawTextContent = '';

  if (fileExt === '.csv' || fileExt === '.txt') {
    const text = await file.text();
    rawTextContent = text;

    // Try JSON first if text looks like JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        const tradeList = Array.isArray(json) ? json : json.trades || [];
        const depositList = json.deposits || json.transactions?.filter((t: any) => t.type === 'DEPOSIT') || [];
        const withdrawalList = json.withdrawals || json.transactions?.filter((t: any) => t.type === 'WITHDRAWAL') || [];

        const structuredResult = processRawObjectsArray(tradeList, 'Imported JSON');
        extractedTrades = structuredResult.trades;
        extractedDeposits = structuredResult.deposits;
        extractedWithdrawals = structuredResult.withdrawals;
        extractedAmbiguous = structuredResult.ambiguousRows;

        // Process explicit transactions arrays if present
        if (Array.isArray(depositList) && depositList.length > 0) {
          depositList.forEach((d: any, idx: number) => {
            extractedDeposits.push({
              id: `dep-json-${Date.now()}-${idx}`,
              date: parseDateString(d.date) || new Date().toISOString().substring(0, 10),
              type: 'DEPOSIT',
              amount: Math.abs(parseFloat(d.amount || d.pnl || '0')),
              description: d.description || 'Dépôt JSON',
              source: 'Imported JSON',
              createdAt: new Date().toISOString(),
            });
          });
        }
        if (Array.isArray(withdrawalList) && withdrawalList.length > 0) {
          withdrawalList.forEach((w: any, idx: number) => {
            extractedWithdrawals.push({
              id: `wth-json-${Date.now()}-${idx}`,
              date: parseDateString(w.date) || new Date().toISOString().substring(0, 10),
              type: 'WITHDRAWAL',
              amount: Math.abs(parseFloat(w.amount || w.pnl || '0')),
              description: w.description || 'Retrait JSON',
              source: 'Imported JSON',
              createdAt: new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        // Fallback to CSV / text parsing
      }
    }

    if (extractedTrades.length === 0 && extractedDeposits.length === 0 && extractedWithdrawals.length === 0) {
      // Try PapaParse CSV
      const parseResult = Papa.parse<Record<string, any>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (parseResult.data && parseResult.data.length > 0 && Object.keys(parseResult.data[0]).length > 1) {
        const processed = processRawObjectsArray(parseResult.data, 'Imported CSV');
        extractedTrades = processed.trades;
        extractedDeposits = processed.deposits;
        extractedWithdrawals = processed.withdrawals;
        extractedAmbiguous = processed.ambiguousRows;
      } else {
        // Fallback to text line parser
        const textResult = parseTextJournalReportAdvanced(text, 'Imported CSV');
        extractedTrades = textResult.trades;
        extractedDeposits = textResult.deposits;
        extractedWithdrawals = textResult.withdrawals;
        extractedAmbiguous = textResult.ambiguousRows;
      }
    }
  } else if (fileExt === '.xlsx' || fileExt === '.xls') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    const processed = processRawObjectsArray(jsonData, 'Imported XLSX');
    extractedTrades = processed.trades;
    extractedDeposits = processed.deposits;
    extractedWithdrawals = processed.withdrawals;
    extractedAmbiguous = processed.ambiguousRows;
  } else if (fileExt === '.json') {
    const text = await file.text();
    rawTextContent = text;
    try {
      const json = JSON.parse(text);
      const tradeList = Array.isArray(json) ? json : json.trades || [];
      const depositList = json.deposits || json.transactions?.filter((t: any) => t.type === 'DEPOSIT') || [];
      const withdrawalList = json.withdrawals || json.transactions?.filter((t: any) => t.type === 'WITHDRAWAL') || [];

      const processed = processRawObjectsArray(tradeList, 'Imported JSON');
      extractedTrades = processed.trades;
      extractedDeposits = [...processed.deposits];
      extractedWithdrawals = [...processed.withdrawals];
      extractedAmbiguous = processed.ambiguousRows;

      if (Array.isArray(depositList)) {
        depositList.forEach((d: any, idx: number) => {
          extractedDeposits.push({
            id: `dep-json-${Date.now()}-${idx}`,
            date: parseDateString(d.date) || new Date().toISOString().substring(0, 10),
            type: 'DEPOSIT',
            amount: Math.abs(parseFloat(d.amount || '0')),
            description: d.description || 'Dépôt',
            source: 'Imported JSON',
            createdAt: new Date().toISOString(),
          });
        });
      }

      if (Array.isArray(withdrawalList)) {
        withdrawalList.forEach((w: any, idx: number) => {
          extractedWithdrawals.push({
            id: `wth-json-${Date.now()}-${idx}`,
            date: parseDateString(w.date) || new Date().toISOString().substring(0, 10),
            type: 'WITHDRAWAL',
            amount: Math.abs(parseFloat(w.amount || '0')),
            description: w.description || 'Retrait',
            source: 'Imported JSON',
            createdAt: new Date().toISOString(),
          });
        });
      }
    } catch (e) {
      console.error('Invalid JSON file:', e);
    }
  } else if (fileExt === '.pdf') {
    // Try text extraction from PDF
    try {
      const text = await extractTextFromPDF(file);
      rawTextContent = text;
      if (text) {
        const textResult = parseTextJournalReportAdvanced(text, 'Imported PDF');
        extractedTrades = textResult.trades;
        extractedDeposits = textResult.deposits;
        extractedWithdrawals = textResult.withdrawals;
        extractedAmbiguous = textResult.ambiguousRows;
      }
    } catch (e) {
      console.warn('PDF extraction failed client-side:', e);
    }

    if (extractedTrades.length === 0 && extractedDeposits.length === 0 && extractedWithdrawals.length === 0) {
      try {
        const text = await file.text();
        const textResult = parseTextJournalReportAdvanced(text, 'Imported PDF');
        extractedTrades = textResult.trades;
        extractedDeposits = textResult.deposits;
        extractedWithdrawals = textResult.withdrawals;
        extractedAmbiguous = textResult.ambiguousRows;
      } catch (e) {
        console.warn('PDF raw text fallback failed:', e);
      }
    }
  }

  // Verification & Warnings calculation
  const warnings: TradeValidationWarning[] = [];
  let validDatesCount = 0;
  let validSymbolsCount = 0;
  let validPnLCount = 0;
  let missingEntryCount = 0;
  let missingStopLossCount = 0;
  let missingCommissionCount = 0;

  extractedTrades.forEach((trade, idx) => {
    if (trade.date) validDatesCount++;
    else warnings.push({ tradeIndex: idx, field: 'date', message: 'Date manquante' });

    if (trade.symbol && trade.symbol !== 'UNKNOWN') validSymbolsCount++;
    else warnings.push({ tradeIndex: idx, field: 'symbol', message: 'Symbol/Paire manquant' });

    if (trade.netPnL !== undefined && !isNaN(trade.netPnL)) validPnLCount++;
    else warnings.push({ tradeIndex: idx, field: 'netPnL', message: 'PnL non détecté' });

    if (trade.entry === undefined) missingEntryCount++;
    if (trade.stopLoss === undefined) missingStopLossCount++;
    if (trade.commission === undefined) missingCommissionCount++;
  });

  // Duplicate Detection against existing trades
  const duplicates: DuplicateMatch[] = [];
  extractedTrades.forEach((incoming) => {
    const match = existingTrades.find((ext) => {
      const sameDate = ext.date === incoming.date;
      const sameSymbol = ext.symbol === incoming.symbol;
      const sameSide = ext.side === incoming.side;
      const samePnL = Math.abs(ext.netPnL - incoming.netPnL) < 0.01;
      return sameDate && sameSymbol && sameSide && samePnL;
    });

    if (match) {
      duplicates.push({
        existingTrade: match,
        incomingTrade: incoming,
        reason: `Même Date (${incoming.date}), Symbole (${incoming.symbol}), Direction (${incoming.side}) et PnL (${incoming.netPnL})`,
      });
    }
  });

  const totalDetected = extractedTrades.length + extractedDeposits.length + extractedWithdrawals.length + extractedAmbiguous.length;

  return {
    batchId,
    fileName,
    fileType: fileExt.toUpperCase().replace('.', ''),
    rawText: rawTextContent,
    totalDetected,
    trades: extractedTrades,
    deposits: extractedDeposits,
    withdrawals: extractedWithdrawals,
    ambiguousRows: extractedAmbiguous,
    tradesCount: extractedTrades.length,
    depositsCount: extractedDeposits.length,
    withdrawalsCount: extractedWithdrawals.length,
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

/**
 * Maps raw key-value row objects from CSV/XLSX into normalized Trades, Deposits, Withdrawals and Ambiguities
 */
export function processRawObjectsArray(
  rows: Record<string, any>[],
  sourceType: Trade['source']
): {
  trades: Trade[];
  deposits: AccountTransaction[];
  withdrawals: AccountTransaction[];
  ambiguousRows: AmbiguousImportRow[];
} {
  const trades: Trade[] = [];
  const deposits: AccountTransaction[] = [];
  const withdrawals: AccountTransaction[] = [];
  const ambiguousRows: AmbiguousImportRow[] = [];

  rows.forEach((row, i) => {
    // Find matching key names (case insensitive & stripped of punctuation/spaces)
    const findValue = (...keys: string[]) => {
      for (const key of keys) {
        const cleanTarget = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rowKey of Object.keys(row)) {
          const cleanRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanRowKey === cleanTarget || cleanRowKey.includes(cleanTarget)) {
            const val = row[rowKey];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return val;
            }
          }
        }
      }
      return undefined;
    };

    const typeVal = findValue('type', 'transactiontype', 'action', 'operation', 'categorie', 'typedoperation', 'typeoperation', 'comment', 'description');
    const symbolVal = findValue('symbol', 'pair', 'paire', 'instrument', 'asset', 'item', 'ticker');
    const sideVal = findValue('side', 'direction', 'typetrade', 'typeside', 'sens', 'actions');
    const commentVal = findValue('comment', 'description', 'notes', 'libelle', 'details', 'commentaire', 'message');
    const pnlVal = findValue('netpnl', 'pnl', 'profit', 'gain', 'perte', 'resultat', 'netprofit', 'amount', 'montant', 'valeur', 'total', 'grossprofit', 'grossloss', 'pnlusd', 'pnleur');
    const dateVal = findValue('date', 'datetime', 'opened', 'opentime', 'openingtime', 'entrytime', 'time', 'timestamp', 'closed', 'closetime', 'closingtime');
    const timeVal = findValue('time', 'opentime', 'openingtime', 'entrytime', 'heure');
    const entryVal = findValue('entry', 'entryprice', 'prixdentree', 'openprice', 'price');
    const exitVal = findValue('exit', 'exitprice', 'prixdesortie', 'closeprice');
    const slVal = findValue('stoploss', 'sl');
    const tpVal = findValue('takeprofit', 'tp');
    const lotVal = findValue('lot', 'lots', 'lotsize', 'quantity', 'taille', 'volume', 'qty');
    const commVal = findValue('commission', 'comm', 'frais', 'fee', 'fees');
    const swapVal = findValue('swap', 'swaps', 'rollover');
    const rVal = findValue('rmultiple', 'r', 'rr', 'rrrealise', 'riskreward');
    const killzoneVal = findValue('killzone', 'session', 'zone');
    const setupVal = findValue('setup', 'strategy', 'strategie', 'tag');

    const parsedDate = dateVal ? parseDateString(dateVal) : null;
    const parsedPnL = pnlVal !== undefined ? parseNumericPnL(pnlVal) : null;
    const allRowText = Object.values(row).filter(Boolean).map(v => String(v)).join(' ');

    const rowTextLower = `${typeVal || ''} ${symbolVal || ''} ${commentVal || ''} ${allRowText}`.toLowerCase();

    // Check deposit/withdrawal in text or type value
    const isExplicitDeposit = DEPOSIT_KEYWORDS.some((kw) => new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i').test(rowTextLower));
    const isExplicitWithdrawal = WITHDRAWAL_KEYWORDS.some((kw) => new RegExp(`(^|\\W)${kw}(\\W|$)`, 'i').test(rowTextLower));

    const symbolStr = symbolVal ? String(symbolVal).trim().toUpperCase() : '';
    const hasSymbol = Boolean(
      symbolStr.length > 0 && 
      !isExplicitDeposit && 
      !isExplicitWithdrawal &&
      !DEPOSIT_KEYWORDS.includes(symbolStr.toLowerCase()) && 
      !WITHDRAWAL_KEYWORDS.includes(symbolStr.toLowerCase())
    );

    const sideStr = sideVal ? String(sideVal).toUpperCase() : '';
    const hasSide = Boolean(
      sideStr.includes('BUY') || 
      sideStr.includes('SELL') || 
      sideStr.includes('LONG') || 
      sideStr.includes('SHORT') ||
      sideStr.includes('ACHAT') ||
      sideStr.includes('VENTE')
    );

    const hasPrices = Boolean(entryVal || exitVal || slVal || tpVal);

    // Extract trade time if available (e.g. "14:32" or from full timestamp)
    let tradeTime: string | undefined = undefined;
    const rawTimeCandidate = String(timeVal || dateVal || '');
    const timeMatch = rawTimeCandidate.match(/(?:T|\s|^)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    if (timeMatch) {
      tradeTime = timeMatch[1].trim();
    }

    const safeDate = parsedDate || new Date().toISOString().substring(0, 10);
    const safeAmount = parsedPnL !== null ? Math.abs(parsedPnL) : 0;

    // DIRECT CLASSIFICATION 1: Explicit Deposit
    if (isExplicitDeposit && !hasSide) {
      deposits.push({
        id: `dep-row-${Date.now()}-${i}`,
        date: safeDate,
        time: tradeTime,
        type: 'DEPOSIT',
        amount: safeAmount,
        description: String(commentVal || typeVal || `Dépôt ${safeAmount}$`),
        source: sourceType as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // DIRECT CLASSIFICATION 2: Explicit Withdrawal
    if (isExplicitWithdrawal && !hasSide) {
      withdrawals.push({
        id: `wth-row-${Date.now()}-${i}`,
        date: safeDate,
        time: tradeTime,
        type: 'WITHDRAWAL',
        amount: safeAmount,
        description: String(commentVal || typeVal || `Retrait ${safeAmount}$`),
        source: sourceType as any,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // DIRECT CLASSIFICATION 3: Standard Trading row
    if (hasSymbol || hasSide || hasPrices || (parsedPnL !== null && (typeVal === undefined || !isExplicitDeposit && !isExplicitWithdrawal))) {
      // Auto-deduce session/killzone if not explicitly provided
      let finalSession: string | undefined = undefined;
      if (killzoneVal) {
        finalSession = getStandardSession({ killzone: String(killzoneVal), time: tradeTime });
      } else if (tradeTime || dateVal) {
        const deduced = deduceSessionFromTime(tradeTime || String(dateVal));
        if (deduced) {
          finalSession = deduced;
        }
      }

      const netPnL = parsedPnL ?? 0;
      let outcome: TradeOutcome = 'Win';
      if (netPnL < 0) outcome = 'Loss';
      else if (netPnL === 0) outcome = 'BE';

      trades.push({
        id: `imp-row-${Date.now()}-${i}`,
        date: safeDate,
        time: tradeTime,
        symbol: normalizeSymbol(String(symbolVal || (KNOWN_FOREX_CRYPTO_SYMBOLS.find(s => rowTextLower.includes(s.toLowerCase())) || 'UNKNOWN'))),
        side: normalizeSide(String(sideVal || (rowTextLower.includes('sell') || rowTextLower.includes('short') || rowTextLower.includes('vente') ? 'SELL' : 'BUY'))),
        entry: entryVal ? parseFloat(String(entryVal).replace(',', '.')) : undefined,
        exit: exitVal ? parseFloat(String(exitVal).replace(',', '.')) : undefined,
        stopLoss: slVal ? parseFloat(String(slVal).replace(',', '.')) : undefined,
        takeProfit: tpVal ? parseFloat(String(tpVal).replace(',', '.')) : undefined,
        lotSize: lotVal ? parseFloat(String(lotVal).replace(',', '.')) : undefined,
        commission: commVal ? parseFloat(String(commVal).replace(',', '.')) : undefined,
        swap: swapVal ? parseFloat(String(swapVal).replace(',', '.')) : undefined,
        netPnL,
        rMultiple: rVal ? parseFloat(String(rVal).replace(',', '.')) : undefined,
        outcome,
        killzone: finalSession,
        setup: setupVal ? String(setupVal) : undefined,
        source: sourceType,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    // CLASSIFICATION 4: Ambiguous row
    if (parsedPnL !== null && Math.abs(parsedPnL) > 0) {
      ambiguousRows.push({
        id: `amb-row-${Date.now()}-${i}`,
        rawText: allRowText,
        suggestedType: parsedPnL >= 0 ? 'DEPOSIT' : 'WITHDRAWAL',
        confidenceReason: 'Ligne contenant un montant sans symbole ni type explicite',
        date: safeDate,
        symbol: symbolVal ? String(symbolVal) : undefined,
        amountOrPnL: parsedPnL,
        tradeCandidate: {
          symbol: normalizeSymbol(String(symbolVal || 'EURUSD')),
          side: normalizeSide(String(sideVal || 'BUY')),
          netPnL: parsedPnL,
        },
      });
    }
  });

  return { trades, deposits, withdrawals, ambiguousRows };
}
