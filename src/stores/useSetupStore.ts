import { create } from 'zustand';
import { Setup, EntryModel } from '../types/setup';
import { setupRepository } from '../lib/database/repositories/setupRepository';

interface SetupState {
  setups: Setup[];
  entryModels: EntryModel[];
  isLoading: boolean;
  error: string | null;

  fetchSetups: () => Promise<void>;
  addOrUpdateSetup: (setup: Setup) => Promise<Setup>;
  toggleSetup: (id: string, enabled: boolean) => Promise<void>;
  removeSetup: (id: string) => Promise<void>;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  setups: [],
  entryModels: [],
  isLoading: false,
  error: null,

  fetchSetups: async () => {
    set({ isLoading: true, error: null });
    try {
      const setups = await setupRepository.getAllSetups();
      const entryModels = await setupRepository.getAllEntryModels();
      set({ setups, entryModels, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load trading setups',
        isLoading: false,
      });
    }
  },

  addOrUpdateSetup: async (setup: Setup) => {
    try {
      const saved = await setupRepository.saveSetup(setup);
      await get().fetchSetups();
      return saved;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save setup' });
      throw err;
    }
  },

  toggleSetup: async (id: string, enabled: boolean) => {
    try {
      await setupRepository.toggleSetup(id, enabled);
      await get().fetchSetups();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to toggle setup' });
    }
  },

  removeSetup: async (id: string) => {
    try {
      await setupRepository.deleteSetup(id);
      await get().fetchSetups();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete setup' });
    }
  },
}));
