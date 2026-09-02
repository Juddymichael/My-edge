import { safeDivide } from './precision';

/**
 * Calculates Risk Percentage based on initial risk amount and account balance.
 * Returns null if data is missing or invalid. NEVER returns 0 for unknown.
 */
export function calculateRiskPercent(
  initialRiskAmount: number | null | undefined,
  balanceBefore: number | null | undefined
): number | null {
  if (
    initialRiskAmount === null ||
    initialRiskAmount === undefined ||
    balanceBefore === null ||
    balanceBefore === undefined ||
    initialRiskAmount <= 0 ||
    balanceBefore <= 0
  ) {
    return null;
  }

  const ratio = safeDivide(initialRiskAmount, balanceBefore);
  if (ratio === null) return null;

  return ratio * 100;
}
