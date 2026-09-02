import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useSettings() {
  const store = useSettingsStore();

  useEffect(() => {
    store.loadSettings();
  }, []);

  return store;
}
