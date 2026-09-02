import Dexie, { Table } from 'dexie';
import { Trade } from '../../types/trade';
import { ImportLog } from '../../types/import';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../../types/settings';
import { Setup, EntryModel, DEFAULT_SETUPS } from '../../types/setup';

/**
 * Institutional Dexie IndexedDB instance for Thunder Edge.
 * Schema handles fast querying across thousands of trades and setup models.
 */
export class ThunderEdgeDatabase extends Dexie {
  trades!: Table<Trade, string>;
  imports!: Table<ImportLog, string>;
  settings!: Table<UserSettings, string>;
  setups!: Table<Setup, string>;
  entryModels!: Table<EntryModel, string>;

  constructor() {
    super('ThunderEdgeDB');

    // Version 1
    this.version(1).stores({
      trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt',
      imports: 'id, filename, fileType, importedAt, status',
      settings: 'id',
    });

    // Version 2: Setup System & Statistical edge indexes
    this.version(2).stores({
      trades: 'id, ticket, sourceId, symbol, direction, status, dataQuality, openedAt, closedAt, createdAt, setupId, setup, session',
      imports: 'id, filename, fileType, importedAt, status',
      settings: 'id',
      setups: 'id, name, shortName, category, enabled, createdAt',
      entryModels: 'id, name, setupId, enabled',
    });
  }

  /**
   * Initializes default settings if not present.
   */
  async ensureSettings(): Promise<UserSettings> {
    const existing = await this.settings.get(DEFAULT_USER_SETTINGS.id);
    if (!existing) {
      await this.settings.put(DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    }
    return existing;
  }

  /**
   * Initializes default setups (Golden FVG, CISD + MSS 2022, OB, IFVG, FVG) if empty.
   */
  async ensureDefaultSetups(): Promise<Setup[]> {
    const count = await this.setups.count();
    if (count === 0) {
      await this.setups.bulkPut(DEFAULT_SETUPS);
      return DEFAULT_SETUPS;
    }
    return await this.setups.toArray();
  }
}

export const db = new ThunderEdgeDatabase();
