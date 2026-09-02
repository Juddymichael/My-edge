import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`} id="thunder-edge-logo">
      {/* Precision Thunder Edge Mark */}
      <div
        className={`${iconDimensions} rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 dark:from-indigo-600 dark:via-indigo-500 dark:to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105`}
      >
        <div className="w-full h-full rounded-[10px] bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5 text-white"
          >
            {/* Precision lightning bolt with geometric angular edge */}
            <path
              d="M13.5 2L5 13.5H11.5L9.5 22L19 9.5H12.5L13.5 2Z"
              fill="url(#thunder-edge-grad)"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="thunder-edge-grad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#C7D2FE" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold tracking-tight ${textSize} text-slate-900 dark:text-slate-100 font-sans`}>
              THUNDER<span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-0.5">EDGE</span>
            </span>
            <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-wider">
              PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal tracking-wide mt-1 hidden sm:inline">
            Terminal &amp; Edge Engine
          </span>
        </div>
      )}
    </div>
  );
};
