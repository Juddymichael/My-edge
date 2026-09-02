import { create } from 'zustand';
import { UserSettings, DEFAULT_USER_SETTINGS } from '../types/settings';
import { SettingsRepository } from '../lib/database/repositories/settingsRepository';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_USER_SETTINGS,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await SettingsRepository.get();
      set({ settings, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load settings',
      });
    }
  },

  updateSettings: async (partial: Partial<UserSettings>) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await SettingsRepository.save(partial);
      set({ settings: updated, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to update settings',
      });
      throw err;
    }
  },

  resetSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const reset = await SettingsRepository.reset();
      set({ settings: reset, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to reset settings',
      });
    }
  },
}));
