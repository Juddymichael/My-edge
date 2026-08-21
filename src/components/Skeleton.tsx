import React from 'react';

interface SkeletonProps {
  className?: string;
  isLight?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', isLight = false }) => {
  return (
    <div
      className={`animate-pulse rounded-md ${
        isLight ? 'bg-slate-200/80' : 'bg-slate-800/80'
      } ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#161922] border-[#232733]'
      } space-y-3`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" isLight={isLight} />
        <Skeleton className="h-5 w-16 rounded-full" isLight={isLight} />
      </div>
      <Skeleton className="h-7 w-36" isLight={isLight} />
      <div className="pt-2 flex justify-between">
        <Skeleton className="h-3 w-24" isLight={isLight} />
        <Skeleton className="h-3 w-16" isLight={isLight} />
      </div>
    </div>
  );
};
