import { safeAdd } from './precision';
import { PnLCalculationInput } from '../../types/calculations';

/**
 * Calculates Net P&L according to strict institutional rules:
 * - If broker provides netPnL directly, use it directly (NEVER add/subtract commission & swap a 2nd time).
 * - If grossPnL is provided, netPnL = grossPnL + commission + swap.
 * - If data is insufficient, returns null, NEVER 0.
 */
export function calculateNetPnL(input: PnLCalculationInput): number | null {
  if (input.isNetProvided && input.netPnLProvided !== null && input.netPnLProvided !== undefined) {
    return input.netPnLProvided;
  }

  if (input.grossPnL === null || input.grossPnL === undefined || isNaN(input.grossPnL)) {
    if (input.netPnLProvided !== null && input.netPnLProvided !== undefined && !isNaN(input.netPnLProvided)) {
      return input.netPnLProvided;
    }
    return null;
  }

  // Calculate gross + commission + swap
  // In financial reporting, commissions are typically negative expenses (e.g. -3.50)
  // or positive fees. safeAdd handles the algebraic sum.
  const gross = input.grossPnL;
  const comm = input.commission ?? 0;
  const swap = input.swap ?? 0;

  return safeAdd(gross, comm, swap);
}
