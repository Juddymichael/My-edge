import { IFileDetector, DefaultFileDetector, DetectionResult } from './detector';
import { ITradeParser, ITradeRowNormalizer } from './parser';
import { TradeRepository } from '../database/repositories/tradeRepository';
import { ImportRepository } from '../database/repositories/importRepository';
import { ImportLog, ImportFileType, ParsedTradePreview, ImportReport } from '../../types/import';
import { NewTradeInput, Trade } from '../../types/trade';
import { InvalidImportError } from '../../types/errors';
import { CsvTradeParser } from './parsers/csvParser';
import { ExcelTradeParser } from './parsers/excelParser';
import { PdfTradeParser } from './parsers/pdfParser';
import { WordTradeParser } from './parsers/wordParser';
import { JsonTradeParser } from './parsers/jsonParser';
import { UniversalTradeNormalizer } from './normalizer';
import { TradeDuplicateDetector } from './duplicateDetector';
import { validateImportRow } from './importValidation';
import { detectTradeImportFormat } from './formatDetection';

export interface ImportPipelineOptions { detector?: IFileDetector; parsers?: Map<ImportFileType, ITradeParser>; normalizer?: ITradeRowNormalizer; skipDuplicates?: boolean; }
export interface ImportPipelineExecutionResult { importLog: ImportLog; savedTrades: Trade[]; duplicatesCount: number; needsReviewCount: number; failedRows: { rowNumber: number; error: string }[]; report: ImportReport; }
export interface ImportPreviewResult { fileType: ImportFileType; detection: DetectionResult; totalParsed: number; newTradesCount: number; duplicatesCount: number; previews: ParsedTradePreview[]; normalizedTrades: NewTradeInput[]; report: ImportReport; }

function buildReport(trades: NewTradeInput[], duplicates: number, invalid: number, sourceTotalPnl: number | null): ImportReport {
  const dates = trades.map((trade) => trade.closedAt || trade.openedAt).filter(Boolean).sort();
  const calculatedPnl = trades.reduce((sum, trade) => sum + (trade.netPnL ?? 0), 0);
  const pnlDifference = sourceTotalPnl === null ? null : Math.abs(calculatedPnl - sourceTotalPnl);
  return { imported: trades.length - duplicates, duplicates, invalid, dateFrom: dates[0] || null, dateTo: dates[dates.length - 1] || null, calculatedPnl, sourceTotalPnl, pnlDifference, pnlMismatchWarning: pnlDifference !== null && pnlDifference > 1 };
}

export class ImportPipeline {
  private detector: IFileDetector;
  private parsers: Map<ImportFileType, ITradeParser>;
  private normalizer?: ITradeRowNormalizer;

  constructor(options?: ImportPipelineOptions) {
    this.detector = options?.detector || new DefaultFileDetector();
    this.parsers = options?.parsers || new Map();
    this.normalizer = options?.normalizer || new UniversalTradeNormalizer();
    if (this.parsers.size === 0) {
      const excelParser = new ExcelTradeParser();
      this.parsers.set('CSV', new CsvTradeParser()); this.parsers.set('XLSX', excelParser); this.parsers.set('XLS', excelParser);
      this.parsers.set('PDF', new PdfTradeParser()); this.parsers.set('DOCX', new WordTradeParser()); this.parsers.set('JSON', new JsonTradeParser());
    }
  }

  public registerParser(parser: ITradeParser): void { this.parsers.set(parser.supportedType, parser); }
  public setNormalizer(normalizer: ITradeRowNormalizer): void { this.normalizer = normalizer; }

  private async parseValidTrades(file: { name: string; content: string | ArrayBuffer; mimeType?: string }, existingTrades: Trade[]) {
    const detection = await this.detector.detect(file);
    const parser = this.parsers.get(detection.fileType);
    if (!parser) throw new InvalidImportError(`No parser registered for file format: ${detection.fileType} (${file.name})`);
    const parseResult = await parser.parse(file.content, { delimiter: detection.delimiter });
    const normalizedTrades: NewTradeInput[] = [];
    let invalid = Number(parseResult.metadata?.invalidRows || 0);
    const validationErrors: { rowNumber: number; error: string }[] = [];
    const headers = Array.isArray(parseResult.metadata?.headers) ? parseResult.metadata?.headers as string[] : [];
    const detectedFormat = headers.length ? detectTradeImportFormat(headers) : 'GENERIC_TRADE_TABLE';

    for (const rawRow of parseResult.rows) {
      const validation = validateImportRow(rawRow.data, rawRow.rawString || '');
      if (!validation.valid) { invalid++; validationErrors.push({ rowNumber: rawRow.rowNumber, error: validation.reason || 'Ligne invalide' }); continue; }
      try {
        const normalized = this.normalizer ? this.normalizer.normalizeRow(rawRow, { broker: parseResult.brokerDetected, strictImport: true, importFormat: detectedFormat }) : rawRow.data as unknown as NewTradeInput;
        if (!normalized.symbol || normalized.symbol === 'UNKNOWN' || !normalized.openedAt) throw new InvalidImportError('Trade incomplet après normalisation');
        normalizedTrades.push(normalized);
      } catch (error) { invalid++; validationErrors.push({ rowNumber: rawRow.rowNumber, error: error instanceof Error ? error.message : String(error) }); }
    }

    const duplicateAnalysis = TradeDuplicateDetector.analyzeBatch(normalizedTrades, existingTrades);
    const sourceTotalPnl = typeof parseResult.metadata?.sourceTotalPnl === 'number' ? parseResult.metadata.sourceTotalPnl : null;
    const report = buildReport(normalizedTrades, duplicateAnalysis.duplicatesCount, invalid, sourceTotalPnl);
    return { detection, parseResult, normalizedTrades, duplicateAnalysis, report, validationErrors, detectedFormat };
  }

  public async parseAndPreview(file: { name: string; content: string | ArrayBuffer; mimeType?: string }, existingTrades: Trade[]): Promise<ImportPreviewResult> {
    const result = await this.parseValidTrades(file, existingTrades);
    return { fileType: result.detection.fileType, detection: result.detection, totalParsed: result.duplicateAnalysis.totalParsed, newTradesCount: result.duplicateAnalysis.newTradesCount, duplicatesCount: result.duplicateAnalysis.duplicatesCount, previews: result.duplicateAnalysis.previews, normalizedTrades: result.normalizedTrades, report: result.report };
  }

  public async execute(file: { name: string; content: string | ArrayBuffer; mimeType?: string }, options: { skipDuplicates?: boolean } = { skipDuplicates: true }): Promise<ImportPipelineExecutionResult> {
    const importId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const importedAt = new Date().toISOString();
    const result = await this.parseValidTrades(file, []);
    const savedTrades: Trade[] = [];
    let duplicatesCount = result.duplicateAnalysis.duplicatesCount;
    let needsReviewCount = 0;
    const failedRows = [...result.validationErrors];
    for (const tradeInput of result.normalizedTrades) {
      try { const saved = await TradeRepository.create(tradeInput, !options.skipDuplicates); savedTrades.push(saved); if (saved.dataQuality === 'NEEDS_REVIEW') needsReviewCount++; }
      catch (err: unknown) { if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'DUPLICATE_TRADE_ERROR') duplicatesCount++; else failedRows.push({ rowNumber: 0, error: err instanceof Error ? err.message : String(err) }); }
    }
    const report = buildReport(savedTrades, duplicatesCount, failedRows.length, result.report.sourceTotalPnl);
    const finalStatus = failedRows.length === 0 ? 'COMPLETED' : savedTrades.length > 0 ? 'PARTIALLY_FAILED' : 'FAILED';
    const importLog: ImportLog = { id: importId, filename: file.name, fileType: result.detection.fileType, importedAt, totalRows: result.parseResult.totalRawRows, validTrades: savedTrades.length, duplicates: duplicatesCount, needsReview: needsReviewCount, status: finalStatus, errorMessage: failedRows.length ? `${failedRows.length} rows failed validation` : null, metadata: { broker: result.parseResult.brokerDetected, importFormat: result.detectedFormat, report, failedRowsSample: failedRows.slice(0, 5) } };
    await ImportRepository.save(importLog);
    return { importLog, savedTrades, duplicatesCount, needsReviewCount, failedRows, report };
  }
}

export const defaultImportPipeline = new ImportPipeline();
