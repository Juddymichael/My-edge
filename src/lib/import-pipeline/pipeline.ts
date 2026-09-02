import { IFileDetector, DefaultFileDetector, DetectionResult } from './detector';
import { ITradeParser, ITradeRowNormalizer } from './parser';
import { TradeRepository } from '../database/repositories/tradeRepository';
import { ImportRepository } from '../database/repositories/importRepository';
import { ImportLog, ImportFileType, ParsedTradePreview } from '../../types/import';
import { NewTradeInput, Trade } from '../../types/trade';
import { InvalidImportError } from '../../types/errors';
import { CsvTradeParser } from './parsers/csvParser';
import { ExcelTradeParser } from './parsers/excelParser';
import { PdfTradeParser } from './parsers/pdfParser';
import { WordTradeParser } from './parsers/wordParser';
import { JsonTradeParser } from './parsers/jsonParser';
import { UniversalTradeNormalizer } from './normalizer';
import { TradeDuplicateDetector } from './duplicateDetector';

export interface ImportPipelineOptions {
  detector?: IFileDetector;
  parsers?: Map<ImportFileType, ITradeParser>;
  normalizer?: ITradeRowNormalizer;
  skipDuplicates?: boolean;
}

export interface ImportPipelineExecutionResult {
  importLog: ImportLog;
  savedTrades: Trade[];
  duplicatesCount: number;
  needsReviewCount: number;
  failedRows: { rowNumber: number; error: string }[];
}

export interface ImportPreviewResult {
  fileType: ImportFileType;
  detection: DetectionResult;
  totalParsed: number;
  newTradesCount: number;
  duplicatesCount: number;
  previews: ParsedTradePreview[];
  normalizedTrades: NewTradeInput[];
}

/**
 * Unified Import Pipeline Architecture.
 * Sequential single-responsibility execution:
 * File -> Detector -> Parser -> Normalizer -> Financial & RR Calculator -> Duplicate Detector -> Preview / Database.
 */
export class ImportPipeline {
  private detector: IFileDetector;
  private parsers: Map<ImportFileType, ITradeParser>;
  private normalizer?: ITradeRowNormalizer;

  constructor(options?: ImportPipelineOptions) {
    this.detector = options?.detector || new DefaultFileDetector();
    this.parsers = options?.parsers || new Map();
    this.normalizer = options?.normalizer || new UniversalTradeNormalizer();

    // Register built-in default parsers
    if (this.parsers.size === 0) {
      const csvParser = new CsvTradeParser();
      const excelParser = new ExcelTradeParser();
      const pdfParser = new PdfTradeParser();
      const wordParser = new WordTradeParser();
      const jsonParser = new JsonTradeParser();

      this.parsers.set('CSV', csvParser);
      this.parsers.set('XLSX', excelParser);
      this.parsers.set('XLS', excelParser);
      this.parsers.set('PDF', pdfParser);
      this.parsers.set('DOCX', wordParser);
      this.parsers.set('JSON', jsonParser);
    }
  }

  public registerParser(parser: ITradeParser): void {
    this.parsers.set(parser.supportedType, parser);
  }

  public setNormalizer(normalizer: ITradeRowNormalizer): void {
    this.normalizer = normalizer;
  }

  /**
   * Parses file and returns structured preview with duplicate analysis and calculated RR metrics.
   */
  public async parseAndPreview(
    file: { name: string; content: string | ArrayBuffer; mimeType?: string },
    existingTrades: Trade[]
  ): Promise<ImportPreviewResult> {
    const detection = await this.detector.detect(file);
    const parser = this.parsers.get(detection.fileType);

    if (!parser) {
      throw new InvalidImportError(`No parser registered for file format: ${detection.fileType} (${file.name})`);
    }

    const parseResult = await parser.parse(file.content, { delimiter: detection.delimiter });
    const normalizedTrades: NewTradeInput[] = [];

    for (const rawRow of parseResult.rows) {
      try {
        if (this.normalizer) {
          const norm = this.normalizer.normalizeRow(rawRow, { broker: parseResult.brokerDetected });
          normalizedTrades.push(norm);
        } else {
          normalizedTrades.push(rawRow.data as unknown as NewTradeInput);
        }
      } catch (e) {
        console.warn(`Row normalization warning on row ${rawRow.rowNumber}:`, e);
      }
    }

    const duplicateAnalysis = TradeDuplicateDetector.analyzeBatch(normalizedTrades, existingTrades);

    return {
      fileType: detection.fileType,
      detection,
      totalParsed: duplicateAnalysis.totalParsed,
      newTradesCount: duplicateAnalysis.newTradesCount,
      duplicatesCount: duplicateAnalysis.duplicatesCount,
      previews: duplicateAnalysis.previews,
      normalizedTrades,
    };
  }

  /**
   * Executes the full ingestion pipeline directly.
   */
  public async execute(
    file: { name: string; content: string | ArrayBuffer; mimeType?: string },
    options: { skipDuplicates?: boolean } = { skipDuplicates: true }
  ): Promise<ImportPipelineExecutionResult> {
    const importId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const importedAt = new Date().toISOString();

    // 1. Detection
    const detection = await this.detector.detect(file);

    // 2. Locate Parser
    const parser = this.parsers.get(detection.fileType);
    if (!parser) {
      const failedLog: ImportLog = {
        id: importId,
        filename: file.name,
        fileType: detection.fileType,
        importedAt,
        totalRows: 0,
        validTrades: 0,
        duplicates: 0,
        needsReview: 0,
        status: 'FAILED',
        errorMessage: `No parser registered for file type: ${detection.fileType}`,
      };
      await ImportRepository.save(failedLog);
      throw new InvalidImportError(failedLog.errorMessage);
    }

    // 3. Parsing
    const parseResult = await parser.parse(file.content, { delimiter: detection.delimiter });

    // 4. Normalization & Ingestion Loop
    const savedTrades: Trade[] = [];
    let duplicatesCount = 0;
    let needsReviewCount = 0;
    const failedRows: { rowNumber: number; error: string }[] = [];

    for (const rawRow of parseResult.rows) {
      try {
        let tradeInput: NewTradeInput;
        if (this.normalizer) {
          tradeInput = this.normalizer.normalizeRow(rawRow, { broker: parseResult.brokerDetected });
        } else {
          tradeInput = rawRow.data as unknown as NewTradeInput;
        }

        const saved = await TradeRepository.create(tradeInput, !options.skipDuplicates);
        savedTrades.push(saved);

        if (saved.dataQuality === 'NEEDS_REVIEW') {
          needsReviewCount++;
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'DUPLICATE_TRADE_ERROR') {
          duplicatesCount++;
        } else {
          failedRows.push({
            rowNumber: rawRow.rowNumber,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // 5. Finalize Import Log in Database
    const finalStatus =
      failedRows.length === 0
        ? 'COMPLETED'
        : savedTrades.length > 0
        ? 'PARTIALLY_FAILED'
        : 'FAILED';

    const importLog: ImportLog = {
      id: importId,
      filename: file.name,
      fileType: detection.fileType,
      importedAt,
      totalRows: parseResult.totalRawRows,
      validTrades: savedTrades.length,
      duplicates: duplicatesCount,
      needsReview: needsReviewCount,
      status: finalStatus,
      errorMessage: failedRows.length > 0 ? `${failedRows.length} rows failed validation` : null,
      metadata: {
        broker: parseResult.brokerDetected,
        failedRowsSample: failedRows.slice(0, 5),
      },
    };

    await ImportRepository.save(importLog);

    return {
      importLog,
      savedTrades,
      duplicatesCount,
      needsReviewCount,
      failedRows,
    };
  }
}

export const defaultImportPipeline = new ImportPipeline();
