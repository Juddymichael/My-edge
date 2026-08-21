import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Trade, AccountTransaction, AmbiguousImportRow, PendingImportSummary, TradeValidationWarning, DuplicateMatch, TradeSide, TradeOutcome } from '../types';
import { deduceSessionFromTime, getStandardSession } from '../utils/tradingSession';

if (typeof window !== 'undefined' && pdfjsLib) {
  try { pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '6.2.108'}/pdf.worker.min.mjs`; } catch {}
}

export function normalizeHeader(raw: unknown): string {
  return String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function normalizeSymbol(raw: string): string {
  if (!raw) return 'UNKNOWN';
  let s = raw.trim().toUpperCase().replace(/[\/\-_\s]/g, '');
  if (s.startsWith('FX:')) s = s.slice(3);
  return s || 'UNKNOWN';
}
export function normalizeSide(raw: string): TradeSide {
  return ['SHORT','SELL','S','VENTE','V'].includes(String(raw ?? '').trim().toUpperCase()) ? 'SELL' : 'BUY';
}
export function parseDateString(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  let m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function parseNumericPnL(raw: unknown): number | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/^\(|\)$/g,'').replace(/[€$£¥+\s]/g,'');
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
  else if (s.includes(',')) { const p=s.split(','); s=p.length===2 && p[1].length<=2 ? `${p[0]}.${p[1]}` : s.replace(/,/g,''); }
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -Math.abs(n) : n) : null;
}

const PNL = ['netpnl','pnl','pnlusd','pnleur','profitloss','profitandloss','netprofit','profit','netresult','resultat','result','gain','perte','gainspertes','traderesult','realizedpnl','realisedpnl','closedpnl'];
const SYMBOL = ['symbol','pair','paire','instrument','asset','ticker','market'];
const SIDE = ['side','direction','sens','typetrade','typeside','action'];
const DATE = ['date','datetime','timestamp','closed','closetime','closingtime','opened','opentime','openingtime'];
const TIME = ['time','heure','closetime','closingtime','opentime','openingtime'];
const ENTRY = ['entry','entryprice','openprice','prixdentree'];
const EXIT = ['exit','exitprice','closeprice','prixdesortie'];
const SL = ['stoploss','sl'];
const TP = ['takeprofit','tp'];
const LOT = ['lot','lots','lotsize','quantity','qty','volume'];
const COMM = ['commission','comm','frais','fee','fees'];
const SWAP = ['swap','swaps','rollover'];
const R = ['rmultiple','rrrealise','riskreward'];
const SESSION = ['killzone','session','zone'];
const SETUP = ['setup','strategy','strategie','tag'];
const COMMENT = ['comment','description','notes','libelle','details','commentaire','message'];
const TYPE = ['transactiontype','operation','categorie','typedoperation','typeoperation','type'];
const DEPOSIT = ['deposit','depot','credit','fundin','topup','recharge','versement','apport','inflow'];
const WITHDRAWAL = ['withdraw','retrait','debit','fundout','payout','cashout','outflow'];

function field(row: Record<string,unknown>, aliases: string[]): unknown {
  for (const a of aliases) {
    const target=normalizeHeader(a);
    const key=Object.keys(row).find(k=>normalizeHeader(k)===target);
    if (key && String(row[key]??'').trim()!=='') return row[key];
  }
  return undefined;
}
function text(row: Record<string,unknown>): string { return Object.values(row).filter(v=>v!==undefined&&v!==null).map(String).join(' '); }
function hasWord(value: unknown, words: string[]): boolean { const s=normalizeHeader(value); return words.some(w=>s.includes(normalizeHeader(w))); }
function num(v: unknown): number|undefined { const n=parseNumericPnL(v); return n===null?undefined:n; }
function time(v: unknown): string|undefined { const m=String(v??'').match(/(?:^|[T\s])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/); return m?`${m[1].padStart(2,'0')}:${m[2]}`:undefined; }

function makeTrade(row: Record<string,unknown>, source: Trade['source'], i:number): Trade|null {
  const pnl=parseNumericPnL(field(row,PNL));
  const symbolRaw=field(row,SYMBOL);
  const sideRaw=field(row,SIDE);
  const entry=field(row,ENTRY), exit=field(row,EXIT), sl=field(row,SL), tp=field(row,TP);
  const hasSide=/^(BUY|SELL|LONG|SHORT|ACHAT|VENTE)$/i.test(String(sideRaw??''));
  const symbol=symbolRaw?normalizeSymbol(String(symbolRaw)):'UNKNOWN';
  const date=parseDateString(field(row,DATE));
  const account=hasWord(`${field(row,TYPE)??''} ${field(row,COMMENT)??''}`,DEPOSIT)||hasWord(`${field(row,TYPE)??''} ${field(row,COMMENT)??''}`,WITHDRAWAL);
  const hasTradeStructure=symbol!=='UNKNOWN'||hasSide||entry!==undefined||exit!==undefined||sl!==undefined||tp!==undefined;
  if (pnl===null || !date || !hasTradeStructure || account) return null;
  const t=time(field(row,TIME)??field(row,DATE));
  const outcome:TradeOutcome=pnl>0?'Win':pnl<0?'Loss':'BE';
  return { id:`imp-${Date.now()}-${i}`, date, time:t, symbol, side:hasSide?normalizeSide(String(sideRaw)):(pnl<0?'SELL':'BUY'), entry:num(entry), exit:num(exit), stopLoss:num(sl), takeProfit:num(tp), lotSize:num(field(row,LOT)), commission:num(field(row,COMM)), swap:num(field(row,SWAP)), netPnL:pnl, rMultiple:num(field(row,R)), outcome, killzone:field(row,SESSION)?getStandardSession({killzone:String(field(row,SESSION)),time:t}):(t?deduceSessionFromTime(t):undefined), setup:field(row,SETUP)?String(field(row,SETUP)):undefined, notes:field(row,COMMENT)?String(field(row,COMMENT)):undefined, source, createdAt:new Date().toISOString() };
}

export function processRawObjectsArray(rows: Record<string,unknown>[], source:Trade['source']) {
  const trades:Trade[]=[]; const deposits:AccountTransaction[]=[]; const withdrawals:AccountTransaction[]=[]; const ambiguousRows:AmbiguousImportRow[]=[];
  rows.forEach((row,i)=>{
    const amount=parseNumericPnL(field(row,PNL)); const date=parseDateString(field(row,DATE)); const typeText=`${field(row,TYPE)??''} ${field(row,COMMENT)??''}`; const side=field(row,SIDE); const hasSide=/^(BUY|SELL|LONG|SHORT|ACHAT|VENTE)$/i.test(String(side??''));
    if(date&&amount!==null&&hasWord(typeText,DEPOSIT)&&!hasSide){ deposits.push({id:`dep-${Date.now()}-${i}`,date,time:time(field(row,TIME)),type:'DEPOSIT',amount:Math.abs(amount),description:String(field(row,COMMENT)??field(row,TYPE)??'Dépôt importé'),source:source as any,createdAt:new Date().toISOString()}); return; }
    if(date&&amount!==null&&hasWord(typeText,WITHDRAWAL)&&!hasSide){ withdrawals.push({id:`wth-${Date.now()}-${i}`,date,time:time(field(row,TIME)),type:'WITHDRAWAL',amount:Math.abs(amount),description:String(field(row,COMMENT)??field(row,TYPE)??'Retrait importé'),source:source as any,createdAt:new Date().toISOString()}); return; }
    const trade=makeTrade(row,source,i); if(trade){trades.push(trade);return;}
    if(date&&amount!==null&&Math.abs(amount)>0) ambiguousRows.push({id:`amb-${Date.now()}-${i}`,rawText:text(row),suggestedType:'TRADE',confidenceReason:'Montant trouvé mais structure insuffisante pour classer la ligne sans risque.',date,symbol:field(row,SYMBOL)?String(field(row,SYMBOL)):undefined,amountOrPnL:amount});
  });
  return {trades,deposits,withdrawals,ambiguousRows};
}

export async function extractTextFromPDF(file:File):Promise<string>{ try { const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise; let out=''; for(let p=1;p<=pdf.numPages;p++){const c=await (await pdf.getPage(p)).getTextContent();out+=c.items.map((x:any)=>x.str).join(' ')+'\n';} return out;} catch(e){console.warn('PDF extraction failed',e);return '';} }

function textTradeRows(raw:string,source:Trade['source']):Trade[]{
  const rows:Record<string,unknown>[]=[];
  for(const line of raw.split(/\r?\n/)){ const date=line.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/)?.[1]; const symbol=line.match(/\b(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|GBPJPY|EURJPY|NAS100|US100|US30|SPX500|GER40|BTCUSD|ETHUSD)\b/i)?.[1]; const side=line.match(/\b(BUY|SELL|LONG|SHORT|ACHAT|VENTE)\b/i)?.[1]; const nums=line.match(/(?:^|\s)([+-]?(?:[$€£])?\(?\d[\d\s.,]*\)?)(?:\s*(?:USD|EUR|GBP))?(?:\s|$)/); if(date&&symbol&&nums) rows.push({Date:date,Symbol:symbol,Side:side??'',PnL:nums[1]}); }
  return processRawObjectsArray(rows,source).trades;
}

export async function parseDocumentFile(file:File,existingTrades:Trade[]=[]):Promise<PendingImportSummary>{
  const batchId=`batch-${Date.now()}`; const ext=file.name.substring(file.name.lastIndexOf('.')).toLowerCase(); let trades:Trade[]=[]; let deposits:AccountTransaction[]=[]; let withdrawals:AccountTransaction[]=[]; let ambiguousRows:AmbiguousImportRow[]=[]; let rawText='';
  if(ext==='.csv'||ext==='.txt'){
    rawText=await file.text(); const parsed=Papa.parse<Record<string,unknown>>(rawText,{header:true,skipEmptyLines:true,transformHeader:h=>h.trim()});
    if(parsed.data.length&&Object.keys(parsed.data[0]??{}).length>1){const r=processRawObjectsArray(parsed.data,'Imported CSV');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;}
    else trades=textTradeRows(rawText,'Imported CSV');
  } else if(ext==='.xlsx'||ext==='.xls'){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}); const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]],{defval:''}); const r=processRawObjectsArray(rows,'Imported XLSX'); trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;
  } else if(ext==='.json'){
    rawText=await file.text(); try{const json=JSON.parse(rawText);const rows=Array.isArray(json)?json:(json.trades??[]);const r=processRawObjectsArray(rows,'Imported JSON');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;}catch{ambiguousRows.push({id:`amb-${Date.now()}`,rawText,suggestedType:'IGNORE',confidenceReason:'JSON invalide.',date:new Date().toISOString().slice(0,10),amountOrPnL:0});}
  } else if(ext==='.pdf'){
    rawText=await extractTextFromPDF(file); trades=textTradeRows(rawText,'Imported PDF');
  }
  const warnings:TradeValidationWarning[]=[]; let validDatesCount=0,validSymbolsCount=0,validPnLCount=0,missingEntryCount=0,missingStopLossCount=0,missingCommissionCount=0;
  trades.forEach((t,i)=>{if(t.date)validDatesCount++;if(t.symbol&&t.symbol!=='UNKNOWN')validSymbolsCount++;else warnings.push({tradeIndex:i,field:'symbol',message:'Paire/symbole manquant'});if(Number.isFinite(t.netPnL))validPnLCount++;else warnings.push({tradeIndex:i,field:'netPnL',message:'PnL non détecté'});if(t.entry===undefined)missingEntryCount++;if(t.stopLoss===undefined)missingStopLossCount++;if(t.commission===undefined)missingCommissionCount++;});
  const duplicates:DuplicateMatch[]=[]; for(const incoming of trades){const match=existingTrades.find(e=>e.date===incoming.date&&e.symbol===incoming.symbol&&e.side===incoming.side&&Math.abs(e.netPnL-incoming.netPnL)<0.01);if(match)duplicates.push({existingTrade:match,incomingTrade:incoming,reason:'Date + symbole + direction + PnL identiques.'});}
  return {batchId,fileName:file.name,fileType:ext.replace('.','').toUpperCase(),rawText,totalDetected:trades.length+deposits.length+withdrawals.length+ambiguousRows.length,trades,deposits,withdrawals,ambiguousRows,tradesCount:trades.length,depositsCount:deposits.length,withdrawalsCount:withdrawals.length,duplicatesCount:duplicates.length,validDatesCount,validSymbolsCount,validPnLCount,missingEntryCount,missingStopLossCount,missingCommissionCount,warnings,duplicates};
}
