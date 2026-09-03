import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200/70 dark:bg-[#181C25]/80 rounded-xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" id="dashboard-skeleton-loader">
      {/* Chart Skeleton */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-4" />
              <Skeleton className="w-24 h-3" />
            </div>
          </div>
          <Skeleton className="w-32 h-8 rounded-2xl" />
        </div>
        <Skeleton className="w-full h-56 rounded-2xl" />
      </div>

      {/* Monthly Breakdown Cards Skeleton */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="w-40 h-4" />
              <Skeleton className="w-64 h-3" />
            </div>
          </div>
          <Skeleton className="w-28 h-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-[#292E38] bg-slate-50/50 dark:bg-[#181C25]/50 space-y-3"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-16 h-4 rounded-lg" />
              </div>
              <Skeleton className="w-32 h-6" />
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-[#292E38]">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Table Skeleton */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-[#292E38] bg-white dark:bg-[#12151D] shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="w-36 h-5" />
          <Skeleton className="w-24 h-8 rounded-xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-full h-12 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
