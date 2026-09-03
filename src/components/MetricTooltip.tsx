import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface MetricTooltipProps {
  title: string;
  description: string;
  formula?: string;
  interpretation?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  title,
  description,
  formula,
  interpretation,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1 z-30">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 rounded-full text-slate-400 hover:text-[#6D19E8] dark:hover:text-[#A855F7] transition-colors cursor-pointer"
        aria-label={`Explication de ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="metric-tooltip-spring absolute left-1/2 bottom-full mb-2 w-64 p-3 rounded-2xl bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#292E38] shadow-xl text-left text-xs z-50 pointer-events-auto"
        >
          <div className="font-bold text-slate-900 dark:text-[#F5F5F5] mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D19E8] dark:bg-[#A855F7]" />
            <span>{title}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#9299A8] leading-relaxed mb-2">
            {description}
          </p>
          {formula && (
            <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-[#12151D] border border-slate-100 dark:border-[#292E38] font-mono text-[10px] text-[#6D19E8] dark:text-[#A855F7] mb-1.5">
              {formula}
            </div>
          )}
          {interpretation && (
            <div className="text-[10px] text-slate-500 dark:text-[#9299A8]/90 italic">
              💡 {interpretation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
