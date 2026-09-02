import { Trade } from '../../types/trade';

/**
 * Exports trades to standardized CSV.
 */
export function exportToCsv(trades: Trade[]): string {
  const headers = [
    'id',
    'ticket',
    'symbol',
    'direction',
    'status',
    'dataQuality',
    'openedAt',
    'closedAt',
    'entryPrice',
    'exitPrice',
    'stopLoss',
    'takeProfit',
    'quantity',
    'grossPnL',
    'commission',
    'swap',
    'netPnL',
    'initialRiskAmount',
    'riskPercent',
    'rMultiple',
    'session',
    'setup',
    'mistake',
    'emotion',
    'tags',
  ];

  const rows = trades.map((t) => [
    t.id,
    t.ticket ?? '',
    t.symbol,
    t.direction,
    t.status,
    t.dataQuality,
    t.openedAt,
    t.closedAt ?? '',
    t.entryPrice ?? '',
    t.exitPrice ?? '',
    t.stopLoss ?? '',
    t.takeProfit ?? '',
    t.quantity ?? '',
    t.grossPnL ?? '',
    t.commission ?? '',
    t.swap ?? '',
    t.netPnL ?? '',
    t.initialRiskAmount ?? '',
    t.riskPercent !== null ? t.riskPercent.toFixed(2) : '',
    t.rMultiple !== null ? t.rMultiple.toFixed(2) : '',
    t.session ?? '',
    `"${(t.setup ?? '').replace(/"/g, '""')}"`,
    t.mistake ?? '',
    t.emotion ?? '',
    `"${t.tags.join(';')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
