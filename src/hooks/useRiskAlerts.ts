import { useCallback, useEffect, useState } from 'react';
import { db } from '../lib/database/db';
import { detectRiskPatterns, RiskAlert } from '../lib/riskPatterns';
import { Trade } from '../types/trade';
import { UserSettings } from '../types/settings';

const sortAlerts = (alerts: RiskAlert[]) => [...alerts].sort((a, b) =>
  new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
);

export async function analyzeAndPersistRiskAlerts(trades: Trade[], settings: UserSettings): Promise<RiskAlert[]> {
  const detected = detectRiskPatterns(trades, settings);
  const existing = await db.riskAlerts.toArray();
  const existingIds = new Set(existing.map((alert) => alert.id));
  const fresh = detected.filter((alert) => !existingIds.has(alert.id));
  if (fresh.length) await db.riskAlerts.bulkPut(fresh);
  return sortAlerts(await db.riskAlerts.toArray());
}

export function useRiskAlerts(trades: Trade[], settings: UserSettings) {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const refresh = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const next = await analyzeAndPersistRiskAlerts(trades, settings);
      setAlerts(next);
    } finally {
      setIsAnalyzing(false);
    }
  }, [trades, settings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markViewed = useCallback(async (id: string) => {
    const alert = await db.riskAlerts.get(id);
    if (!alert) return;
    await db.riskAlerts.put({ ...alert, read: true });
    setAlerts((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }, []);

  const dismissAll = useCallback(async () => {
    const current = await db.riskAlerts.toArray();
    if (!current.length) return;
    const updated = current.map((alert) => ({ ...alert, dismissed: true, read: true }));
    await db.riskAlerts.bulkPut(updated);
    setAlerts(updated);
  }, []);

  const dismiss = useCallback(async (id: string) => {
    const alert = await db.riskAlerts.get(id);
    if (!alert) return;
    await db.riskAlerts.put({ ...alert, dismissed: true, read: true });
    setAlerts((current) => current.map((item) => item.id === id ? { ...item, dismissed: true, read: true } : item));
  }, []);

  const activeAlerts = alerts.filter((alert) => !alert.dismissed);
  const unreadCount = activeAlerts.filter((alert) => !alert.read).length;

  return { alerts, activeAlerts, unreadCount, isAnalyzing, refresh, markViewed, dismiss, dismissAll };
}
