import { useEffect } from 'react';
import { useSetupStore } from '../stores/useSetupStore';

export function useSetups() {
  const {
    setups,
    entryModels,
    isLoading,
    error,
    fetchSetups,
    addOrUpdateSetup,
    toggleSetup,
    removeSetup,
  } = useSetupStore();

  useEffect(() => {
    fetchSetups();
  }, [fetchSetups]);

  return {
    setups,
    entryModels,
    isLoading,
    error,
    refreshSetups: fetchSetups,
    addOrUpdateSetup,
    toggleSetup,
    removeSetup,
  };
}
