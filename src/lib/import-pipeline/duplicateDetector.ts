import { Trade, NewTradeInput } from '../../types/trade';
import { ParsedTradePreview } from '../../types/import';
import { generateTradeFingerprint } from '../fingerprint/tradeFingerprint';

function secondKey(value: string | null | undefined): string {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value.slice(0, 19);
  return new Date(Math.floor(time / 1000) * 1000).toISOString();
}

function exactTradeKey(trade: Pick<NewTradeInput, 'symbol' | 'closedAt' | 'openedAt' | 'netPnL'>): string {
  const date = secondKey(trade.closedAt || trade.openedAt);
  const pnl = trade.netPnL === null || trade.netPnL === undefined ? 'NULL' : Number(trade.netPnL).toFixed(8);
  return `${String(trade.symbol).toUpperCase()}|${date}|${pnl}`;
}

type ExistingTrade = Pick<Trade, 'id' | 'symbol' | 'closedAt' | 'openedAt' | 'netPnL'> | NewTradeInput;

export class TradeDuplicateDetector {
  static analyzeBatch(candidateTrades: NewTradeInput[], existingTrades: ExistingTrade[]) {
    const existingKeys = new Map<string, ExistingTrade>();
    const seenKeys = new Set<string>();
    const previews: ParsedTradePreview[] = [];
    let duplicatesCount = 0;

    for (const trade of existingTrades) {
      existingKeys.set(exactTradeKey(trade), trade);
    }

    for (let i = 0; i < candidateTrades.length; i++) {
      const input = candidateTrades[i];
      const rowNumber = i + 1;
      const sourceId = input.sourceId || generateTradeFingerprint({
        brokerSource: input.brokerSource,
        ticket: input.ticket,
        symbol: input.symbol,
        openedAt: input.openedAt,
        closedAt: input.closedAt,
        direction: input.direction,
        entryPrice: input.entryPrice,
        quantity: input.quantity,
      });
      const key = exactTradeKey(input);

      let isDuplicate = false;
      let duplicateReason: 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | null = null;
      let existingTradeId: string | null = null;

      if (seenKeys.has(key)) {
        isDuplicate = true;
        duplicateReason = 'DUPLICATE_IN_FILE';
      } else if (existingKeys.has(key)) {
        isDuplicate = true;
        duplicateReason = 'EXISTING_IN_DB';
        const existing = existingKeys.get(key);
        existingTradeId = existing && 'id' in existing ? existing.id : null;
      }

      seenKeys.add(key);
      if (isDuplicate) duplicatesCount++;

      let plannedRR: number | null = null;
      if (input.entryPrice !== null && input.takeProfit !== null && input.stopLoss !== null) {
        const risk = Math.abs(input.entryPrice - input.stopLoss);
        const reward = Math.abs(input.takeProfit - input.entryPrice);
        if (risk > 0) plannedRR = reward / risk;
      }

      previews.push({
        tempId: `preview_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        rowNumber,
        ticket: input.ticket ?? null,
        symbol: input.symbol,
        direction: input.direction,
        openedAt: input.openedAt,
        closedAt: input.closedAt ?? null,
        entryPrice: input.entryPrice ?? null,
        exitPrice: input.exitPrice ?? null,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
        quantity: input.quantity ?? null,
        netPnL: input.netPnL ?? null,
        grossPnL: input.grossPnL ?? null,
        commission: input.commission ?? null,
        swap: input.swap ?? null,
        initialRiskAmount: input.initialRiskAmount ?? null,
        rMultiple: input.rMultiple ?? null,
        plannedRR,
        setup: input.setup ?? null,
        notes: input.notes ?? null,
        sourceId,
        isDuplicate,
        duplicateReason,
        existingTradeId,
        selectedForImport: !isDuplicate,
      });
    }

    return {
      previews,
      totalParsed: candidateTrades.length,
      newTradesCount: candidateTrades.length - duplicatesCount,
      duplicatesCount,
    };
  }
}
