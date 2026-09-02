import * as pdfjsLib from 'pdfjs-dist';
import { ITradeParser, ParseResult, RawParsedRow } from '../parser';
import { ImportFileType } from '../../../types/import';
import { normalizeNumber } from '../../normalization';

try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch { /* worker configuration is optional in tests */ }

export class PdfTradeParser implements ITradeParser {
  readonly supportedType: ImportFileType = 'PDF';

  async parse(rawInput: string | ArrayBuffer): Promise<ParseResult> {
    const data = typeof rawInput === 'string' ? new TextEncoder().encode(rawInput) : new Uint8Array(rawInput);
    try {
      const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
      const allTextLines: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as { str: string; transform: number[] }[];
        const lineMap = new Map<number, { x: number; text: string }[]>();
        for (const item of items) {
          if (!item.str?.trim()) continue;
          const y = Math.round(item.transform[5]);
          const x = Math.round(item.transform[4]);
          let matchedY = y;
          for (const existingY of lineMap.keys()) if (Math.abs(existingY - y) <= 4) { matchedY = existingY; break; }
          if (!lineMap.has(matchedY)) lineMap.set(matchedY, []);
          lineMap.get(matchedY)!.push({ x, text: item.str });
        }
        for (const y of Array.from(lineMap.keys()).sort((a, b) => b - a)) {
          const row = lineMap.get(y)!;
          row.sort((a, b) => a.x - b.x);
          const line = row.map((i) => i.text.trim()).join('   ');
          if (line.trim()) allTextLines.push(line);
        }
      }
      return this.parseExtractedPdfLines(allTextLines);
    } catch (err) {
      console.error('Failed to parse PDF document:', err);
      return { fileType: 'PDF', totalRawRows: 0, rows: [] };
    }
  }

  private parseExtractedPdfLines(lines: string[]): ParseResult {
    const rows: RawParsedRow[] = [];
    let rowNum = 1;
    let invalidRows = 0;
    let sourceTotalPnl: number | null = null;

    const datePattern = /\b(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}[ -](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Fév|Mar|Avr|Mai|Jun|Jul|Aoû|Sep|Oct|Nov|Déc)[a-zéû]*[ -]\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?/gi;
    const symbolPattern = /\b(?:[A-Z]{3}\/?[A-Z]{3}|XAUUSD|XAGUSD|USOIL|UKOIL|BRENT|NAS100|US30|SPX500|GER40|BTCUSD|ETHUSD)\b/i;

    for (const line of lines) {
      if (/^(summary|résumé|resume|total|account summary|deposits?|withdrawals?|balance)\b/i.test(line.trim())) {
        const nums = line.match(/[+-]?\s*[\d\u00a0\u202f\s.,]+/g) || [];
        const last = nums.map((n) => normalizeNumber(n)).filter((n): n is number => n !== null).pop();
        if (last !== undefined) sourceTotalPnl = last;
        continue;
      }

      const directionMatch = line.match(/\b(buy|sell|long|short|achat|vente)\b/i);
      const symbolMatch = line.match(symbolPattern);
      const dates = line.match(datePattern) || [];
      if (!directionMatch || !symbolMatch || !dates.length) { invalidRows++; continue; }

      const rowData: Record<string, unknown> = {
        symbol: symbolMatch[0],
        direction: directionMatch[0],
        date: dates[0],
        rawText: line,
      };
      if (dates[1]) rowData.heuredecloture = dates[1];

      // Keep broker tokens available for future PDF-specific mappings; do not invent a PnL when ambiguous.
      line.split(/\s{2,}|\t/).filter(Boolean).forEach((token, idx) => { rowData[`col_${idx}`] = token.trim(); });
      rows.push({ rowNumber: rowNum++, data: rowData, rawString: line });
    }

    return {
      fileType: 'PDF',
      totalRawRows: rows.length,
      rows,
      metadata: { totalLinesExtracted: lines.length, invalidRows, sourceTotalPnl },
    };
  }
}
