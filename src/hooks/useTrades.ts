import { useEffect } from 'react';
import { useTradeStore } from '../stores/useTradeStore';

export function useTrades() {
  const store = useTradeStore();

  useEffect(() => {
    store.loadTrades();
  }, []);

  return store;
}
