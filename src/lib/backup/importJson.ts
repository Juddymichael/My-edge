import { ThunderEdgeBackupData } from './exportJson';
import { InvalidImportError } from '../../types/errors';
import { TradeSchema } from '../validation/tradeSchema';
import { Trade } from '../../types/trade';

/**
 * Deserializes and validates a Thunder Edge JSON backup string.
 */
export function importFromJson(jsonString: string): ThunderEdgeBackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new InvalidImportError('Invalid JSON format for backup file', err);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new InvalidImportError('Backup data must be an object');
  }

  const raw = parsed as Partial<ThunderEdgeBackupData>;
  if (!Array.isArray(raw.trades)) {
    throw new InvalidImportError('Backup JSON missing valid "trades" array');
  }

  // Validate each trade
  const validatedTrades: Trade[] = [];
  for (let i = 0; i < raw.trades.length; i++) {
    const tradeCandidate = raw.trades[i];
    const validation = TradeSchema.safeParse(tradeCandidate);
    if (!validation.success) {
      throw new InvalidImportError(
        `Trade at index ${i} is corrupted: ${validation.error.issues.map((it) => it.message).join(', ')}`
      );
    }
    validatedTrades.push(validation.data as Trade);
  }

  return {
    version: raw.version || 1,
    exportedAt: raw.exportedAt || new Date().toISOString(),
    app: 'ThunderEdge',
    trades: validatedTrades,
    settings: raw.settings,
    imports: raw.imports,
  };
}
