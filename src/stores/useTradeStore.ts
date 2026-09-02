import { create } from 'zustand';
import { Trade, NewTradeInput } from '../types/trade';
import { TradeRepository } from '../lib/database/repositories/tradeRepository';
import { SEED_TRADES } from '../data/seedTrades';
import { calculateComprehensiveMetrics } from '../lib/calculations';
import { ComprehensivePerformanceMetrics } from '../types/calculations';

interface TradeState {
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  selectedTrade: Trade | null;

  // Actions
  loadTrades: () => Promise<void>;
  addTrade: (input: NewTradeInput) => Promise<Trade>;
  removeTrade: (id: string) => Promise<void>;
  clearAllTrades: () => Promise<void>;
  seedDatabase: () => Promise<{ inserted: number; duplicates: number }>;
  setSelectedTrade: (trade: Trade | null) => void;
  getMetrics: (initialBalance?: number) => ComprehensivePerformanceMetrics;
}

export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  isLoading: false,
  error: null,
  selectedTrade: null,

  loadTrades: async () => {
    set({ isLoading: true, error: null });
    try {
      const trades = await TradeRepository.getAll();
      set({ trades, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load trades',
      });
    }
  },

  addTrade: async (input: NewTradeInput) => {
    set({ isLoading: true, error: null });
    try {
      const saved = await TradeRepository.create(input);
      const trades = await TradeRepository.getAll();
      set({ trades, isLoading: false });
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save trade';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  removeTrade: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await TradeRepository.delete(id);
      const trades = await TradeRepository.getAll();
      set({ trades, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to delete trade',
      });
    }
  },

  clearAllTrades: async () => {
    set({ isLoading: true, error: null });
    try {
      await TradeRepository.clearAll();
      set({ trades: [], isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to clear trades',
      });
    }
  },

  seedDatabase: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await TradeRepository.bulkInsert(SEED_TRADES, true);
      const trades = await TradeRepository.getAll();
      set({ trades, isLoading: false });
      return { inserted: result.inserted, duplicates: result.duplicates };
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to seed database',
      });
      throw err;
    }
  },

  setSelectedTrade: (trade: Trade | null) => {
    set({ selectedTrade: trade });
  },

  getMetrics: (initialBalance = 10000) => {
    return calculateComprehensiveMetrics(get().trades, initialBalance);
  },
}));
