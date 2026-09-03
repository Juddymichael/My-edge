import { useEffect } from 'react';
import { useTradeStore } from '../stores/useTradeStore';

export function useTrades() {
  const store = useTradeStore();

  useEffect(() => {
    void store.loadTrades();

    const handleTradesChanged = () => {
      void store.loadTrades();
    };

    window.addEventListener('thunder-edge-trades-changed', handleTradesChanged);
    return () => {
      window.removeEventListener('thunder-edge-trades-changed', handleTradesChanged);
    };
  }, [store.loadTrades]);

  return store;
}
