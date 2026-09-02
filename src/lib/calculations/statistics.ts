import { Trade } from '../../types/trade';
import { WinRateResult, ProfitFactorResult, ExpectancyResult } from '../../types/calculations';
import { safeAdd, safeDivide } from './precision';

const EPSILON = 0.00001;

/**
 * Calculates Win Rate strictly excluding open trades.
 */
export function calculateWinRate(trades: Trade[]): WinRateResult {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let open = 0;

  for (const t of trades) {
    if (t.status === 'OPEN') {
      open++;
      continue;
    }

    if (t.netPnL === null || t.netPnL === undefined) {
      continue;
    }

    if (t.netPnL > EPSILON) {
      wins++;
    } else if (t.netPnL < -EPSILON) {
      losses++;
    } else {
      breakeven++;
    }
  }

  const closed = wins + losses + breakeven;
  const winRate = closed > 0 ? (wins / closed) * 100 : null;

  return {
    winRate,
    wins,
    losses,
    breakeven,
    open,
    closed,
    total: trades.length,
  };
}

/**
 * Calculates Profit Factor = grossProfit / absoluteGrossLoss.
 * Handles edge cases (zero loss, zero profit).
 */
export function calculateProfitFactor(trades: Trade[]): ProfitFactorResult {
  let grossProfit = 0;
  let grossLoss = 0;

  for (const t of trades) {
    if (t.status === 'OPEN' || t.netPnL === null || t.netPnL === undefined) {
      continue;
    }

    if (t.netPnL > 0) {
      grossProfit = safeAdd(grossProfit, t.netPnL);
    } else if (t.netPnL < 0) {
      grossLoss = safeAdd(grossLoss, Math.abs(t.netPnL));
    }
  }

  if (grossLoss === 0) {
    if (grossProfit > 0) {
      return { profitFactor: Infinity, grossProfit, grossLoss };
    }
    return { profitFactor: null, grossProfit: 0, grossLoss: 0 };
  }

  const profitFactor = safeDivide(grossProfit, grossLoss);
  return {
    profitFactor,
    grossProfit,
    grossLoss,
  };
}

/**
 * Calculates Expectancy in R and in Currency.
 * If R is not available for sufficient trades, rExpectancy is null.
 */
export function calculateExpectancy(trades: Trade[]): ExpectancyResult {
  let sumR = 0;
  let validRTradesCount = 0;
  let sumMoney = 0;
  let closedTradesCount = 0;

  for (const t of trades) {
    if (t.status === 'OPEN') continue;

    if (t.rMultiple !== null && t.rMultiple !== undefined && !isNaN(t.rMultiple)) {
      sumR = safeAdd(sumR, t.rMultiple);
      validRTradesCount++;
    }

    if (t.netPnL !== null && t.netPnL !== undefined && !isNaN(t.netPnL)) {
      sumMoney = safeAdd(sumMoney, t.netPnL);
      closedTradesCount++;
    }
  }

  const rExpectancy = validRTradesCount > 0 ? safeDivide(sumR, validRTradesCount) : null;
  const moneyExpectancy = closedTradesCount > 0 ? safeDivide(sumMoney, closedTradesCount) : null;

  return {
    rExpectancy,
    moneyExpectancy,
    validRTradesCount,
    totalClosedTradesCount: closedTradesCount,
  };
}
