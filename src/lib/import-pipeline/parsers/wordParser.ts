import * as mammoth from 'mammoth';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';

/**
 * Universal Word Document (.docx) Parser.
 * Uses mammoth to extract tables and formatted trade statements from Word documents.
 */
export class WordTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'DOCX';

  async parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult> {
    let arrayBuffer: ArrayBuffer;

    if (typeof rawInput === 'string') {
      // Convert string to array buffer if needed
      const encoder = new TextEncoder();
      arrayBuffer = encoder.encode(rawInput).buffer;
    } else {
      arrayBuffer = rawInput;
    }

    try {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const html = htmlResult.value;

      // Parse HTML with browser DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const tables = doc.querySelectorAll('table');
      if (tables.length > 0) {
        // Table-based Word document
        return this.parseTablesFromDoc(tables);
      }

      // Fallback: Text line-by-line parser for structured text logs
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      return this.parseTextLines(rawTextResult.value);
    } catch (err) {
      console.error('Failed to parse docx via mammoth:', err);
      // Fallback empty result
      return {
        fileType: 'DOCX',
        totalRawRows: 0,
        rows: [],
      };
    }
  }

  private parseTablesFromDoc(tables: NodeListOf<HTMLTableElement>): ParseResult {
    const rows: RawParsedRow[] = [];
    let rowNum = 1;

    tables.forEach((table) => {
      const trs = table.querySelectorAll('tr');
      if (trs.length < 2) return;

      // Extract headers from first tr
      const headerCells = trs[0].querySelectorAll('th, td');
      const headers = Array.from(headerCells).map((c) => (c.textContent || '').trim().toLowerCase());

      for (let i = 1; i < trs.length; i++) {
        const cells = Array.from(trs[i].querySelectorAll('td')).map((c) => (c.textContent || '').trim());
        if (cells.length === 0 || cells.every((c) => !c)) continue;

        const firstCell = cells[0].toLowerCase();
        if (firstCell.startsWith('total') || firstCell.startsWith('summary')) continue;

        const rowData: Record<string, unknown> = {};
        headers.forEach((header, colIdx) => {
          if (header) {
            rowData[header] = cells[colIdx] || '';
          }
        });
        cells.forEach((val, colIdx) => {
          rowData[`col_${colIdx}`] = val;
        });

        rows.push({
          rowNumber: rowNum++,
          data: rowData,
          rawString: cells.join(' | '),
        });
      }
    });

    return {
      fileType: 'DOCX',
      totalRawRows: rows.length,
      rows,
    };
  }

  private parseTextLines(text: string): ParseResult {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows: RawParsedRow[] = [];
    let rowNum = 1;

    for (const line of lines) {
      // Check if line looks like a trade record (contains buy/sell or symbol pattern)
      if (/(buy|sell|long|short)/i.test(line) || /([A-Z]{3}\/[A-Z]{3}|[A-Z]{6})/i.test(line)) {
        const parts = line.split(/[,\t|;]+/).map((p) => p.trim());
        const rowData: Record<string, unknown> = { rawLine: line };
        parts.forEach((p, idx) => {
          rowData[`col_${idx}`] = p;
        });

        rows.push({
          rowNumber: rowNum++,
          data: rowData,
          rawString: line,
        });
      }
    }

    return {
      fileType: 'DOCX',
      totalRawRows: rows.length,
      rows,
    };
  }
}
