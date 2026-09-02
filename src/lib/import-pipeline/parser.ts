import { ImportFileType } from '../../types/import';
import { NewTradeInput } from '../../types/trade';

export interface RawParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  rawString?: string;
}

export interface ParseResult {
  fileType: ImportFileType;
  brokerDetected?: string;
  totalRawRows: number;
  rows: RawParsedRow[];
  metadata?: Record<string, unknown>;
}

/**
 * Universal interface for extensible parsers (CSV, XLSX, PDF, JSON).
 */
export interface ITradeParser {
  readonly supportedType: ImportFileType;
  parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult>;
}

/**
 * Universal interface for normalizing raw broker rows into NewTradeInput.
 */
export interface ITradeRowNormalizer {
  normalizeRow(rawRow: RawParsedRow, context?: Record<string, unknown>): NewTradeInput;
}
