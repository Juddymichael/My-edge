import { ITradeRowNormalizer, RawParsedRow } from './parser';
import { NewTradeInput, TradeDirection, TradeStatus } from '../../types/trade';
import { InvalidTradeError } from '../../types/errors';
import {
  normalizeSymbol,
  normalizeDirection,
  normalizeNumber,
  normalizeDate,
} from '../normalization';
import { safeDivide, safeRound } from '../calculations/precision';

/**
 * Known contract sizes for financial instruments.
 */
export function getStandardContractSize(symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.includes('XAU') || sym.includes('GOLD')) return 100;
  if (sym.includes('XAG') || sym.includes('SILVER')) return 5000;
  if (sym.includes('USOIL') || sym.includes('UKOIL') || sym.includes('BRENT') || sym.includes('CL')) return 1000;
  if (
    sym.includes('SPX') ||
    sym.includes('NAS') ||
    sym.includes('US30') ||
    sym.includes('GER') ||
    sym.includes('DAX') ||
    sym.includes('BTC') ||
    sym.includes('ETH')
  ) {
    return 1;
  }
  // Standard Forex pair
  return 100000;
}

/**
 * Universal Intelligent Row Normalizer.
 * Extracts fields from varied broker headers (MT4, MT5, cTrader, TradingView, IBKR),
 * handles multi-language aliases (French, English, German, Spanish),
 * and accurately computes missing financial metrics (Net PnL, RR, Initial Risk Amount, Planned RR).
 */
export class UniversalTradeNormalizer implements ITradeRowNormalizer {
  normalizeRow(rawRow: RawParsedRow, context?: Record<string, unknown>): NewTradeInput {
    const data = rawRow.data || {};
    const keys = Object.keys(data);

    // Normalize string for alias matching (strip accents, punctuation, spaces)
    const cleanStr = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    // Helper to find value by field aliases with exact & fuzzy scoring
    const getVal = (aliases: string[]): unknown => {
      // 1. Direct normalized key match
      for (const k of keys) {
        const cleanK = cleanStr(k);
        for (const alias of aliases) {
          const cleanAlias = cleanStr(alias);
          if (cleanK === cleanAlias) {
            return data[k];
          }
        }
      }
      // 2. Substring match (check if cleaned key includes cleaned alias)
      for (const k of keys) {
        const cleanK = cleanStr(k);
        for (const alias of aliases) {
          const cleanAlias = cleanStr(alias);
          if (cleanAlias.length >= 3 && cleanK.includes(cleanAlias)) {
            return data[k];
          }
        }
      }
      return undefined;
    };

    // --- 0. CHECK FOR NON-TRADES (DEPOSITS, WITHDRAWALS, BALANCE, SUMMARY) ---
    const rawTypeOrOp = getVal(['type', 'operation', 'action', 'cmd', 'deal_type', 'order_type', 'sens']);
    const typeStr = String(rawTypeOrOp || '').trim().toLowerCase();

    const rawStatus = getVal([
      'pris',
      'prise',
      'est_pris',
      'trade_pris',
      'taken',
      'took_trade',
      'is_taken',
      'executed',
      'execute',
      'exécute',
      'exécuté',
      'statut',
      'status',
      'state',
      'etat',
      'order_status',
      'order_state',
      'deal_state',
      'deal_status',
    ]);
    const statusStr = String(rawStatus || '').trim().toLowerCase();

    // Check if the trade was NOT taken, cancelled, missed, or rejected
    const isUntakenOrCancelled = (val: string) =>
      /^(non|no|false|faux|0|non pris|non-pris|non prise|non-prise|pas pris|manqué|manque|missed|annulé|annule|annulée|cancelled|canceled|deleted|supprimé|supprime|expired|expiré|expire|rejected|rejeté|rejete|pending|en attente|watchlist|planifié|planifie|simulé|simule|not taken|not_taken|skip|ignoré|ignore)$/i.test(
        val
      );

    if (isUntakenOrCancelled(statusStr)) {
      throw new InvalidTradeError(`Ligne de trade non prise ou annulée (statut: ${statusStr})`);
    }

    // Check if row is a cash deposit/withdrawal/summary line
    const isNonTradeCashOrSummary = (str: string) =>
      /^(balance|solde|deposit|dépôt|depot|withdrawal|retrait|credit|crédit|interest|intérêt|interet|dividend|dividende|tax|taxe|fee|frais|rebate|bonus|transfer|transfert|adjustment|ajustement|correction|zeroing|summary|total|résumé|resume|closed p\/l|open p\/l)/i.test(
        str
      );

    if (isNonTradeCashOrSummary(typeStr)) {
      throw new InvalidTradeError(`Ligne de transaction non-trade (dépôt, retrait, balance ou résumé: ${typeStr})`);
    }

    // --- 1. SYMBOL ---
    const rawSymbol = getVal([
      'symbole',
      'symbol',
      'pair',
      'instrument',
      'asset',
      'ticker',
      'paire',
      'item',
      'actif',
      'contrat',
      'currency_pair',
      'market',
    ]);

    const symbolCandidate = rawSymbol ? String(rawSymbol).trim() : '';
    if (isNonTradeCashOrSummary(symbolCandidate.toLowerCase())) {
      throw new InvalidTradeError(`Ligne de balance/résumé détectée: ${symbolCandidate}`);
    }

    let symbol = normalizeSymbol(symbolCandidate || null);
    if (symbol === 'UNKNOWN') {
      // Try to find a valid symbol in the rawString
      const tickerMatch = (rawRow.rawString || '').match(
        /\b(EURUSD|GBPUSD|USDJPY|USDCHF|AUDUSD|USDCAD|NZDUSD|EURGBP|EURJPY|GBPJPY|AUDJPY|XAUUSD|XAGUSD|GOLD|SILVER|USOIL|UKOIL|BRENT|SPX500|SP500|US500|NAS100|US100|NDX|US30|DJIA|DOW|GER40|GER30|DAX|BTCUSD|ETHUSD)\b/i
      );
      if (tickerMatch) {
        symbol = normalizeSymbol(tickerMatch[1]);
      } else {
        throw new InvalidTradeError('Ligne sans symbole financier valide');
      }
    }

    // --- 2. DIRECTION ---
    const rawDirection = getVal([
      'sensdouverture',
      'sens_ouverture',
      'sens_d_ouverture',
      'sens',
      'direction',
      'type',
      'side',
      'action',
      'ordre',
      'buy/sell',
      'b/s',
      'cmd',
      'position',
      'operation',
    ]);
    let direction: TradeDirection = 'BUY';
    try {
      if (rawDirection !== undefined && rawDirection !== null && String(rawDirection).trim() !== '') {
        direction = normalizeDirection(rawDirection);
      } else if (rawRow.rawString) {
        if (/sell|vendre|vente|short/i.test(rawRow.rawString)) direction = 'SELL';
      }
    } catch {
      direction = 'BUY';
    }

    // --- 3. DATES ---
    const rawOpenDate = getVal([
      'heuredouverture',
      'heure_ouverture',
      'heure_d_ouverture',
      'date_ouverture',
      'dateouverture',
      'openedat',
      'opentime',
      'open_time',
      'date_entree',
      'open_date',
      'time_open',
      'timestamp',
      'date',
      'entry_time',
      'created_at',
      'heure_entree',
    ]);

    const rawCloseDate = getVal([
      'heuredecloture',
      'heure_cloture',
      'heure_de_cloture',
      'date_cloture',
      'datecloture',
      'closedat',
      'closetime',
      'close_time',
      'date_sortie',
      'close_date',
      'time_close',
      'date_fermeture',
      'exit_time',
      'heure_sortie',
      'cloture',
    ]);

    let closedAt: string | null = null;
    if (rawCloseDate) {
      try {
        closedAt = normalizeDate(rawCloseDate);
      } catch {
        closedAt = null;
      }
    }

    let openedAt: string;
    if (rawOpenDate) {
      try {
        openedAt = normalizeDate(rawOpenDate);
      } catch {
        openedAt = closedAt || new Date().toISOString();
      }
    } else if (closedAt) {
      // If statement only has close time (e.g. cTrader history), default openedAt to closedAt
      openedAt = closedAt;
    } else {
      openedAt = new Date().toISOString();
    }

    // --- 4. TICKET / ID ---
    const rawTicket = getVal([
      'ticket',
      'id',
      'order',
      'order_id',
      'trade_id',
      'numero',
      'ref',
      'reference',
      'deal',
      'position_id',
      'transaction_id',
    ]);
    const ticket = rawTicket ? String(rawTicket).trim() : null;

    // --- 5. NUMERIC FIELDS ---
    const entryPrice = normalizeNumber(
      getVal([
        'coursdentree',
        'cours_entree',
        'cours_d_entree',
        'prixdentree',
        'prix_entree',
        'prix_d_entree',
        'entryprice',
        'entry_price',
        'openprice',
        'open_price',
        'in_price',
        'price_in',
        'entree',
        'open_rate',
        'open',
      ])
    );

    const exitPrice = normalizeNumber(
      getVal([
        'pricedecloture',
        'price_de_cloture',
        'prixdecloture',
        'prix_cloture',
        'prix_de_cloture',
        'coursdecloture',
        'cours_cloture',
        'cours_de_cloture',
        'exitprice',
        'exit_price',
        'closeprice',
        'close_price',
        'prix_sortie',
        'prix_de_sortie',
        'out_price',
        'price_out',
        'sortie',
        'close_rate',
        'cours_sortie',
        'cloture',
      ])
    );

    const stopLoss = normalizeNumber(
      getVal(['stoploss', 'stop_loss', 'sl', 's/l', 'stop', 'invalidation', 'arret'])
    );

    const takeProfit = normalizeNumber(
      getVal(['takeprofit', 'take_profit', 'tp', 't/p', 'target', 'objectif', 'cible'])
    );

    const quantity = normalizeNumber(
      getVal([
        'quantitedecloture',
        'quantite_de_cloture',
        'quantitedouverture',
        'quantite_ouverture',
        'quantite',
        'quantity',
        'lots',
        'lot',
        'lotsize',
        'size',
        'volume',
        'contracts',
        'shares',
        'units',
        'qte',
        'taille',
      ])
    ) || 1.0;

    const commission = normalizeNumber(
      getVal(['commission', 'comm', 'fees', 'fee', 'frais', 'courtage'])
    );

    const swap = normalizeNumber(
      getVal(['swap', 'swaps', 'rollover', 'overnight', 'financement', 'interet'])
    );

    let grossPnL = normalizeNumber(
      getVal(['grosspnl', 'gross_pnl', 'gross_profit', 'brut', 'gain_brut', 'profit_brut', 'gross'])
    );

    let netPnL = normalizeNumber(
      getVal([
        'neteur',
        'netusd',
        'netgbp',
        'netjpy',
        'net_eur',
        'net_usd',
        'netpnl',
        'net_pnl',
        'net',
        'profit',
        'pnl',
        'gain',
        'loss',
        'net_profit',
        'benefice',
        'resultat',
        'p_l',
        'p/l',
        'gains',
        'perte',
        'net_gain',
        'pprealises',
        'pp_realises',
        'p&p_realises',
        'profit_net',
        'resultat_net',
      ])
    );

    const balanceAfter = normalizeNumber(
      getVal([
        'soldeeur',
        'soldeusd',
        'soldegbp',
        'soldejpy',
        'solde_eur',
        'solde_usd',
        'solde',
        'balance',
        'balance_after',
        'solde_apres',
        'account_balance',
        'equity',
        'solde_final',
      ])
    );

    let initialRiskAmount = normalizeNumber(
      getVal([
        'initialriskamount',
        'risk',
        'risk_amount',
        'risk_eur',
        'risk_usd',
        'montant_risque',
        'risque',
        'risk_val',
      ])
    );

    const contractSize = getStandardContractSize(symbol);

    // --- 6. AUTO FINANCIAL & RR CALCULATIONS ---
    // If entry & exit prices exist, calculate price delta
    let priceDiff: number | null = null;
    if (entryPrice !== null && exitPrice !== null) {
      priceDiff = direction === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
    }

    // Stop loss price risk distance
    let priceRiskDist: number | null = null;
    if (entryPrice !== null && stopLoss !== null) {
      if (direction === 'BUY' && entryPrice > stopLoss) {
        priceRiskDist = entryPrice - stopLoss;
      } else if (direction === 'SELL' && stopLoss > entryPrice) {
        priceRiskDist = stopLoss - entryPrice;
      } else {
        priceRiskDist = Math.abs(entryPrice - stopLoss);
      }
    }

    // Auto-compute Initial Risk Amount if missing and SL exists
    if (initialRiskAmount === null && priceRiskDist !== null && priceRiskDist > 0) {
      const calculatedRisk = priceRiskDist * quantity * contractSize;
      if (calculatedRisk > 0 && isFinite(calculatedRisk)) {
        initialRiskAmount = safeRound(calculatedRisk, 2);
      }
    }

    // Auto-compute Gross / Net PnL if missing but prices exist
    if (netPnL === null && priceDiff !== null) {
      const calculatedGross = priceDiff * quantity * contractSize;
      grossPnL = safeRound(calculatedGross, 2);
      const totalFees = (commission || 0) + (swap || 0);
      netPnL = safeRound(grossPnL + totalFees, 2);
    } else if (grossPnL === null && netPnL !== null) {
      const totalFees = (commission || 0) + (swap || 0);
      grossPnL = safeRound(netPnL - totalFees, 2);
    }

    // Auto-compute Realized R-Multiple (RR)
    let rMultiple: number | null = null;

    // Method A: From Price Movement (highest precision)
    if (priceDiff !== null && priceRiskDist !== null && priceRiskDist > 0) {
      rMultiple = safeDivide(priceDiff, priceRiskDist);
    }
    // Method B: From Net PnL and Initial Risk Amount
    else if (netPnL !== null && initialRiskAmount !== null && initialRiskAmount > 0) {
      rMultiple = safeDivide(netPnL, initialRiskAmount);
    }

    // Auto-compute Planned RR if TP & SL exist
    let plannedRR: number | null = null;
    if (entryPrice !== null && takeProfit !== null && priceRiskDist !== null && priceRiskDist > 0) {
      const tpDist = Math.abs(takeProfit - entryPrice);
      plannedRR = safeDivide(tpDist, priceRiskDist);
    }

    // --- 7. CONTEXT & METADATA ---
    const rawSetup = getVal(['setup', 'strategy', 'pattern', 'modele', 'strategie', 'systeme']);
    const setup = rawSetup ? String(rawSetup).trim() : null;

    const rawNotes = getVal(['notes', 'commentaire', 'comment', 'remarque', 'description']);
    const notes = rawNotes ? String(rawNotes).trim() : null;

    const tags: string[] = [];
    if (symbol) tags.push(symbol);
    if (setup) tags.push(setup);
    const rawTags = getVal(['tags', 'tag', 'labels']);
    if (rawTags) {
      if (Array.isArray(rawTags)) {
        tags.push(...rawTags.map(String));
      } else if (typeof rawTags === 'string') {
        tags.push(...rawTags.split(',').map((t) => t.trim()).filter(Boolean));
      }
    }

    // Check that we have at least some basic financial execution data
    if (entryPrice === null && exitPrice === null && netPnL === null && grossPnL === null) {
      throw new InvalidTradeError('Ligne sans cours d\'entrée, de sortie ni de P&L');
    }

    return {
      ticket,
      symbol,
      direction,
      status: closedAt || exitPrice !== null ? 'CLOSED' : 'OPEN',
      openedAt,
      closedAt,
      timezone: 'UTC',
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      quantity,
      lotSize: quantity,
      contractSize,
      grossPnL,
      commission: commission || 0,
      swap: swap || 0,
      netPnL: netPnL !== null ? netPnL : 0,
      initialRiskAmount,
      riskPercent: null,
      rMultiple,
      balanceBefore: null,
      balanceAfter,
      session: null,
      timeframe: null,
      setup,
      setupId: null,
      htfBias: null,
      liquidityTaken: null,
      irlErl: null,
      mss: null,
      cisd: null,
      displacement: null,
      fvg: null,
      ifvg: null,
      ob: null,
      killzone: null,
      entryModel: plannedRR ? `Planned RR: 1:${plannedRR.toFixed(2)}` : null,
      slModel: null,
      tpModel: null,
      notes,
      emotion: null,
      mistake: null,
      tags: Array.from(new Set(tags)),
      screenshotBefore: null,
      screenshotAfter: null,
    };
  }
}

