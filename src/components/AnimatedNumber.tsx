import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  format?: (val: number) => string;
  duration?: number; // duration in ms, default ~850ms
  prefix?: string;
  suffix?: string;
  className?: string;
  colorizeSigned?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  duration = 850,
  prefix = '',
  suffix = '',
  className = '',
  colorizeSigned = false,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = value;
    prevValueRef.current = endVal;

    // If initial load or zero diff, set immediately
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic: 1 - (1 - progress)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatted = format ? format(displayValue) : displayValue.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  const colorClass = colorizeSigned
    ? value > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : value < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-900 dark:text-[#F5F5F5]'
    : '';

  return (
    <span
      className={`tabular-nums transition-colors duration-300 ease-in-out ${colorClass} ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
