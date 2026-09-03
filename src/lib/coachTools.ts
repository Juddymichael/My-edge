import { db } from './database/db';
import { Trade } from '../types/trade';

export type CoachToolName = 'getTradesByPeriod' | 'getTradesByPair' | 'getTradesBySetup' | 'getStatsForFilter' | 'compareTwoPeriods' | 'getBestTrades' | 'getWorstTrades';

export interface CoachToolCall {
  name: CoachToolName;
  args: Record<string, unknown>;
}

const toNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizePair = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

function matchesDateRange(trade: Trade, dateDebut?: string, dateFin?: string) {
  const opened = new Date(trade.openedAt).getTime();
  if (!Number.isFinite(opened)) return false;
  const from = dateDebut ? new Date(`${dateDebut}T00:00:00`).getTime() : -Infinity;
  const to = dateFin ? new Date(`${dateFin}T23:59:59.999`).getTime() : Infinity;
  return opened >= from && opened <= to;
}

function applyFilters(trades: Trade[], filters: Record<string, unknown> = {}) {
  const pair = typeof filters.paire === 'string' ? normalizePair(filters.paire) : '';
  const session = typeof filters.session === 'string' ? filters.session.trim().toUpperCase() : '';
  const setup = typeof filters.setup === 'string' ? filters.setup.trim().toLowerCase() : '';
  const dateDebut = typeof filters.dateDebut === 'string' ? filters.dateDebut : undefined;
  const dateFin = typeof filters.dateFin === 'string' ? filters.dateFin : undefined;

  return trades.filter((trade) => {
    if (pair && normalizePair(trade.symbol) !== pair) return false;
    if (session && (trade.session ?? '').toUpperCase() !== session) return false;
    if (setup && (trade.setup ?? '').trim().toLowerCase() !== setup) return false;
    if ((dateDebut || dateFin) && !matchesDateRange(trade, dateDebut, dateFin)) return false;
    return true;
  });
}

function serializeTrade(trade: Trade) {
  return {
    id: trade.id,
    ticket: trade.ticket,
    pair: trade.symbol,
    direction: trade.direction,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    lotSize: trade.lotSize,
    netPnL: trade.netPnL,
    rMultiple: trade.rMultiple,
    session: trade.session,
    setup: trade.setup,
    timeframe: trade.timeframe,
    killzone: trade.killzone,
    emotion: trade.emotion,
    mistake: trade.mistake,
    notes: trade.notes,
  };
}

function calculateStats(trades: Trade[]) {
  const results = trades.map((trade) => toNumber(trade.netPnL)).filter((value): value is number => value !== null);
  const wins = results.filter((value) => value > 0);
  const losses = results.filter((value) => value < 0);
  const pnl = results.reduce((sum, value) => sum + value, 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));

  return {
    tradeCount: trades.length,
    tradesWithResult: results.length,
    wins: wins.length,
    losses: losses.length,
    winrate: results.length ? (wins.length / results.length) * 100 : 0,
    pnl,
    expectancy: results.length ? pnl / results.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    grossProfit,
    grossLoss,
  };
}

export async function executeCoachTool(name: CoachToolName, args: Record<string, unknown>): Promise<unknown> {
  const trades = await db.trades.toArray();

  switch (name) {
    case 'getTradesByPair': {
      const paire = typeof args.paire === 'string' ? args.paire : '';
      return applyFilters(trades, { paire }).map(serializeTrade);
    }
    case 'getTradesBySetup': {
      const setup = typeof args.setup === 'string' ? args.setup : '';
      return applyFilters(trades, { setup }).map(serializeTrade);
    }
    case 'getTradesByPeriod': {
      const dateDebut = typeof args.dateDebut === 'string' ? args.dateDebut : undefined;
      const dateFin = typeof args.dateFin === 'string' ? args.dateFin : undefined;
      return applyFilters(trades, { dateDebut, dateFin }).map(serializeTrade);
    }
    case 'getStatsForFilter': {
      const filters = args.filtres && typeof args.filtres === 'object' ? args.filtres as Record<string, unknown> : {};
      return { filters, stats: calculateStats(applyFilters(trades, filters)) };
    }
    case 'compareTwoPeriods': {
      const period1 = applyFilters(trades, { dateDebut: args.dateDebut1, dateFin: args.dateFin1 });
      const period2 = applyFilters(trades, { dateDebut: args.dateDebut2, dateFin: args.dateFin2 });
      return {
        period1: { dateDebut: args.dateDebut1, dateFin: args.dateFin1, stats: calculateStats(period1) },
        period2: { dateDebut: args.dateDebut2, dateFin: args.dateFin2, stats: calculateStats(period2) },
      };
    }
    case 'getBestTrades': {
      const nombre = Math.min(Math.max(Math.floor(toNumber(args.nombre) ?? 5), 1), 50);
      return trades.filter((trade) => toNumber(trade.netPnL) !== null).sort((a, b) => (toNumber(b.netPnL) ?? -Infinity) - (toNumber(a.netPnL) ?? -Infinity)).slice(0, nombre).map(serializeTrade);
    }
    case 'getWorstTrades': {
      const nombre = Math.min(Math.max(Math.floor(toNumber(args.nombre) ?? 5), 1), 50);
      return trades.filter((trade) => toNumber(trade.netPnL) !== null).sort((a, b) => (toNumber(a.netPnL) ?? Infinity) - (toNumber(b.netPnL) ?? Infinity)).slice(0, nombre).map(serializeTrade);
    }
    default:
      throw new Error(`Fonction coach inconnue: ${String(name)}`);
  }
}
