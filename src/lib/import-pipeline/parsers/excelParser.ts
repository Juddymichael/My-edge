import * as XLSX from 'xlsx';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';

/**
 * Universal Excel Spreadsheet Parser (.xlsx, .xls, .xlsm).
 * Extracts tabular data across sheets, formats Excel dates and formulas.
 */
export class ExcelTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'XLSX';

  async parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult> {
    let workbook: XLSX.WorkBook;

    if (typeof rawInput === 'string') {
      // Read as base64 or binary string
      workbook = XLSX.read(rawInput, { type: 'binary', cellDates: true, cellNF: true });
    } else {
      // Read ArrayBuffer
      workbook = XLSX.read(new Uint8Array(rawInput), { type: 'array', cellDates: true, cellNF: true });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        fileType: 'XLSX',
        totalRawRows: 0,
        rows: [],
      };
    }

    // Select the best sheet: 'Trades' or 'Positions' or 'History' or first sheet
    const targetSheetName =
      workbook.SheetNames.find((name) =>
        /trades|positions|history|orders|journal|journal_trades/i.test(name)
      ) || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        fileType: 'XLSX',
        totalRawRows: 0,
        rows: [],
      };
    }

    // Convert sheet to array of rows
    const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd hh:mm:ss',
      defval: '',
    });

    if (!rawMatrix || rawMatrix.length === 0) {
      return {
        fileType: 'XLSX',
        totalRawRows: 0,
        rows: [],
      };
    }

    // Find header row
    const headerRowIndex = this.findHeaderRowIndex(rawMatrix);
    const headerRow = (rawMatrix[headerRowIndex] || []).map((h) => String(h || '').trim().toLowerCase());

    const rows: RawParsedRow[] = [];
    let rowNum = 1;

    for (let i = headerRowIndex + 1; i < rawMatrix.length; i++) {
      const rowValues = rawMatrix[i];
      if (!rowValues || !Array.isArray(rowValues)) continue;

      // Skip empty or summary rows
      if (rowValues.every((val) => val === '' || val === null || val === undefined)) continue;
      const firstStr = String(rowValues[0] || '').toLowerCase().trim();
      if (firstStr.startsWith('total') || firstStr.startsWith('summary') || firstStr.startsWith('closed p/l:')) {
        continue;
      }

      const rowData: Record<string, unknown> = {};
      headerRow.forEach((header, colIdx) => {
        if (header) {
          rowData[header] = rowValues[colIdx] !== undefined ? String(rowValues[colIdx]).trim() : '';
        }
      });

      rowValues.forEach((val, colIdx) => {
        rowData[`col_${colIdx}`] = val !== undefined ? String(val).trim() : '';
      });

      rows.push({
        rowNumber: rowNum++,
        data: rowData,
        rawString: rowValues.join(' | '),
      });
    }

    return {
      fileType: 'XLSX',
      totalRawRows: rows.length,
      rows,
      metadata: {
        sheetName: targetSheetName,
        totalSheets: workbook.SheetNames.length,
        headers: headerRow,
      },
    };
  }

  private findHeaderRowIndex(matrix: unknown[][]): number {
    const knownKeywords = [
      'symbol',
      'ticket',
      'order',
      'type',
      'side',
      'direction',
      'open',
      'close',
      'entry',
      'exit',
      'profit',
      'pnl',
      'price',
      'volume',
      'lots',
      'size',
      'prix',
      'symbole',
      'sens',
      'bénéfice',
      'gain',
    ];

    for (let i = 0; i < Math.min(matrix.length, 15); i++) {
      const row = (matrix[i] || []).map((cell) => String(cell || '').toLowerCase().trim());
      const matches = row.filter((c) => knownKeywords.some((k) => c.includes(k)));
      if (matches.length >= 2) {
        return i;
      }
    }

    return 0;
  }
}
