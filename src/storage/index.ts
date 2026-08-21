import { Trade, AccountTransaction, ImportBatchRecord, UserAppSettings } from '../types';
import { DEFAULT_PLAN_INSTRUMENTS } from '../utils/tradingSession';

const STORAGE_KEYS = {
  TRADES: 'trading_edge_trades_v1',
  TRANSACTIONS: 'trading_edge_transactions_v1',
  SETTINGS: 'trading_edge_settings_v4',
  IMPORT_BATCHES: 'trading_edge_import_batches_v1',
};

export const DEFAULT_SETTINGS: UserAppSettings = {
  currencySymbol: '$',
  startingBalance: 10000,
  reduceMotion: false,
  theme: 'dark',
  violetVariant: 'smoothie-berry',
  planInstruments: DEFAULT_PLAN_INSTRUMENTS,
};

// LocalStorage based persistent state manager with error safety
export function loadTradesFromStorage(): Trade[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRADES) || localStorage.getItem('trading_edge_trades_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load trades from storage:', err);
    return [];
  }
}

export function saveTradesToStorage(trades: Trade[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
    return true;
  } catch (err) {
    console.error('Failed to save trades to storage:', err);
    return false;
  }
}

export function loadTransactionsFromStorage(): AccountTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || localStorage.getItem('trading_edge_transactions_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load transactions from storage:', err);
    return [];
  }
}

export function saveTransactionsToStorage(transactions: AccountTransaction[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return true;
  } catch (err) {
    console.error('Failed to save transactions to storage:', err);
    return false;
  }
}

export function loadSettingsFromStorage(): UserAppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      // Default to dark mode for new and migrated sessions
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: UserAppSettings): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
}

export function loadImportBatches(): ImportBatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load import batches:', err);
    return [];
  }
}

export function saveImportBatchRecord(record: ImportBatchRecord): void {
  try {
    const existing = loadImportBatches();
    const updated = [record, ...existing];
    localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save import batch record:', err);
  }
}

export function removeBatchRecord(batchId: string): void {
  try {
    const existing = loadImportBatches();
    const updated = existing.filter((b) => b.id !== batchId);
    localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove import batch record:', err);
  }
}

// Backup & Restore
export function exportBackupJSON(
  trades: Trade[], 
  settings: UserAppSettings, 
  transactions: AccountTransaction[] = []
): void {
  const data = {
    app: 'Trading Edge',
    version: '1.1',
    exportedAt: new Date().toISOString(),
    trades,
    transactions,
    settings,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading_edge_backup_${new Date().toISOString().substring(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
