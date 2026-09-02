export type TradeImportFormat = 'BROKER_STATEMENT' | 'NOTION_EXPORT' | 'GENERIC_TRADE_TABLE';

const clean = (value: unknown) => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function detectTradeImportFormat(headers: string[]): TradeImportFormat {
  const h = headers.map(clean);
  const notionSignals = ['entree', 'sortie', 'pnl'].filter((name) => h.some((value) => value === name || value.includes(name)));
  const brokerSignals = ['ticket', 'sensdouverture', 'heuredecloture', 'coursdentree', 'pricedecloture', 'neteur', 'lots'].filter((name) => h.some((value) => value === name || value.includes(name)));
  if (notionSignals.length >= 2 && brokerSignals.length < 2) return 'NOTION_EXPORT';
  if (brokerSignals.length >= 2) return 'BROKER_STATEMENT';
  return 'GENERIC_TRADE_TABLE';
}
