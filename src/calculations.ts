// Public calculation facade.
// Keeps legacy exports available while routing performance statistics through
// the strict, non-estimating statistics layer.
export {
  calculateEdgeAnalysis,
  calculateAccountBalanceSummary,
  buildRealEquityCurve,
  getTradeRMultiple,
  calculateExpectancy,
  getStatisticalConfidence,
  calculateEdgeScore,
} from './calculations/index';

export {
  calculateReliablePerformanceStats as calculatePerformanceStats,
  getReliableRMultiple,
  calculateReliableExpectancy,
  getExpectancyConfidence,
} from './calculations/strictStats';
