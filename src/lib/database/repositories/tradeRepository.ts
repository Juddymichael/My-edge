import { db } from '../db';
import { Trade, NewTradeInput } from '../../../types/trade';
import { TradeSchema } from '../../validation/tradeSchema';
import { evaluateDataQuality } from '../../validation/quality';
import { generateTradeFingerprint } from '../../fingerprint/tradeFingerprint';
import {
  InvalidTradeError,
  DuplicateTradeError,
  DatabaseError,
} from '../../../types/errors';
import { calculateNetPnL } from '../../calculations/pnl';
import { calculateRMultiple } from '../../calculations/rMultiple';
import { calculateRiskPercent } from '../../calculations/risk';

export class TradeRepository {
  /**
   * Finds a trade by its ID.
   */
  static async getById(id: string): Promise<Trade | null> {
    try {
      const trade = await db.trades.get(id);
      return trade || null;
    } catch (error) {
      throw new DatabaseError(`Failed to fetch trade with id: ${id}`, error);
    }
  }

  /**
   * Finds a trade by its deterministic fingerprint (sourceId).
   */
  static async getBySourceId(sourceId: string): Promise<Trade | null> {
    try {
      const trade = await db.trades.where('sourceId').equals(sourceId).first();
      return trade || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find trade by sourceId: ${sourceId}`, error);
    }
  }

  /**
   * Returns all trades ordered by openedAt desc.
   */
  static async getAll(): Promise<Trade[]> {
    try {
      return await db.trades.orderBy('openedAt').reverse().toArray();
    } catch (error) {
      throw new DatabaseError('Failed to fetch trades', error);
    }
  }

  /**
   * Counts total trades.
   */
  static async count(): Promise<number> {
    try {
      return await db.trades.count();
    } catch (error) {
      throw new DatabaseError('Failed to count trades', error);
    }
  }

  /**
   * Inserts or replaces a validated trade.
   * Enforces duplicate checking, data quality evaluation, and Zod validation.
   */
  static async create(input: NewTradeInput, allowDuplicate = false): Promise<Trade> {
    const id = input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    const now = new Date().toISOString();

    // Compute deterministic fingerprint
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

    if (!allowDuplicate) {
      const existing = await this.getBySourceId(sourceId);
      if (existing) {
        throw new DuplicateTradeError(
          `Trade duplicate detected (sourceId: ${sourceId}, symbol: ${input.symbol}, openedAt: ${input.openedAt})`,
          { sourceId, existingId: existing.id }
        );
      }
    }

    // Auto-calculate netPnL, rMultiple, riskPercent if not explicitly provided
    const netPnL = input.netPnL !== null && input.netPnL !== undefined
      ? input.netPnL
      : calculateNetPnL({
          grossPnL: input.grossPnL ?? null,
          commission: input.commission ?? null,
          swap: input.swap ?? null,
        });

    const rMultiple = input.rMultiple !== null && input.rMultiple !== undefined
      ? input.rMultiple
      : calculateRMultiple(netPnL, input.initialRiskAmount ?? null);

    const riskPercent = input.riskPercent !== null && input.riskPercent !== undefined
      ? input.riskPercent
      : calculateRiskPercent(input.initialRiskAmount ?? null, input.balanceBefore ?? null);

    // Evaluate Data Quality
    const candidateTrade: Trade = {
      id,
      sourceId,
      ticket: input.ticket ?? null,
      brokerSource: input.brokerSource ?? null,
      openedAt: input.openedAt,
      closedAt: input.closedAt ?? null,
      timezone: input.timezone || 'UTC',
      symbol: input.symbol,
      direction: input.direction,
      entryPrice: input.entryPrice ?? null,
      exitPrice: input.exitPrice ?? null,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
      quantity: input.quantity ?? null,
      lotSize: input.lotSize ?? null,
      contractSize: input.contractSize ?? null,
      grossPnL: input.grossPnL ?? null,
      commission: input.commission ?? null,
      swap: input.swap ?? null,
      netPnL,
      initialRiskAmount: input.initialRiskAmount ?? null,
      riskPercent,
      rMultiple,
      balanceBefore: input.balanceBefore ?? null,
      balanceAfter: input.balanceAfter ?? null,
      session: input.session ?? null,
      timeframe: input.timeframe ?? null,
      setup: input.setup ?? null,
      setupId: input.setupId ?? null,
      htfBias: input.htfBias ?? null,
      liquidityTaken: input.liquidityTaken ?? null,
      irlErl: input.irlErl ?? null,
      mss: input.mss ?? null,
      cisd: input.cisd ?? null,
      displacement: input.displacement ?? null,
      fvg: input.fvg ?? null,
      ifvg: input.ifvg ?? null,
      ob: input.ob ?? null,
      killzone: input.killzone ?? null,
      entryModel: input.entryModel ?? null,
      confirmation: input.confirmation ?? null,
      slModel: input.slModel ?? null,
      tpModel: input.tpModel ?? null,
      notes: input.notes ?? null,
      emotion: input.emotion ?? null,
      mistake: input.mistake ?? null,
      tags: input.tags || [],
      screenshotBefore: input.screenshotBefore ?? null,
      screenshotAfter: input.screenshotAfter ?? null,
      status: input.status || 'CLOSED',
      dataQuality: 'PARTIAL', // temporary, will be assigned below
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    };

    const qualityAssessment = evaluateDataQuality(candidateTrade);
    candidateTrade.dataQuality = qualityAssessment.quality;

    // Validate with Zod
    const validation = TradeSchema.safeParse(candidateTrade);
    if (!validation.success) {
      throw new InvalidTradeError(
        `Trade validation failed: ${validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
        validation.error.format()
      );
    }

    try {
      await db.trades.put(validation.data as Trade);
      return validation.data as Trade;
    } catch (error) {
      throw new DatabaseError(`Failed to save trade ${id} to database`, error);
    }
  }

  /**
   * Bulk insert with duplicate skipping / error classification.
   */
  static async bulkInsert(
    trades: NewTradeInput[],
    skipDuplicates = true
  ): Promise<{ inserted: number; duplicates: number; errors: { index: number; error: string }[] }> {
    let inserted = 0;
    let duplicates = 0;
    const errors: { index: number; error: string }[] = [];

    await db.transaction('rw', db.trades, async () => {
      for (let i = 0; i < trades.length; i++) {
        try {
          await this.create(trades[i], !skipDuplicates);
          inserted++;
        } catch (err) {
          if (err instanceof DuplicateTradeError) {
            duplicates++;
          } else {
            errors.push({
              index: i,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    });

    return { inserted, duplicates, errors };
  }

  /**
   * Deletes a trade by ID.
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const exists = await db.trades.get(id);
      if (!exists) return false;
      await db.trades.delete(id);
      return true;
    } catch (error) {
      throw new DatabaseError(`Failed to delete trade ${id}`, error);
    }
  }

  /**
   * Clears all trades.
   */
  static async clearAll(): Promise<void> {
    try {
      await db.trades.clear();
    } catch (error) {
      throw new DatabaseError('Failed to clear trades table', error);
    }
  }
}
