import React from 'react';
import { DataQuality } from '../types/trade';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface Props {
  quality: DataQuality;
  reasons?: string[];
  showText?: boolean;
}

export const DataQualityBadge: React.FC<Props> = ({ quality, showText = true }) => {
  switch (quality) {
    case 'VERIFIED':
      return (
        <span
          id={`badge-quality-${quality.toLowerCase()}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
          title="All essential and financial data is mathematically coherent."
        >
          <CheckCircle2 className="w-3 h-3" />
          {showText && <span>VERIFIED</span>}
        </span>
      );

    case 'PARTIAL':
      return (
        <span
          id={`badge-quality-${quality.toLowerCase()}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
          title="Trade is operable, but secondary attributes (e.g. commission or setup) are missing."
        >
          <AlertTriangle className="w-3 h-3" />
          {showText && <span>PARTIAL</span>}
        </span>
      );

    case 'NEEDS_REVIEW':
      return (
        <span
          id={`badge-quality-${quality.toLowerCase()}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
          title="Essential data is missing, ambiguous, or contradictory."
        >
          <AlertCircle className="w-3 h-3" />
          {showText && <span>NEEDS REVIEW</span>}
        </span>
      );
  }
};

