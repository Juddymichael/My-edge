/**
 * Import & batch tracking models.
 */

export type ImportFileType = 'CSV' | 'XLSX' | 'XLS' | 'PDF' | 'DOCX' | 'JSON' | 'MANUAL';
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_FAILED';

export interface ImportReport {
  imported: number;
  duplicates: number;
  invalid: number;
  dateFrom: string | null;
  dateTo: string | null;
  calculatedPnl: number;
  sourceTotalPnl: number | null;
  pnlDifference: number | null;
  pnlMismatchWarning: boolean;
}

export interface ImportLog {
  id: string;
  filename: string;
  fileType: ImportFileType;
  importedAt: string;
  totalRows: number;
  validTrades: number;
  duplicates: number;
  needsReview: number;
  status: ImportStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ParsedTradePreview {
  tempId: string;
  rowNumber: number;
  ticket: string | null;
  symbol: string;
  direction: 'BUY' | 'SELL';
  openedAt: string;
  closedAt: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number | null;
  netPnL: number | null;
  grossPnL: number | null;
  commission: number | null;
  swap: number | null;
  initialRiskAmount: number | null;
  rMultiple: number | null;
  plannedRR: number | null;
  setup: string | null;
  notes: string | null;
  sourceId: string;
  isDuplicate: boolean;
  duplicateReason?: 'EXISTING_IN_DB' | 'DUPLICATE_IN_FILE' | null;
  existingTradeId?: string | null;
  selectedForImport: boolean;
  warnings?: string[];
}
