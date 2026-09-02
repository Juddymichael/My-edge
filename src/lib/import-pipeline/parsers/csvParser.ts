import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';
import { extractSourceTotalPnl, findColumnIndex, isSummaryOrSectionLine, isTradeHeader, rowHasSymbol } from '../sectionUtils';

export class CsvTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'CSV';

  async parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult> {
    let content = typeof rawInput === 'string' ? rawInput : new TextDecoder('utf-8').decode(rawInput);
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

    const lines = content.split(/\r?\n/);
    const nonEmpty = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.trim().length > 0);
    if (!nonEmpty.length) return { fileType: 'CSV', totalRawRows: 0, rows: [] };

    const delimiter = (options?.delimiter as string) || this.detectDelimiter(nonEmpty.slice(0, 15).map((x) => x.line));
    const headerRowIndex = this.findHeaderRowIndex(nonEmpty.map((x) => x.line), delimiter);
    const headerLine = nonEmpty[headerRowIndex]?.line || '';
    const headers = this.parseCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

    if (!isTradeHeader(headers)) {
      return {
        fileType: 'CSV', totalRawRows: 0, rows: [],
        metadata: { delimiter, headerRowIndex, headers, ignoredRows: nonEmpty.length - 1, invalidRows: 0, sourceTotalPnl: null },
      };
    }

    const symbolIndex = findColumnIndex(headers, ['symbol', 'symbole', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'item', 'actif', 'market']);
    const rows: RawParsedRow[] = [];
    let invalidRows = 0;
    let ignoredRows = 0;
    let sourceTotalPnl: number | null = null;
    let rowNum = 1;

    for (let i = headerRowIndex + 1; i < nonEmpty.length; i++) {
      const line = nonEmpty[i].line;
      const cells = this.parseCsvLine(line, delimiter);
      if (!cells.length || cells.every((c) => !c.trim())) { ignoredRows++; continue; }

      const total = extractSourceTotalPnl(cells, headers);
      if (total !== null) sourceTotalPnl = total;
      if (isSummaryOrSectionLine(cells)) { ignoredRows++; continue; }

      // A blank Symbol column is never a trade. It is usually a subtotal/section row.
      if (symbolIndex >= 0 && !rowHasSymbol(cells, symbolIndex)) { ignoredRows++; continue; }

      const rowData: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        if (header) rowData[header] = cells[colIdx] !== undefined ? cells[colIdx].trim() : '';
      });
      cells.forEach((val, colIdx) => { rowData[`col_${colIdx}`] = val.trim(); });

      rows.push({ rowNumber: rowNum++, data: rowData, rawString: line });
    }

    return {
      fileType: 'CSV',
      totalRawRows: rows.length,
      rows,
      metadata: { delimiter, headerRowIndex, headers, ignoredRows, invalidRows, sourceTotalPnl },
    };
  }

  private detectDelimiter(sampleLines: string[]): string {
    const counts = sampleLines.reduce((acc, line) => {
      acc.comma += (line.match(/,/g) || []).length;
      acc.semi += (line.match(/;/g) || []).length;
      acc.tab += (line.match(/\t/g) || []).length;
      acc.pipe += (line.match(/\|/g) || []).length;
      return acc;
    }, { comma: 0, semi: 0, tab: 0, pipe: 0 });
    if (counts.semi > counts.comma && counts.semi > counts.tab && counts.semi > counts.pipe) return ';';
    if (counts.tab > counts.comma && counts.tab > counts.semi && counts.tab > counts.pipe) return '\t';
    if (counts.pipe > counts.comma && counts.pipe > counts.semi && counts.pipe > counts.tab) return '|';
    return ',';
  }

  private findHeaderRowIndex(lines: string[], delimiter: string): number {
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const headers = this.parseCsvLine(lines[i], delimiter).map((c) => c.trim().toLowerCase());
      if (isTradeHeader(headers)) return i;
    }
    return 0;
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) { result.push(current); current = ''; }
      else current += char;
    }
    result.push(current);
    return result;
  }
}
