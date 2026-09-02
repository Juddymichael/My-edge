import { Trade, DataQuality } from '../../types/trade';

/**
 * Evaluates the Data Quality status of a Trade according to institutional rules.
 * - VERIFIED: All essential and financial data present and coherent.
 * - PARTIAL: Operable trade, but missing secondary info (e.g. commission, setup, risk).
 * - NEEDS_REVIEW: Essential data is missing, ambiguous, or incoherent.
 */
export function evaluateDataQuality(trade: Partial<Trade>): {
  quality: DataQuality;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check critical errors (NEEDS_REVIEW)
  if (!trade.symbol || trade.symbol === 'UNKNOWN') {
    reasons.push('Missing or invalid symbol');
  }

  if (!trade.direction || (trade.direction !== 'BUY' && trade.direction !== 'SELL')) {
    reasons.push('Invalid trade direction');
  }

  if (!trade.openedAt) {
    reasons.push('Missing open date/time');
  }

  if (trade.entryPrice === null || trade.entryPrice === undefined || trade.entryPrice <= 0) {
    reasons.push('Missing or non-positive entry price');
  }

  if (trade.status === 'CLOSED') {
    if (trade.closedAt && trade.openedAt) {
      const openTime = new Date(trade.openedAt).getTime();
      const closeTime = new Date(trade.closedAt).getTime();
      if (openTime > closeTime) {
        reasons.push('Open date is later than close date');
      }
    }

    if (trade.netPnL === null && trade.grossPnL === null && (trade.exitPrice === null || trade.exitPrice <= 0)) {
      reasons.push('Closed trade has neither P&L nor valid exit price');
    }
  }

  if (reasons.length > 0) {
    return { quality: 'NEEDS_REVIEW', reasons };
  }

  // Check completeness for VERIFIED vs PARTIAL
  const partialReasons: string[] = [];

  if (trade.commission === null) {
    partialReasons.push('Commission is unknown');
  }

  if (trade.initialRiskAmount === null && trade.stopLoss === null) {
    partialReasons.push('No risk definition (no initial risk amount nor stop loss)');
  }

  if (trade.status === 'CLOSED' && trade.exitPrice === null) {
    partialReasons.push('Exit price is missing on closed trade');
  }

  if (trade.status === 'CLOSED' && trade.netPnL === null) {
    partialReasons.push('Net P&L is uncalculated');
  }

  if (!trade.session) {
    partialReasons.push('Trading session unassigned');
  }

  if (partialReasons.length > 0) {
    return { quality: 'PARTIAL', reasons: partialReasons };
  }

  return { quality: 'VERIFIED', reasons: [] };
}
