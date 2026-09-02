import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';

/**
 * Universal CSV / TSV / Delimited Text Parser.
 * Handles commas, semicolons, tabs, pipes, quotes, BOM markers,
 * and header line offsets in broker statements.
 */
export class CsvTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'CSV';

  async parse(rawInput: string | ArrayBuffer, options?: Record<string, unknown>): Promise<ParseResult> {
    let content: string;
    if (typeof rawInput === 'string') {
      content = rawInput;
    } else {
      const decoder = new TextDecoder('utf-8');
      content = decoder.decode(rawInput);
    }

    // Strip BOM
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return {
        fileType: 'CSV',
        totalRawRows: 0,
        rows: [],
      };
    }

    // Auto-detect delimiter if not forced
    let delimiter = (options?.delimiter as string) || this.detectDelimiter(lines.slice(0, 10));

    // Find the header row (brokers often have metadata on rows 0..N)
    const headerRowIndex = this.findHeaderRowIndex(lines, delimiter);
    const headerLine = lines[headerRowIndex];
    const headers = this.parseCsvLine(headerLine, delimiter).map((h) => h.trim().toLowerCase());

    const rows: RawParsedRow[] = [];
    let rowNum = 1;

    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cells = this.parseCsvLine(line, delimiter);
      // Skip empty or summary rows (like "Total", "Summary", "Résumé", "Dépôt", "Solde", empty lines)
      if (cells.length === 0 || cells.every((c) => !c.trim())) continue;
      const firstCell = cells[0].toLowerCase().trim();
      if (
        firstCell.startsWith('total') ||
        firstCell.startsWith('summary') ||
        firstCell.startsWith('résumé') ||
        firstCell.startsWith('resume') ||
        firstCell.startsWith('closed p/l') ||
        firstCell.startsWith('dépôt') ||
        firstCell.startsWith('depot') ||
        firstCell.startsWith('retrait') ||
        firstCell.startsWith('solde') ||
        firstCell.startsWith('balance') ||
        firstCell.startsWith('fonds')
      ) {
        continue;
      }

      // If line only has empty cells or commas e.g. ",,,,,,769.76," with no symbol/direction/prices
      const filledCells = cells.filter((c) => c.trim().length > 0);
      if (filledCells.length <= 1 && !firstCell) {
        continue;
      }

      const rowData: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        if (header) {
          rowData[header] = cells[colIdx] !== undefined ? cells[colIdx].trim() : '';
        }
      });

      // Also store raw column indices in case headers are numbered or non-standard
      cells.forEach((val, colIdx) => {
        rowData[`col_${colIdx}`] = val.trim();
      });

      rows.push({
        rowNumber: rowNum++,
        data: rowData,
        rawString: line,
      });
    }

    return {
      fileType: 'CSV',
      totalRawRows: rows.length,
      rows,
      metadata: {
        delimiter,
        headerRowIndex,
        headers,
      },
    };
  }

  private detectDelimiter(sampleLines: string[]): string {
    let commaCount = 0;
    let semiCount = 0;
    let tabCount = 0;
    let pipeCount = 0;

    for (const line of sampleLines) {
      commaCount += (line.match(/,/g) || []).length;
      semiCount += (line.match(/;/g) || []).length;
      tabCount += (line.match(/\t/g) || []).length;
      pipeCount += (line.match(/\|/g) || []).length;
    }

    if (semiCount > commaCount && semiCount > tabCount && semiCount > pipeCount) return ';';
    if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) return '\t';
    if (pipeCount > commaCount && pipeCount > semiCount && pipeCount > tabCount) return '|';
    return ',';
  }

  private findHeaderRowIndex(lines: string[], delimiter: string): number {
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
      'benefice',
      'gain',
      'cours',
      'clôture',
      'cloture',
      'solde',
      'quantité',
      'quantite',
      'net',
      'balance',
    ];

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const parsed = this.parseCsvLine(lines[i], delimiter).map((c) => c.toLowerCase().trim());
      const matches = parsed.filter((c) => knownKeywords.some((k) => c.includes(k)));
      if (matches.length >= 2) {
        return i;
      }
    }

    return 0; // Default to first line if no special header found
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
