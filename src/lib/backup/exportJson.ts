import { Trade } from '../../types/trade';
import { UserSettings } from '../../types/settings';
import { ImportLog } from '../../types/import';

export interface ThunderEdgeBackupData {
  version: number;
  exportedAt: string;
  app: 'ThunderEdge';
  trades: Trade[];
  settings?: UserSettings;
  imports?: ImportLog[];
}

/**
 * Serializes the complete application database state to a JSON backup string.
 */
export function exportToJson(
  trades: Trade[],
  settings?: UserSettings,
  imports?: ImportLog[]
): string {
  const backup: ThunderEdgeBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'ThunderEdge',
    trades,
    settings,
    imports,
  };

  return JSON.stringify(backup, null, 2);
}
