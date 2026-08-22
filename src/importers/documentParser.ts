import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Trade, AccountTransaction, AmbiguousImportRow, PendingImportSummary, TradeValidationWarning, DuplicateMatch, TradeSide, TradeOutcome, ImportItemClassification } from '../types';
import { deduceSessionFromTime, getStandardSession } from '../utils/tradingSession';

if (typeof window !== 'undefined' && pdfjsLib) {
  try { pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`; } catch {}
}

const DEPOSIT_KEYWORDS = ['deposit','dépôt','depot','credit','crédit','fund in','top-up','topup','wire in','recharge','versement','pay in','apport','inflow'];
const WITHDRAWAL_KEYWORDS = ['withdraw','withdrawal','retrait','debit','débit','fund out','payout','cashout','wire out','virement sortant','outflow'];
const KNOWN_SYMBOLS = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','NZDUSD','USDCAD','EURGBP','EURJPY','GBPJPY','AUDJPY','CADJPY','CHFJPY','EURAUD','XAUUSD','XAGUSD','GOLD','SILVER','USOIL','UKOIL','WTI','BRENT','BTCUSD','ETHUSD','SOLUSD','US500','SPX500','NAS100','US100','US30','DJI','GER40','DAX','FRA40','CAC40'];
const cleanKey = (v:any) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

export function normalizeSymbol(raw:string):string { if(!raw)return 'UNKNOWN'; let s=String(raw).trim().toUpperCase().replace(/[\s\/_\-.]/g,''); if(s.startsWith('FX:'))s=s.slice(3); return KNOWN_SYMBOLS.includes(s)?s:(s.length>=6&&s.length<=12?s:'UNKNOWN'); }
export function normalizeSide(raw:string):TradeSide { return ['SHORT','SELL','S','VENTE','V','SELLING'].includes(String(raw??'').trim().toUpperCase())?'SELL':'BUY'; }

export function parseDateString(raw:any):string|null {
  if(raw instanceof Date&&!isNaN(raw.getTime()))return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;
  if(raw===undefined||raw===null||!String(raw).trim())return null;
  const s=String(raw).trim().replace(/^['"]|['"]$/g,'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  let m=s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/); if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const d=new Date(s); return isNaN(d.getTime())?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function parseNumericPnL(raw:any):number|null {
  if(raw===undefined||raw===null||!String(raw).trim())return null;
  if(typeof raw==='number')return Number.isFinite(raw)?raw:null;
  let s=String(raw).trim().replace(/[\u00a0\u202f]/g,' '); if(!s||/^(?:-|—|n\/a|na|null|none)$/i.test(s))return null;
  const negative=/^\(.*\)$/.test(s)||/^\s*-/.test(s)||/\b(?:loss|losses|perte|pertes)\b/i.test(s);
  s=s.replace(/^\(|\)$/g,'').replace(/[€$£¥₹]/g,'').replace(/\b(?:usd|eur|gbp|cad|aud|jpy)\b/ig,'').replace(/\s/g,'').replace(/\+/g,'');
  const c=s.lastIndexOf(','),d=s.lastIndexOf('.');
  if(c>=0&&d>=0)s=c>d?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(c>=0)s=(s.length-c-1<=2)?s.replace(',','.'):s.replace(/,/g,'');
  const n=Number(s); return Number.isFinite(n)?(negative?-Math.abs(n):n):null;
}

function firstValue(row:Record<string,any>,aliases:string[]):any {
  const keys=Object.keys(row);
  for(const alias of aliases){const t=cleanKey(alias);const k=keys.find(x=>cleanKey(x)===t);if(k&&row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=='')return row[k];}
  return undefined;
}

/** PnL resolver: only columns whose name semantically represents profit/loss are eligible. */
function extractPnLValue(row:Record<string,any>):any {
  const keys=Object.keys(row);
  const exact=['net pnl','net p&l','net p/l','net profit','closed pnl','closed p&l','closed p/l','realized pnl','realized p&l','realized profit','profit/loss','profit loss','pnl','p&l','p/l','profit','result','résultat','gain','perte','gross profit','gross loss'];
  for(const alias of exact){const target=cleanKey(alias);const key=keys.find(k=>cleanKey(k)===target);if(key&&parseNumericPnL(row[key])!==null)return row[key];}
  let best:string|undefined,bestScore=-Infinity;
  for(const key of keys){const k=cleanKey(key); if(!k)continue; let score=-Infinity;
    if(/netpnl|netpl|netprofit|closedpnl|closedpl|realizedpnl|realizedprofit/.test(k))score=100;
    else if(/profitloss|profitpl|profit|pnl|result|resultat|gain|perte/.test(k))score=70;
    else continue;
    if(/balance|equity|amount|montant|volume|lots?|quantity|qty|price|open|close|entry|exit|commission|fee|swap|ticket|id|total/.test(k))score=-100;
    if(parseNumericPnL(row[key])===null)score=-100;
    if(score>bestScore){bestScore=score;best=key;}
  }
  return best?row[best]:undefined;
}

function isSide(v:any):boolean{return /^(buy|sell|long|short|achat|vente|b|s)$/i.test(String(v??'').trim());}
function isLikelySymbol(v:any):boolean{if(!v)return false;const s=String(v).trim().toUpperCase().replace(/[\s\/_\-.]/g,'');return KNOWN_SYMBOLS.includes(s)||(/^[A-Z]{6,12}$/.test(s)&&!['DEPOSIT','WITHDRAW','BALANCE','ACCOUNT','UNKNOWN'].includes(s));}
function extractSymbol(row:Record<string,any>,text:string):string{const direct=firstValue(row,['symbol','pair','paire','instrument','ticker','market','asset','product']);if(isLikelySymbol(direct))return normalizeSymbol(String(direct));const u=text.toUpperCase().replace(/[\/_\-.]/g,'');const found=KNOWN_SYMBOLS.find(s=>u.includes(s));return found||'UNKNOWN';}
function extractTime(raw:any):string|undefined{const m=String(raw??'').match(/(?:^|[T\s])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:undefined;}
function parsePrice(v:any){const n=parseNumericPnL(v);return n===null?undefined:n;}
function classifyKeywords(text:string){const l=text.toLowerCase();return{deposit:DEPOSIT_KEYWORDS.some(k=>l.includes(k)),withdrawal:WITHDRAWAL_KEYWORDS.some(k=>l.includes(k))};}

export interface ClassificationResult{type:ImportItemClassification;confidence:'HIGH'|'MEDIUM'|'LOW';reason:string;}
export function classifyRawItem(text:string,hasSymbol:boolean,hasSide:boolean,hasPrices:boolean,amount:number|null):ClassificationResult{const {deposit,withdrawal}=classifyKeywords(text);if(deposit&&!hasSide&&!hasSymbol)return{type:'DEPOSIT',confidence:'HIGH',reason:'Dépôt/crédit identifié'};if(withdrawal&&!hasSide&&!hasSymbol)return{type:'WITHDRAWAL',confidence:'HIGH',reason:'Retrait/débit identifié'};if(hasSymbol&&(hasSide||hasPrices))return{type:'TRADE',confidence:'HIGH',reason:'Instrument et données d’exécution détectés'};if(amount!==null)return{type:'AMBIGUOUS',confidence:'MEDIUM',reason:'Montant détecté mais nature incertaine'};return{type:'IGNORE',confidence:'HIGH',reason:'Aucune donnée financière exploitable'};}

export async function extractTextFromPDF(file:File):Promise<string>{try{const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let out='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();out+=content.items.map((x:any)=>x.str).join(' ')+'\n';}return out;}catch(e){console.warn('PDF extraction failed:',e);return '';}}

function makeTrade(row:Record<string,any>,sourceType:Trade['source'],index:number):Trade|null {
  const allText=Object.values(row).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='').map(String).join(' '),symbol=extractSymbol(row,allText);
  const sideRaw=firstValue(row,['side','direction','trade type','type trade','sens','action','position','order type']);
  const dateRaw=firstValue(row,['date','datetime','date time','open time','open date','entry time','entry date','close time','close date','timestamp','time']);
  const entryRaw=firstValue(row,['entry price','entryprice','open price','openprice','price open','prix entree','entry']);
  const exitRaw=firstValue(row,['exit price','exitprice','close price','closeprice','price close','prix sortie','exit']);
  const slRaw=firstValue(row,['stop loss','stoploss','sl']),tpRaw=firstValue(row,['take profit','takeprofit','tp']);
  const lotRaw=firstValue(row,['lot size','lotsize','lots','lot','volume','quantity','qty']);
  const commissionRaw=firstValue(row,['commission','commissions','fees','fee','frais']),swapRaw=firstValue(row,['swap','swaps','rollover']);
  const rRaw=firstValue(row,['r multiple','rmultiple','realized r','rr realized','rr']);
  const pnlRaw=extractPnLValue(row),parsedPnL=parseNumericPnL(pnlRaw);
  const hasTradeEvidence=symbol!=='UNKNOWN'||isSide(sideRaw)||entryRaw!==undefined||exitRaw!==undefined||slRaw!==undefined||tpRaw!==undefined;
  const {deposit,withdrawal}=classifyKeywords(allText);
  if(!hasTradeEvidence||((deposit||withdrawal)&&!isSide(sideRaw)&&symbol==='UNKNOWN'))return null;
  // A missing PnL is not a break-even trade. Refuse the row so the importer cannot silently create fake $0 trades.
  if(parsedPnL===null)return null;
  const date=parseDateString(dateRaw)||parseDateString(firstValue(row,['close date','close time','exit time']))||new Date().toISOString().slice(0,10);
  const time=extractTime(firstValue(row,['open time','entry time','date time','datetime','time','timestamp']))||extractTime(dateRaw);
  const netPnL=parsedPnL,side=isSide(sideRaw)?normalizeSide(String(sideRaw)):/\b(sell|short|vente)\b/i.test(allText)?'SELL':'BUY';
  const killzoneRaw=firstValue(row,['killzone','session','trading session','zone']);
  const finalSession=killzoneRaw?getStandardSession({killzone:String(killzoneRaw),time}):(time?deduceSessionFromTime(time):undefined);
  const outcome:TradeOutcome=netPnL>0?'Win':netPnL<0?'Loss':'BE';
  return{id:`imp-${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,date,time,symbol,side,entry:parsePrice(entryRaw),exit:parsePrice(exitRaw),stopLoss:parsePrice(slRaw),takeProfit:parsePrice(tpRaw),lotSize:parsePrice(lotRaw),commission:parsePrice(commissionRaw),swap:parsePrice(swapRaw),netPnL,grossPnL:parseNumericPnL(firstValue(row,['gross pnl','gross p&l','gross profit']))??undefined,rMultiple:parseNumericPnL(rRaw)??undefined,outcome,killzone:finalSession,setup:String(firstValue(row,['setup','strategy','strategie','tag','tags'])??'').trim()||undefined,source:sourceType,createdAt:new Date().toISOString()};
}

export function processRawObjectsArray(rows:Record<string,any>[],sourceType:Trade['source']){
 const trades:Trade[]=[],deposits:AccountTransaction[]=[],withdrawals:AccountTransaction[]=[],ambiguousRows:AmbiguousImportRow[]=[];
 rows.forEach((row,i)=>{const allText=Object.values(row).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='').map(String).join(' ');if(!allText.trim())return;const {deposit,withdrawal}=classifyKeywords(allText);const symbol=extractSymbol(row,allText);const sideRaw=firstValue(row,['side','direction','trade type','type trade','sens','action','position','order type']);const pnlRaw=extractPnLValue(row);const pnl=parseNumericPnL(pnlRaw);const dateRaw=firstValue(row,['date','datetime','date time','open time','open date','entry time','entry date','close time','close date','timestamp','time']);const safeDate=parseDateString(dateRaw)||new Date().toISOString().slice(0,10);const time=extractTime(dateRaw);const amount=parseNumericPnL(firstValue(row,['amount','montant','cash flow','transaction amount','transaction value']));
   if(deposit&&!isSide(sideRaw)&&symbol==='UNKNOWN'){deposits.push({id:`dep-${Date.now()}-${i}`,date:safeDate,time,type:'DEPOSIT',amount:Math.abs(amount??pnl??0),description:allText,source:sourceType as any,createdAt:new Date().toISOString()});return;}
   if(withdrawal&&!isSide(sideRaw)&&symbol==='UNKNOWN'){withdrawals.push({id:`wth-${Date.now()}-${i}`,date:safeDate,time,type:'WITHDRAWAL',amount:Math.abs(amount??pnl??0),description:allText,source:sourceType as any,createdAt:new Date().toISOString()});return;}
   const trade=makeTrade(row,sourceType,i);if(trade){trades.push(trade);return;}
   if(pnl!==null){ambiguousRows.push({id:`amb-${Date.now()}-${i}`,rawText:allText,suggestedType:'AMBIGUOUS',confidenceReason:'Une valeur PnL existe mais la ligne ne contient pas assez de données pour confirmer un trade, ou son PnL ne correspond pas à un champ de trade reconnu.',date:safeDate,symbol:symbol!=='UNKNOWN'?symbol:undefined,amountOrPnL:pnl,tradeCandidate:{symbol:symbol!=='UNKNOWN'?symbol:undefined,side:isSide(sideRaw)?normalizeSide(String(sideRaw)):'BUY',netPnL:pnl}});}
 });
 return{trades,deposits,withdrawals,ambiguousRows};
}

function parseCSVRows(text:string):Record<string,any>[] {const normalized=text.replace(/^\uFEFF/,'');const result=Papa.parse<Record<string,any>>(normalized,{header:true,skipEmptyLines:'greedy',delimiter:'',transformHeader:h=>String(h??'').replace(/^\uFEFF/,'').trim(),transform:v=>typeof v==='string'?v.trim():v});if(result.errors.length)console.warn('CSV parser warnings:',result.errors.slice(0,5));const rows=(result.data||[]).filter(r=>Object.keys(r).some(k=>String(r[k]??'').trim()!==''));if(rows.length&&Object.keys(rows[0]).length>1)return rows;const raw=Papa.parse<string[]>(normalized,{header:false,skipEmptyLines:'greedy',delimiter:''});const matrix=raw.data||[];if(!matrix.length)return[];const header=matrix[0].map((v,i)=>String(v||`Column ${i+1}`).trim());const looksLikeHeader=header.some(h=>/symbol|pair|profit|pnl|date|time|side|direction|entry|exit/i.test(h));if(looksLikeHeader)return matrix.slice(1).map(values=>Object.fromEntries(header.map((h,i)=>[h,values[i]??''])));return matrix.map(values=>Object.fromEntries(values.map((v,i)=>[`Column ${i+1}`,v])));}

export async function parseDocumentFile(file:File,existingTrades:Trade[]=[]):Promise<PendingImportSummary>{
 const batchId=`batch-${Date.now()}`,fileName=file.name,fileExt=fileName.substring(fileName.lastIndexOf('.')).toLowerCase();let trades:Trade[]=[],deposits:AccountTransaction[]=[],withdrawals:AccountTransaction[]=[],ambiguousRows:AmbiguousImportRow[]=[],rawText='';
 if(fileExt==='.csv'||fileExt==='.txt'){rawText=await file.text();const trimmed=rawText.trim();if(trimmed.startsWith('{')||trimmed.startsWith('[')){try{const json=JSON.parse(trimmed);const rows=Array.isArray(json)?json:json.trades||json.transactions||[];const r=processRawObjectsArray(rows,'Imported JSON');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;}catch{}}
   if(!trades.length&&!deposits.length&&!withdrawals.length){const r=processRawObjectsArray(parseCSVRows(rawText),'Imported CSV');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;if(!trades.length&&!deposits.length&&!withdrawals.length){const t=parseTextJournalReportAdvanced(rawText,'Imported CSV');trades=t.trades;deposits=t.deposits;withdrawals=t.withdrawals;ambiguousRows=t.ambiguousRows;}}
 } else if(fileExt==='.xlsx'||fileExt==='.xls'){const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const sheet=wb.Sheets[wb.SheetNames[0]];const r=processRawObjectsArray(XLSX.utils.sheet_to_json<Record<string,any>>(sheet,{defval:''}),'Imported XLSX');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;
 } else if(fileExt==='.json'){rawText=await file.text();try{const json=JSON.parse(rawText);const rows=Array.isArray(json)?json:json.trades||json.transactions||[];const r=processRawObjectsArray(rows,'Imported JSON');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;}catch(e){console.error('Invalid JSON file:',e);}
 } else if(fileExt==='.pdf'){rawText=await extractTextFromPDF(file);if(rawText){const r=parseTextJournalReportAdvanced(rawText,'Imported PDF');trades=r.trades;deposits=r.deposits;withdrawals=r.withdrawals;ambiguousRows=r.ambiguousRows;}}
 else throw new Error('Format de fichier non supporté.');
 const warnings:TradeValidationWarning[]=[];let validDatesCount=0,validSymbolsCount=0,validPnLCount=0,missingEntryCount=0,missingStopLossCount=0,missingCommissionCount=0;
 trades.forEach((trade,index)=>{if(trade.date)validDatesCount++;else warnings.push({tradeIndex:index,field:'date',message:'Date manquante'});if(trade.symbol&&trade.symbol!=='UNKNOWN')validSymbolsCount++;else warnings.push({tradeIndex:index,field:'symbol',message:'Symbole manquant'});if(Number.isFinite(trade.netPnL))validPnLCount++;else warnings.push({tradeIndex:index,field:'netPnL',message:'PnL non détecté'});if(trade.entry===undefined)missingEntryCount++;if(trade.stopLoss===undefined)missingStopLossCount++;if(trade.commission===undefined)missingCommissionCount++;});
 const duplicates:DuplicateMatch[]=[];for(const incoming of trades){const match=existingTrades.find(existing=>existing.date===incoming.date&&existing.symbol===incoming.symbol&&existing.side===incoming.side&&Math.abs(existing.netPnL-incoming.netPnL)<0.01);if(match)duplicates.push({existingTrade:match,incomingTrade:incoming,reason:'Même date, symbole, direction et PnL'});}
 return{batchId,fileName,fileType:fileExt.toUpperCase().replace('.',''),rawText,totalDetected:trades.length+deposits.length+withdrawals.length+ambiguousRows.length,trades,deposits,withdrawals,ambiguousRows,tradesCount:trades.length,depositsCount:deposits.length,withdrawalsCount:withdrawals.length,duplicatesCount:duplicates.length,validDatesCount,validSymbolsCount,validPnLCount,missingEntryCount,missingStopLossCount,missingCommissionCount,warnings,duplicates};
}

export function parseTextJournalReportAdvanced(text:string,sourceType:Trade['source']='Imported PDF'){const rows=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);const trades:Trade[]=[],deposits:AccountTransaction[]=[],withdrawals:AccountTransaction[]=[],ambiguousRows:AmbiguousImportRow[]=[];rows.forEach((line,i)=>{const date=parseDateString(line)||new Date().toISOString().slice(0,10);const symbolMatch=line.match(/\b(?:XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|GBPJPY|EURJPY|NAS100|US100|US30|US500|GER40|BTCUSD|ETHUSD)\b/i);const sideMatch=line.match(/\b(BUY|SELL|LONG|SHORT|ACHAT|VENTE)\b/i);const numbers=line.match(/[+-]?(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d+)?/g)||[];const pnl=numbers.length?parseNumericPnL(numbers[numbers.length-1]):null;const lower=line.toLowerCase();if(DEPOSIT_KEYWORDS.some(k=>lower.includes(k))&&!sideMatch){deposits.push({id:`dep-txt-${Date.now()}-${i}`,date,type:'DEPOSIT',amount:Math.abs(pnl??0),description:line,source:sourceType as any,createdAt:new Date().toISOString()});return;}if(WITHDRAWAL_KEYWORDS.some(k=>lower.includes(k))&&!sideMatch){withdrawals.push({id:`wth-txt-${Date.now()}-${i}`,date,type:'WITHDRAWAL',amount:Math.abs(pnl??0),description:line,source:sourceType as any,createdAt:new Date().toISOString()});return;}if(symbolMatch&&sideMatch&&pnl!==null){const netPnL=pnl;trades.push({id:`trade-txt-${Date.now()}-${i}`,date,symbol:normalizeSymbol(symbolMatch[0]),side:normalizeSide(sideMatch[1]),netPnL,outcome:netPnL>0?'Win':netPnL<0?'Loss':'BE',source:sourceType as any,createdAt:new Date().toISOString()});}});return{trades,deposits,withdrawals,ambiguousRows};}
