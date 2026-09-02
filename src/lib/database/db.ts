import Dexie, { Table } from 'dexie';
import { Trade } from '../../types/trade';
import { ImportLog } from '../../types/import';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../../types/settings';
import { Setup, EntryModel, DEFAULT_SETUPS } from '../../types/setup';
import { RiskAlert } from '../riskPatterns';

export interface CoachHistoryMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export class ThunderEdgeDatabase extends Dexie {
  trades!: Table<Trade, string>;
  imports!: Table<ImportLog, string>;
  settings!: Table<UserSettings, string>;
  setups!: Table<Setup, string>;
  entryModels!: Table<EntryModel, string>;
  coachHistory!: Table<CoachHistoryMessage, string>;
  riskAlerts!: Table<RiskAlert, string>;

  constructor() {
    super('ThunderEdgeDB');
    this.version(1).stores({ trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt', imports: 'id, filename, fileType, importedAt, status', settings: 'id' });
    this.version(2).stores({ trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt, setupId, setup, session', imports: 'id, filename, fileType, importedAt, status', settings: 'id', setups: 'id, name, shortName, category, enabled, createdAt', entryModels: 'id, name, setupId, enabled' });
    this.version(3).stores({ trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt, setupId, setup, session', imports: 'id, filename, fileType, importedAt, status', settings: 'id', setups: 'id, name, shortName, category, enabled, createdAt', entryModels: 'id, name, setupId, enabled', coachHistory: 'id, role, timestamp' });
    this.version(4).stores({ trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt, setupId, setup, session', imports: 'id, filename, fileType, importedAt, status', settings: 'id', setups: 'id, name, shortName, category, enabled, createdAt', entryModels: 'id, name, setupId, enabled', coachHistory: 'id, role, timestamp', riskAlerts: 'id, type, detectedAt, read, dismissed' });
  }

  async ensureSettings(): Promise<UserSettings> {
    const existing = await this.settings.get(DEFAULT_USER_SETTINGS.id);
    if (!existing) {
      await this.settings.put(DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    }
    // Backfill fields introduced after the original settings schema without
    // overwriting the user's existing preferences.
    if (!existing.riskPatternSettings) {
      const migrated = { ...DEFAULT_USER_SETTINGS, ...existing, riskPatternSettings: DEFAULT_USER_SETTINGS.riskPatternSettings };
      await this.settings.put(migrated);
      return migrated;
    }
    return existing;
  }

  async ensureDefaultSetups(): Promise<Setup[]> {
    const count = await this.setups.count();
    if (count === 0) { await this.setups.bulkPut(DEFAULT_SETUPS); return DEFAULT_SETUPS; }
    return await this.setups.toArray();
  }
}

export const db = new ThunderEdgeDatabase();
