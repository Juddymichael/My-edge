import * as XLSX from 'xlsx';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';
import { normalizeNumber } from '../../normalization';
import { extractSourceTotalPnl, findColumnIndex, isSummaryOrSectionLine, isTradeHeader, rowHasSymbol } from '../sectionUtils';

export class ExcelTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'XLSX';

  async parse(rawInput: string | ArrayBuffer): Promise<ParseResult> {
    const workbook = typeof rawInput === 'string' ? XLSX.read(rawInput, { type: 'binary', cellDates: true, cellNF: true }) : XLSX.read(new Uint8Array(rawInput), { type: 'array', cellDates: true, cellNF: true });
    if (!workbook?.SheetNames?.length) return { fileType: 'XLSX', totalRawRows: 0, rows: [] };
    const targetSheetName = workbook.SheetNames.find((name) => /trades|positions|history|orders|journal/i.test(name)) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) return { fileType: 'XLSX', totalRawRows: 0, rows: [] };
    const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss', defval: '', blankrows: true });
    if (!rawMatrix.length) return { fileType: 'XLSX', totalRawRows: 0, rows: [] };

    const headerRowIndex = this.findHeaderRowIndex(rawMatrix);
    const headers = (rawMatrix[headerRowIndex] || []).map((h) => String(h ?? '').trim().toLowerCase());
    if (!isTradeHeader(headers)) return { fileType: 'XLSX', totalRawRows: 0, rows: [], metadata: { sheetName: targetSheetName, headers, ignoredRows: rawMatrix.length - 1 } };

    const symbolIndex = findColumnIndex(headers, ['symbol', 'symbole', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'item', 'actif', 'market']);
    const pnlIndex = findColumnIndex(headers, ['neteur', 'netusd', 'netpnl', 'pnl', 'profit', 'gain', 'loss', 'benefice', 'resultat']);
    const rows: RawParsedRow[] = [];
    let invalidRows = 0, ignoredRows = 0, rowNum = 1;
    let sourceTotalPnl: number | null = null;

    for (let i = headerRowIndex + 1; i < rawMatrix.length; i++) {
      const values = rawMatrix[i] || [];
      if (!values.length || values.every((v) => String(v ?? '').trim() === '')) { ignoredRows++; continue; }
      const total = extractSourceTotalPnl(values, headers);
      if (total !== null) sourceTotalPnl = total;
      const symbolPresent = symbolIndex >= 0 && rowHasSymbol(values, symbolIndex);
      if (!symbolPresent && pnlIndex >= 0) {
        const onlyPnl = values.every((value, index) => index === pnlIndex || !String(value ?? '').trim());
        const numericPnl = normalizeNumber(values[pnlIndex]);
        if (onlyPnl && numericPnl !== null) sourceTotalPnl = numericPnl;
      }
      if (isSummaryOrSectionLine(values)) { ignoredRows++; continue; }
      if (symbolIndex >= 0 && !symbolPresent) { ignoredRows++; continue; }
      const rowData: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => { if (header) rowData[header] = String(values[colIdx] ?? '').trim(); });
      values.forEach((value, colIdx) => { rowData[`col_${colIdx}`] = String(value ?? '').trim(); });
      rows.push({ rowNumber: rowNum++, data: rowData, rawString: values.map((v) => String(v ?? '')).join(' | ') });
    }
    return { fileType: 'XLSX', totalRawRows: rows.length, rows, metadata: { sheetName: targetSheetName, totalSheets: workbook.SheetNames.length, headers, ignoredRows, invalidRows, sourceTotalPnl } };
  }

  private findHeaderRowIndex(matrix: unknown[][]): number {
    for (let i = 0; i < Math.min(matrix.length, 40); i++) {
      const headers = (matrix[i] || []).map((cell) => String(cell ?? '').trim().toLowerCase());
      if (isTradeHeader(headers)) return i;
    }
    return 0;
  }
}
