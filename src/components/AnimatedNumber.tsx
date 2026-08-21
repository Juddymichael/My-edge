import React, { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  fallback?: string;
  duration?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className = '',
  fallback = 'N/A',
  duration = 600,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) return;

    let startTimestamp: number | null = null;
    let frameId: number;
    let isCancelled = false;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (isCancelled) return;
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic curve for smooth luxury SaaS feel
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * easeOut);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [value, duration]);

  if (value === null || value === undefined || isNaN(value)) {
    return <span className={className}>{fallback}</span>;
  }

  const formattedNumber = displayValue.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
};
