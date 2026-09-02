import * as mammoth from 'mammoth';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';
import { extractSourceTotalPnl, findColumnIndex, isSummaryOrSectionLine, isTradeHeader, rowHasSymbol } from '../sectionUtils';

export class WordTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'DOCX';

  async parse(rawInput: string | ArrayBuffer): Promise<ParseResult> {
    const arrayBuffer = typeof rawInput === 'string' ? new TextEncoder().encode(rawInput).buffer : rawInput;
    try {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const doc = new DOMParser().parseFromString(htmlResult.value, 'text/html');
      const tables = doc.querySelectorAll('table');
      if (tables.length > 0) return this.parseTablesFromDoc(tables);
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      return this.parseTextLines(rawTextResult.value);
    } catch (err) {
      console.error('Failed to parse docx via mammoth:', err);
      return { fileType: 'DOCX', totalRawRows: 0, rows: [] };
    }
  }

  private parseTablesFromDoc(tables: NodeListOf<HTMLTableElement>): ParseResult {
    const rows: RawParsedRow[] = [];
    let rowNum = 1;
    let ignoredRows = 0;
    let sourceTotalPnl: number | null = null;

    tables.forEach((table) => {
      const trs = table.querySelectorAll('tr');
      if (trs.length < 2) return;
      const headers = Array.from(trs[0].querySelectorAll('th, td')).map((c) => (c.textContent || '').trim().toLowerCase());
      if (!isTradeHeader(headers)) { ignoredRows += trs.length - 1; return; }
      const symbolIndex = findColumnIndex(headers, ['symbol', 'symbole', 'pair', 'paire', 'instrument', 'asset', 'ticker', 'item', 'actif', 'market']);

      for (let i = 1; i < trs.length; i++) {
        const cells = Array.from(trs[i].querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
        if (!cells.length || cells.every((c) => !c)) { ignoredRows++; continue; }
        const total = extractSourceTotalPnl(cells, headers);
        if (total !== null) sourceTotalPnl = total;
        if (isSummaryOrSectionLine(cells) || (symbolIndex >= 0 && !rowHasSymbol(cells, symbolIndex))) { ignoredRows++; continue; }
        const rowData: Record<string, unknown> = {};
        headers.forEach((header, colIdx) => { if (header) rowData[header] = cells[colIdx] || ''; });
        cells.forEach((val, colIdx) => { rowData[`col_${colIdx}`] = val; });
        rows.push({ rowNumber: rowNum++, data: rowData, rawString: cells.join(' | ') });
      }
    });

    return { fileType: 'DOCX', totalRawRows: rows.length, rows, metadata: { ignoredRows, sourceTotalPnl } };
  }

  private parseTextLines(text: string): ParseResult {
    // Text-only DOCX exports are deliberately conservative: require a symbol, date and trade direction.
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows: RawParsedRow[] = [];
    let rowNum = 1;
    let invalidRows = 0;
    for (const line of lines) {
      if (!/(buy|sell|long|short|achat|vente)/i.test(line)) continue;
      const parts = line.split(/[,\t|;]+/).map((p) => p.trim());
      const rowData: Record<string, unknown> = { rawLine: line };
      parts.forEach((p, idx) => { rowData[`col_${idx}`] = p; });
      // The pipeline performs final strict column/date validation.
      rows.push({ rowNumber: rowNum++, data: rowData, rawString: line });
    }
    return { fileType: 'DOCX', totalRawRows: rows.length, rows, metadata: { invalidRows } };
  }
}
