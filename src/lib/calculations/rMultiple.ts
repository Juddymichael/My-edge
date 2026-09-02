import { safeDivide } from './precision';

/**
 * Calculates R Multiple = netPnL / initialRiskAmount.
 * Critical Rules:
 * - If initialRiskAmount is unknown or <= 0, returns null, NEVER 0.
 * - If netPnL is unknown, returns null.
 */
export function calculateRMultiple(
  netPnL: number | null | undefined,
  initialRiskAmount: number | null | undefined
): number | null {
  if (
    netPnL === null ||
    netPnL === undefined ||
    initialRiskAmount === null ||
    initialRiskAmount === undefined ||
    initialRiskAmount <= 0
  ) {
    return null;
  }

  return safeDivide(netPnL, initialRiskAmount);
}
