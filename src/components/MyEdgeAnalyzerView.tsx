import React, { useMemo, useState } from 'react';
import { GitCompareArrows, Image as ImageIcon } from 'lucide-react';
import { Trade } from '../types/trade';
import { Setup } from '../types/setup';
import { calculateMyEdgeDeepAudit } from '../lib/calculations/edge';
import { MyEdgeView } from './MyEdgeView';
import { SetupComparison, SetupScreenshotGallery } from './MyEdgeAnalyzerFeatures';

interface MyEdgeAnalyzerViewProps {
  trades?: Trade[];
  setups?: Setup[];
  currency?: string;
  onOpenSetupsModal?: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

export const MyEdgeAnalyzerView: React.FC<MyEdgeAnalyzerViewProps> = ({
  trades = [],
  setups = [],
  currency = 'EUR',
  onOpenSetupsModal,
  onSelectTrade,
}) => {
  const safeTrades = trades || [];
  const safeSetups = setups || [];
  const [gallerySetup, setGallerySetup] = useState<string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const setupStats = useMemo(() => {
    return calculateMyEdgeDeepAudit(safeTrades, safeSetups).setups;
  }, [safeTrades, safeSetups]);

  const gallerySetupNames = useMemo(() => {
    return setupStats.map((setup) => setup.label);
  }, [setupStats]);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-3xl bg-white dark:bg-[#12151D] border border-slate-200 dark:border-[#292E38] shadow-sm dark:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#F97316]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F5F5]">My Edge Analyzer — Outils Setup</h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#9299A8] mt-1">
              Accès direct aux captures réelles et comparaison de deux setups, sans modifier les analyses existantes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) setGallerySetup(event.target.value);
                event.currentTarget.value = '';
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] text-xs font-semibold text-slate-900 dark:text-[#F5F5F5]"
              aria-label="Choisir un setup pour la galerie"
            >
              <option value="">Galerie captures par setup…</option>
              {gallerySetupNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button
              onClick={() => setComparisonOpen(true)}
              disabled={setupStats.length < 2}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition"
            >
              <GitCompareArrows className="w-4 h-4" />
              Comparer
            </button>
          </div>
        </div>

        {setupStats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {setupStats.slice(0, 8).map((setup) => (
              <button
                key={setup.key}
                onClick={() => setGallerySetup(setup.label)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#292E38] bg-slate-50 dark:bg-[#181C25] hover:border-[#F97316]/50 text-[11px] font-semibold text-slate-700 dark:text-[#F5F5F5] transition"
              >
                {setup.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <MyEdgeView
        trades={safeTrades}
        setups={safeSetups}
        currency={currency}
        onOpenSetupsModal={onOpenSetupsModal}
        onSelectTrade={onSelectTrade}
      />

      {gallerySetup && (
        <SetupScreenshotGallery
          setupName={gallerySetup}
          trades={safeTrades}
          currency={currency}
          onClose={() => setGallerySetup(null)}
          onSelectTrade={onSelectTrade}
        />
      )}

      {comparisonOpen && (
        <SetupComparison
          setupStats={setupStats}
          trades={safeTrades}
          currency={currency}
          onClose={() => setComparisonOpen(false)}
        />
      )}
    </div>
  );
};
