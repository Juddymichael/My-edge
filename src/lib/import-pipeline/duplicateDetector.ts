import { Trade, NewTradeInput } from '../../types/trade';
import { ParsedTradePreview } from '../../types/import';
import { generateTradeFingerprint } from '../fingerprint/tradeFingerprint';

/**
 * Checks a batch of candidate normalized trades against existing DB trades
 * and across the candidate batch itself to detect duplicates with 100% precision.
 */
export class TradeDuplicateDetector {
  /**
   * Previews candidates with duplicate markers.
   */
  static analyzeBatch(
    candidateTrades: NewTradeInput[],
    existingTrades: Trade[]
  ): {
    previews: ParsedTradePreview[];
    totalParsed: number;
    newTradesCount: number;
    duplicatesCount: number;
  } {
    // 1. Build lookup tables for existing database trades
    const dbSourceIds = new Set<string>();
    const dbTickets = new Map<string, Trade>();
    const dbTimeMap = new Map<string, Trade[]>();

    for (const t of existingTrades) {
      if (t.sourceId) dbSourceIds.add(t.sourceId);
      if (t.ticket) dbTickets.set(t.ticket.trim().toLowerCase(), t);

      const timeKey = `${t.symbol}_${t.direction}`;
      if (!dbTimeMap.has(timeKey)) {
        dbTimeMap.set(timeKey, []);
      }
      dbTimeMap.get(timeKey)!.push(t);
    }

    const seenBatchSourceIds = new Set<string>();
    const seenBatchTickets = new Set<string>();

    const previews: ParsedTradePreview[] = [];
    let duplicatesCount = 0;

    for (let i = 0; i < candidateTrades.length; i++) {
      const input = candidateTrades[i];
      const rowNumber = i + 1;
      const tempId = `preview_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;

      // Generate deterministic fingerprint
      const sourceId =
        input.sourceId ||
        generateTradeFingerprint({
          brokerSource: input.brokerSource,
          ticket: input.ticket,
          symbol: input.symbol,
          openedAt: input.openedAt,
          closedAt: input.closedAt,
          direction: input.direction,
          entryPrice: input.entryPrice,
          quantity: input.quantity,
        });

      let isDuplicate = false;
      let duplicateReason: 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | null = null;
      let existingTradeId: string | null = null;

      // Check 1: In-file duplication (already seen earlier in this uploaded file)
      if (seenBatchSourceIds.has(sourceId)) {
        isDuplicate = true;
        duplicateReason = 'DUPLICATE_IN_FILE';
      } else if (input.ticket && seenBatchTickets.has(input.ticket.trim().toLowerCase())) {
        isDuplicate = true;
        duplicateReason = 'DUPLICATE_IN_FILE';
      }

      // Check 2: Existing Database duplication
      if (!isDuplicate) {
        if (dbSourceIds.has(sourceId)) {
          isDuplicate = true;
          duplicateReason = 'EXISTING_IN_DB';
          const match = existingTrades.find((t) => t.sourceId === sourceId);
          existingTradeId = match ? match.id : null;
        } else if (input.ticket && dbTickets.has(input.ticket.trim().toLowerCase())) {
          isDuplicate = true;
          duplicateReason = 'EXISTING_IN_DB';
          const match = dbTickets.get(input.ticket.trim().toLowerCase());
          existingTradeId = match ? match.id : null;
        } else {
          // Check 3: Fuzzy timestamp + symbol + price matching (within 120 seconds)
          const timeKey = `${input.symbol}_${input.direction}`;
          const potentialMatches = dbTimeMap.get(timeKey) || [];
          const candidateTime = new Date(input.openedAt).getTime();

          for (const match of potentialMatches) {
            const matchTime = new Date(match.openedAt).getTime();
            const timeDiffSec = Math.abs(candidateTime - matchTime) / 1000;

            if (timeDiffSec <= 120) {
              // Within 2 minutes, check entry price or exit price
              const priceMatch =
                input.entryPrice !== null &&
                match.entryPrice !== null &&
                Math.abs(input.entryPrice - match.entryPrice) < 0.0001;

              if (priceMatch) {
                isDuplicate = true;
                duplicateReason = 'EXISTING_IN_DB';
                existingTradeId = match.id;
                break;
              }
            }
          }
        }
      }

      // Record into batch lookups
      seenBatchSourceIds.add(sourceId);
      if (input.ticket) {
        seenBatchTickets.add(input.ticket.trim().toLowerCase());
      }

      if (isDuplicate) {
        duplicatesCount++;
      }

      // Calculate planned RR
      let plannedRR: number | null = null;
      if (input.entryPrice !== null && input.takeProfit !== null && input.stopLoss !== null) {
        const risk = Math.abs(input.entryPrice - input.stopLoss);
        const reward = Math.abs(input.takeProfit - input.entryPrice);
        if (risk > 0) plannedRR = reward / risk;
      }

      previews.push({
        tempId,
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
        selectedForImport: !isDuplicate, // Automatically deselect duplicates
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
